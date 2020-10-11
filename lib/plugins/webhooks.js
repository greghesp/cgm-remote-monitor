const levels = require('../levels');
const request = require('request');
const times = require('../times');


function init (env) {
  console.log('Configuring WebHooks...');

  const webhooks = {
    name: 'webhooks'
    , label: 'Webhooks'
    , pluginType: 'drawer'
  };

  const webhook_url = env.extendedSettings && env.extendedSettings.webhooks && env.extendedSettings.webhooks.url;
  const alarms_only = env.extendedSettings && env.extendedSettings.webhooks && env.extendedSettings.webhooks.alarmsOnly;

  webhooks.send = function wrapSend (notify, callback) {
    function prepareMessage() {
      let msg = {
        name: notify.eventName || notify.plugin.name
        , title: notify.title
        , message: notify.message
        , timestamp: new Date()
        , isAnnouncement: notify.isAnnouncement || null
        , isAlarm: levels.isAlarm(notify.level)
        , level: levels.toLowerCase(notify.level)
      }
      const bg_level = notify.message.match(/(\d+(\.\d+)?)/g)

      if(bg_level[0] && !isNaN(bg_level[0])) {
        msg.glucoseLevel = bg_level[0]
      }

      return msg;
    }

    console.log("Preparing message", prepareMessage());

    if(alarms_only) {
      console.log("Alarms Only enabled")
      if(levels.isAlarm(notify.level)) {
        console.log("Event is alarm, sending message")
        webhooks.makeRequest(prepareMessage())
      } else {
        console.log("Event is not an alarm")
      }
    } else {
      webhooks.makeRequest(prepareMessage())
    }



  };

  let lastAllClear = 0;
  webhooks.sendAllClear = function sendAllClear (notify) {
    if (Date.now() - lastAllClear > times.mins(30).msecs) {
      lastAllClear = Date.now();

      const shortTimestamp = Math.round(Date.now() / 1000 / 60);

      const msg = {
        clear: true,
        title: (notify && notify.title) || 'All Clear',
        message: notify && notify.message && '\n' + notify.message,
        timestamp: shortTimestamp
      }

      webhooks.makeRequest(msg)
    }
  }

  webhooks.makeRequest = function makeRequest(msg) {
    return request.post({
      method: 'post',
      body: msg,
      json: true,
      url: webhook_url
    })
  }

  return webhooks;

}

module.exports = init;
