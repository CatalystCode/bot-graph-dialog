var path = require('path');

var extend = require('extend');
var builder = require('botbuilder');
var strformat = require('strformat');

var conditionHandler = require('./conditionHandler');
var intentScorer = require('./intentScorer');

function BotGraphDialog(opts) {
    if (!opts.tree) throw new Error('tree is required');
    
    var self = this;
    this.tree = opts.tree;
    this.steps = opts.steps || 100;
    this.scenariosPath = opts.scenariosPath || path.join(__dirname, 'scenarios');
    this.handlersPath = opts.handlersPath || path.join(__dirname, 'handlers');

    // Creating models dictionary
    this.models = {};

    function updateModels(models) {
      (models || []).forEach(function (model) { self.models[model.name] = model; });
    }
    
    updateModels(opts.tree.models);
    

    normalizeTree(this.tree);

    function normalizeTree(origTree) {
      var tree = {};
      extend(true, tree, origTree);
      var nodeIds = {};
      var uniqueNodeId = 1;

      console.log('processing scenario:', tree.id);

      recursive(tree);
      self._nodeIds = nodeIds;

      function initNodes(parent, nodes) {
        nodes = nodes || [];
        nodes.forEach(function(nodeItem, index) {
            if (nodeItem._visited) return;
            nodeItem._visited = true;
            if (!nodeItem.id) { nodeItem.id = '_node_' + (uniqueNodeId++); } 

            if (parent) nodeItem._parent = parent;
            if (index > 0) nodeItem._prev = nodes[index - 1];
            if (nodes.length > index + 1) nodeItem._next = nodes[index + 1];

            // In case of subScenario, copy all subScenario to current node
            if (isSubScenario(nodeItem)) {
                console.log('sub-scenario for node:', nodeItem.id, '[loading sub scenario: ', nodeItem.subScenario + ']');
                var subScenarioPath = path.join(self.scenariosPath, nodeItem.subScenario + '.json');
                var subScenario = require(subScenarioPath);
                extend(true, nodeItem, subScenario);
                updateModels(subScenario.models);
            }

            console.log('node:', nodeItem.id, 
              nodeItem._parent && nodeItem._parent.id ? '[parent: ' + nodeItem._parent.id + ']' : '', 
              nodeItem._next && nodeItem._next.id ? '[next: ' + nodeItem._next.id  + ']' : '', 
              nodeItem._prev && nodeItem._prev.id ? '[prev: ' + nodeItem._prev.id  + ']' : '');
            
            recursive(nodeItem);
        }, this); 
      }

      function recursive(node) {
        if (!node.id) { node.id = '_node_' + (uniqueNodeId++); } 
        initNodes(node, node.steps);

        var scenarios = node.scenarios || [];
        scenarios.forEach(function(scenario) {
          initNodes(node, scenario.steps);
        }, this);
        
        if (node.type === 'sequence') {
          initNodes(node, node.steps);
        }

        nodeIds[node.id] = node;
      }

      function isSubScenario(nodeItem) {
          if (!nodeItem.subScenario) return false;

          var parent = nodeItem._parent;
          while (parent) {
            if (nodeItem.subScenario === parent.id) { 
                console.error('recursive subScenario found: ', nodeItem.subScenario);
                throw new Error('recursive subScenario found ' + nodeItem.subScenario);
            }
            parent = parent._parent;
          }

          return true;
      }
    }
}

