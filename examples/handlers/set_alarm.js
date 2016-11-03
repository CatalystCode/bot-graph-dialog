
module.exports = function (session, next, data) {

  var intent = session.dialogData[data.source];
  var alarmTime = null;
  if (intent.actions[0].parameters[0].name == "time") {

    alarmTime = intent.actions[0].parameters[0].value[0].resolution.time;
  }

  if (data.target && alarmTime) {
    session.dialogData[data.target] = alarmTime;
  }

  session.send('Alarm set for ' + alarmTime);
  next();
}