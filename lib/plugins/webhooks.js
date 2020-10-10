var _ = require('lodash');
var async = require('async');
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

  webhooks.send = function wrapSend (notify, callback) {
    function prepareMessage() {
      const msg = {
        expire: times.mins(15).secs
        , title: notify.title
        , message: notify.message
        , timestamp: new Date()
      };
      console.log("Preparing message", msg);
      return msg;
    }

    const msg = prepareMessage();

    webhooks.makeRequest(msg)
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
