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
      recursive(tree);
      self._nodeIds = nodeIds;

      function initNodes(parent, nodes) {
        nodes = nodes || [];
        nodes.forEach(function(nodeItem, index) {

            if (parent) nodeItem._parent = parent;
            if (index > 0) nodeItem._prev = nodes[index - 1];
            if (nodes.length > index + 1) nodeItem._next = nodes[index + 1];

            // In case of subScenario, copy all subScenario to current node
            if (isSubScenario(nodeItem)) {
                var subScenarioPath = path.join(self.scenariosPath, nodeItem.subScenario + '.json');
                var subScenario = require(subScenarioPath);
                extend(true, nodeItem, subScenario);
                updateModels(subScenario.models);
            }

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
                throw new Error('recursive extension found ' + nodeItem.subScenario);
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
        return next;
      }
    }

    var steps = current.steps || [];
    if (steps.length) {
      next = steps[0];
      return next;
    }

    // If there is no selected scenario, move to the next node.
    // If there is no next node, look recursively for next on parent nodes.
    var _node = current;
    while (!next && _node) {
      next = _node._next;
      _node = _node._parent;
    }

    return next;
  }

  function getCurrentNode(session) {
    return self._nodeIds[session.dialogData._currentNodeId];
  }
    
  function performAcion(session, next) {

    var currentNode = getCurrentNode(session);
    
    switch (currentNode.type) {

      case 'text':
        session.send(strformat(currentNode.data.text, session.dialogData));
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
        return handler(session, next, currentNode.data);
    
      case 'sequence':
        return next();

      case 'end':
        session.send(currentNode.data.text || 'Bye bye!');
        session.endDialog();
        break;

      default:
        var error = new Error('Node type ' + currentNode.type + ' is not recognized');
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
   
    console.log("new session variable %s with value %s", varname, session.dialogData[varname]);
   
  }

  function stepInteractionHandler(session, results, next) {
    if (!session.dialogData._currentNodeId) { 
      session.dialogData._currentNodeId = self.tree.steps[0].id;
    }
    var currentNode = self._nodeIds[session.dialogData._currentNodeId];
    
    console.log('stepHandler: ', currentNode.id);
    session.dialogData._lastMessage = session.message && session.message.text;

    performAcion(session, next);
  }

  function stepResultCollectionHandler(session, results, next) {
    collectResponse(session, results);
    return next();
  }

  function setNextStepHandler(session, args, next) {
    var nextNode = getNextNode(session);
    if (nextNode) 
      session.dialogData._currentNodeId = nextNode.id;
    else
      return session.endDialog();

    return next();
  }

	var steps = [];

  // temporary- clear session every time we start
  function clearSession(session, results, next) {
    if (session.dialogData._currentNodeId) { 
      session.reset();
    }
    return next();
  }

  steps.push(clearSession);


	for (var i=0; i<self.steps; i++) {
    steps.push(stepInteractionHandler);
    steps.push(stepResultCollectionHandler);
    steps.push(setNextStepHandler);
  }

	return steps;
}

module.exports = BotGraphDialog;
