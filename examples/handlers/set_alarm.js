
module.exports = (session, next, data) => {

  var intent = session.dialogData.data[data.source];
  var alarmTime = null;
  if (intent.actions[0].parameters[0].name == "time") {
    // alarmTime = intent.entities...
    // use intent.entities to extract relevant information
    // assuming extracted alarmTime 

    alarmTime = '2016-10-10 10:10';
  }

  if (data.target && alarmTime) {
    session.dialogData.data[data.target] = alarmTime;
  }

  session.send('Alarm set for ' + alarmTime);
  return next();
}