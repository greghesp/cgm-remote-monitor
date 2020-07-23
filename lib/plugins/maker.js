'use strict';

var _ = require('lodash');
var async = require('async');
var request = require('request');

var times = require('../times');

function init (env) {

  var keys = env.extendedSettings && env.extendedSettings.maker &&
    env.extendedSettings.maker.key && env.extendedSettings.maker.key.split(' ');

  var announcementKeys = (env.extendedSettings && env.extendedSettings.maker &&
    env.extendedSettings.maker.announcementKey && env.extendedSettings.maker.announcementKey.split(' ')) || keys;

  // const webcoreURL = env.extendedSettings?.webcoreURL;


  var maker = { };

  var lastAllClear = 0;

  maker.sendAllClear = function sendAllClear (notify, callback) {
    if (Date.now() - lastAllClear > times.mins(30).msecs) {
      lastAllClear = Date.now();

      //can be used to prevent maker/twitter deduping (add to IFTTT tweet text)
      var shortTimestamp = Math.round(Date.now() / 1000 / 60);

      maker.makeKeyRequests({
        value1: (notify && notify.title) || 'All Clear'
        , value2: notify && notify.message && '\n' + notify.message
        , value3: '\n' + shortTimestamp
      }, 'ns-allclear', function allClearCallback (err) {
        if (err) {
          lastAllClear = 0;
          callback(err);
        } else if (callback) {
          callback(null, {sent: true});
        }
      });
    } else if (callback) {
      callback(null, {sent: false});
    }
  };

  maker.sendEvent = function sendEvent (event, callback) {
    if (!event || !event.name) {
      callback('No event name found');
    } else if (!event.level) {
      callback('No event level found');
    } else {
      maker.makeRequests(event, function sendCallback (err, response) {
        if (err) {
          callback(err);
        } else {
          lastAllClear = 0;
          callback(null, response);
        }
      });
    }
  };

  //exposed for testing
  maker.valuesToQuery = function valuesToQuery (event) {
    var query = '';

    for (var i = 1; i <= 3; i++) {
      var name = 'value' + i;
      var value = event[name];
      lastAllClear = 0;
      if (value) {
        if (query) {
          query += '&';
        } else {
          query += '?';
        }
        query += name + '=' + encodeURIComponent(value);
      }
    }

    return query;
  };

  maker.makeRequests = function makeRequests(event, callback) {
    function sendGeneric (callback) {
      maker.makeKeyRequests(event, 'ns-event', callback);
    }

    function sendByLevel (callback) {
      maker.makeKeyRequests (event, 'ns-' + event.level, callback);
    }

    function sendByLevelAndName (callback) {
      maker.makeKeyRequests(event, 'ns' + ((event.level && '-' + event.level) || '') + '-' + event.name, callback);
    }

    //since maker events only filter on name, we are sending multiple events and different levels of granularity
    async.series([sendGeneric, sendByLevel, sendByLevelAndName], callback);
  };

  maker.makeKeyRequests = function makeKeyRequests(event, eventName, callback) {
    var selectedKeys = event.isAnnouncement ? announcementKeys : keys;

    _.each(selectedKeys, function eachKey(key) {
      maker.makeKeyRequest(key, event, eventName, callback);
    });
  };

  maker.makeKeyRequest = function makeKeyRequest(key, event, eventName, callback) {
    var url = 'https://maker.ifttt.com/trigger/' + eventName + '/with/key/' + key + maker.valuesToQuery(event);
    console.log("Logging ENV");
    console.log(env.extendedSettings);
    //SmartThings stuff
    const webcoreURL = `https://graph-eu01-euwest1.api.smartthings.com/api/token/486b4331-0e68-4688-a1bb-1af7eee4d9bc/smartapps/installations/67392d7e-f8cb-48c0-86f5-0a63383b5212/execute/:831090d15a51cdeb748e5a7e0b25ad2d:?event=${eventName}${maker.valuesToQuery(event)}`
    // console.log(webcoreURL+ maker.valuesToQuery(event));
     request.get(webcoreURL + maker.valuesToQuery(event));

    request
      .get(url)
      .on('response', function (response) {
        console.info('sent maker request: ', url);
        callback(null, response);
      })
      .on('error', function (err) {
        callback(err);
      });

  };

  if (keys && keys.length > 0) {
    return maker;
  } else {
    return null;
  }

}

module.exports = init;