BotGraphDialog.prototype.getSteps = function() {
  var self = this;

  /**
   * session - bot session variable
   * tree - full json scenario template
   */
  function getNextNode(session) {
    var next = null;
    var current = self._nodeIds[session.dialogData._currentNodeId];

    // If there are child scenarios, see if one of them answers a condition
    // In case it is, choose the first step in that scenario to as the next step
    var scenarios = current.scenarios || [];
    for (var i=0; i<scenarios.length; i++) {
      var scenario = scenarios[i];
      if (conditionHandler.evaluateExpression(session.dialogData, scenario.condition)) {
        next = (scenario.nodeId && self._nodeIds[scenario.nodeId]) || scenario.steps[0];
      }
    }

    if (!next) {
      var steps = current.steps || [];
      if (steps.length) {
        next = steps[0];
      }
    }

    if (!next) {
      // If there is no selected scenario, move to the next node.
      // If there is no next node, look recursively for next on parent nodes.
      var _node = current;
      while (!next && _node) {
        next = _node._next;
        _node = _node._parent;
      }
    }

    console.log('getNextNode: [current: %s, next: %s]', current.id, next && next.id || '');
    return next;
  }

  function getCurrentNode(session) {
    var current = self._nodeIds[session.dialogData._currentNodeId];
    //console.log('current node:', current.id);
    return current;
  }
    
  function performAcion(session, next) {

    var currentNode = getCurrentNode(session);
    console.log('perform action:', currentNode.id, currentNode.type);

    switch (currentNode.type) {

      case 'text':
        var text = strformat(currentNode.data.text, session.dialogData);
        console.log('sending text for node %s, text: \'%s\'', currentNode.id, text);
        session.send(text);
        return next();

      case 'prompt':
        var promptType = currentNode.data.type || 'text';
        builder.Prompts[promptType](session, currentNode.data.text, currentNode.data.options);
        break;
        
      case 'score':
        var botModels = currentNode.data.models.map(function (model) {
          return self.models[model];
        });

        var text = session.dialogData[currentNode.data.source] || session.dialogData._lastMessage;
        console.log('LUIS scoring for node: %s, text: \'%s\' LUIS models:', currentNode.id, text, botModels);
        intentScorer.collectIntents(botModels, text, currentNode.data.threashold)
          .then(
            function (intents) {
              if (intents && intents.length) {
                collectResponse(session, { response: intents[0] });
                next();
              }
            },
            function (error) {
              throw error;
            }
          );
        break;

      case 'handler':
        var handlerName = currentNode.data.name;
        var handlerPath = path.join(self.handlersPath, handlerName)
        var handler = require(handlerPath);
        console.log('calling handler: ', currentNode.id, handlerName);
        return handler(session, next, currentNode.data);
    
      case 'sequence':
        return next();

      case 'end':
        console.log('ending dialog, node:', currentNode.id);
        session.send(currentNode.data.text || 'Bye bye!');
        session.endDialog();
        break;

      default:
        var msg = 'Node type ' + currentNode.type + ' is not recognized';
        console.error(msg);
        var error = new Error(msg);
        console.error(error);
        throw error; 
    }  
  }

  function collectResponse(session, results) {

    var currentNode = getCurrentNode(session);
    var varname = currentNode.varname || currentNode.id;
    
    if (!(results.response && varname)) return;

    switch (currentNode.type) {
      case 'prompt':
        switch (currentNode.data.type) {
          case 'time':
            session.dialogData[varname] = builder.EntityRecognizer.resolveTime([results.response]);
            break;
          case 'choice':
            session.dialogData[varname] = results.response.entity;
            break;
          default:
            session.dialogData[varname] = results.response;
        }
        break;
      default: 
        session.dialogData[varname] = results.response;
    }
   
    console.log('collecting response for node: %s, variable: %s, value: %s', currentNode.id, varname, session.dialogData[varname]);   
  }

  function stepInteractionHandler(session, results, next) {
    if (!session.dialogData._currentNodeId) {
      var rootNodeId = self.tree.steps[0].id;
      session.dialogData._currentNodeId = rootNodeId;
      console.log('starting a new flow, root node: ', rootNodeId);
    }

    var currentNode = getCurrentNode(session);
    session.dialogData._lastMessage = session.message && session.message.text;
    performAcion(session, next);
  }

  function stepResultCollectionHandler(session, results, next) {
    collectResponse(session, results);
    return next();
  }

  function setNextStepHandler(session, args, next) {
    var nextNode = getNextNode(session);

    if (nextNode) {
      console.log('step handler node: ', nextNode.id);
      session.dialogData._currentNodeId = nextNode.id;
    }
    else
      return session.endDialog();

    return next();
  }

	var steps = [];

	for (var i=0; i<self.steps; i++) {
    steps.push(stepInteractionHandler);
    steps.push(stepResultCollectionHandler);
    steps.push(setNextStepHandler);
  }

	return steps;
}

module.exports = BotGraphDialog;
