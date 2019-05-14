// Copyright 2019, Leon Nicholls
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

/**
 * Google Analytics utility.
 */

// Logging dependencies
const logger = require('winston').loggers.get('DEFAULT_LOGGER');

const request = require('request');
const urlencode = require('urlencode');

// https://developers.google.com/analytics/devguides/collection/protocol/v1/devguide
const GOOGLE_ANALYTICS_URL = 'https://www.google-analytics.com/collect';
const VERSION = 'v';
const TRACKING_ID = 'tid';
const CLIENT_ID = 'cid';
const HIT_TYPE = 't';
const EVENT = 'event';
const EVENT_CATEGORY = 'ec';
const EVENT_ACTION = 'ea';
const EVENT_LABEL = 'el';
const INTENT = 'intent';
const ITEM = 'item';
const DURATION = 'duration';
const CANCEL_DURATION = 'cancelDuration';
const TOTAL = 'total';
const STATUS = 'status';
const EXPERIMENT = 'experiment';

/**
 * Class to track the API calls to Google Analytics.
 */
class Analytics {
  /**
   * Constructor
   *
   * @param  {type} key API key
   */
  constructor(key) {
    this.key = key;
  }

  // Create base options for Google Analytics.

  /**
   * createGoogleAnalyticsOptions - Create base options for Google Analytics.
   *
   * @param  {type} uuid     user id
   * @param  {type} room     current room
   * @param  {type} category category info
   * @return {type}          JSON options
   */
  createGoogleAnalyticsOptions(uuid, room, category) {
    logger.debug(`createGoogleAnalyticsOptions: ${uuid} ${room} ${category}`);
    const options = {
      url: GOOGLE_ANALYTICS_URL,
      json: false,
    };
    let body = `${VERSION}=${1}`;
    body += `&${TRACKING_ID}=${this.key}`;
    body += `&${CLIENT_ID}=${urlencode(uuid || 'anonymous')}`;
    body += `&${HIT_TYPE}=${EVENT}`;
    body += `&${EVENT_CATEGORY}=${(category || urlencode(room || 'lobby'))}`;
    options.body = body;
    return options;
  }

  /**
   * createGoogleAnalyticsOptionsIntent - Track intents
   *
   * @param  {type} uuid   user id
   * @param  {type} room   current room
   * @param  {type} intent intent
   * @return {type}        JSON options
   */
  createGoogleAnalyticsOptionsIntent(uuid, room, intent) {
    logger.debug(`createGoogleAnalyticsOptionsIntent: ${room} ${intent}`);
    const options = this.createGoogleAnalyticsOptions(uuid, room);
    options.body += `&${EVENT_ACTION}=${INTENT}`;
    options.body += `&${EVENT_LABEL}=${urlencode(intent || 'none')}`;
    return options;
  }

  /**
   * createGoogleAnalyticsOptionsItem - Track items.
   *
   * @param  {type} uuid user id
   * @param  {type} room current room
   * @param  {type} item item
   * @return {type}      JSON options
   */
  createGoogleAnalyticsOptionsItem(uuid, room, item) {
    logger.debug(`createGoogleAnalyticsOptionsItem: ${room} ${item}`);
    const options = this.createGoogleAnalyticsOptions(uuid, room);
    options.body += `&${EVENT_ACTION}=${ITEM}`;
    options.body += `&${EVENT_LABEL}=${urlencode(item || 'none')}`;
    return options;
  }

  /**
   * createGoogleAnalyticsOptionsDuration - Track duration the user plays.
   *
   * @param  {type} uuid     user id
   * @param  {type} room     current room
   * @param  {type} duration duration in mins
   * @return {type}          JSON options
   */
  createGoogleAnalyticsOptionsDuration(uuid, room, duration) {
    logger.debug(`createGoogleAnalyticsOptionsDuration: ${room} ${duration}`);
    const options = this.createGoogleAnalyticsOptions(uuid, room);
    options.body += `&${EVENT_ACTION}=${DURATION}`;
    options.body += `&${EVENT_LABEL}=${urlencode(duration || '0')}`;
    return options;
  }

  /**
   * createGoogleAnalyticsOptionsCancelDuration - Track how long before the user cancels the game.
   *
   * @param  {type} uuid     user id
   * @param  {type} room     current room
   * @param  {type} duration duration in mins
   * @return {type}          JSON options
   */
  createGoogleAnalyticsOptionsCancelDuration(uuid, room, duration) {
    logger.debug(`createGoogleAnalyticsOptionsCancelDuration: ${room} ${duration}`);
    const options = this.createGoogleAnalyticsOptions(uuid, room);
    options.body += `&${EVENT_ACTION}=${CANCEL_DURATION}`;
    options.body += `&${EVENT_LABEL}=${urlencode(duration || '0')}`;
    return options;
  }

  /**
   * createGoogleAnalyticsOptionsTotal - Track the total number of moves.
   *
   * @param  {type} uuid  user id
   * @param  {type} room  current room
   * @param  {type} total total number of moves
   * @return {type}       JSON options
   */
  createGoogleAnalyticsOptionsTotal(uuid, room, total) {
    logger.debug(`createGoogleAnalyticsOptionsTotal: ${room} ${total}`);
    const options = this.createGoogleAnalyticsOptions(uuid, room);
    options.body += `&${EVENT_ACTION}=${TOTAL}`;
    options.body += `&${EVENT_LABEL}=${urlencode(total || '0')}`;
    return options;
  }

  /**
   * createGoogleAnalyticsOptionsStatus - Track the game status.
   *
   * @param  {type} uuid   user id
   * @param  {type} room   current room
   * @param  {type} status status
   * @return {type}        JSON options
   */
  createGoogleAnalyticsOptionsStatus(uuid, room, status) {
    logger.debug(`createGoogleAnalyticsOptionsStatus: ${room} ${status}`);
    const options = this.createGoogleAnalyticsOptions(uuid, room);
    options.body += `&${EVENT_ACTION}=${STATUS}`;
    options.body += `&${EVENT_LABEL}=${urlencode(status || 'win')}`;
    return options;
  }

  /**
   * createGoogleAnalyticsOptionsExperiment - Track experimental data.
   *
   * @param  {type} uuid  user id
   * @param  {type} id    experiment id
   * @param  {type} count count
   * @return {type}       JSON options
   */
  createGoogleAnalyticsOptionsExperiment(uuid, id, count) {
    logger.debug(`createGoogleAnalyticsOptionsExperiment: ${id} ${count}`);
    const options = this.createGoogleAnalyticsOptions(uuid, null, urlencode(id || 'none'));
    options.body += `&${EVENT_ACTION}=${EXPERIMENT}`;
    options.body += `&${EVENT_LABEL}=${urlencode(count || '0')}`;
    return options;
  }

  /**
   * post - Invoke the analytics API.
   *
   * @param  {type} options  JSON options
   * @param  {type} callback completion callback
   */
  post(options, callback) {
    logger.debug(`post: ${JSON.stringify(options)}`);
    if (process.env.NODE_ENV === 'development') {
      // ignore analytics for development
      return;
    }
    try {
      request.post(options, function(error, response, body) {
        if (error) {
          logger.error(`post: ${error}`);
          return;
        }
        logger.debug(`post: ${JSON.stringify(response)}`);
        if (callback) {
          callback();
        }
      });
    } catch (error) {
      logger.error(error);
    }
  }

  /**
   * intent - Track intents.
   *
   * @param  {type} uuid     user id
   * @param  {type} room     current room
   * @param  {type} intent   intent
   * @param  {type} callback completion callback
   */
  intent(uuid, room, intent, callback) {
    logger.debug(`intent: ${room} ${intent}`);
    this.post(this.createGoogleAnalyticsOptionsIntent(uuid, room, intent), callback);
  }


  /**
   * item - Track items.
   *
   * @param  {type} uuid     user id
   * @param  {type} room     current room
   * @param  {type} item     item
   * @param  {type} callback completion callback
   */
  item(uuid, room, item, callback) {
    logger.debug(`item: ${room} ${item}`);
    this.post(this.createGoogleAnalyticsOptionsItem(uuid, room, item), callback);
  }

  /**
   * duration - Track durations.
   *
   * @param  {type} uuid     user id
   * @param  {type} room     current room
   * @param  {type} duration duration
   * @param  {type} callback completion callback
   */
  duration(uuid, room, duration, callback) {
    logger.debug(`duration: ${room} ${duration}`);
    this.post(this.createGoogleAnalyticsOptionsDuration(uuid, room, duration), callback);
  }

  /**
   * cancelDuration - Track cancels.
   *
   * @param  {type} uuid     user id
   * @param  {type} room     current room
   * @param  {type} duration duration
   * @param  {type} callback completion callback
   */
  cancelDuration(uuid, room, duration, callback) {
    logger.debug(`cancelDuration: ${room} ${duration}`);
    this.post(this.createGoogleAnalyticsOptionsCancelDuration(uuid, room, duration), callback);
  }

  /**
   * total - Track total moves.
   *
   * @param  {type} uuid     user id
   * @param  {type} room     current room
   * @param  {type} total    total
   * @param  {type} callback completion callback
   */
  total(uuid, room, total, callback) {
    logger.debug(`total: ${room} ${total}`);
    this.post(this.createGoogleAnalyticsOptionsTotal(uuid, room, total), callback);
  }

  /**
   * status - Track game status.
   *
   * @param  {type} uuid     user id
   * @param  {type} room     current room
   * @param  {type} status   status
   * @param  {type} callback completion callback
   */
  status(uuid, room, status, callback) {
    logger.debug(`status: ${room} ${status}`);
    this.post(this.createGoogleAnalyticsOptionsStatus(uuid, room, status), callback);
  }

  /**
   * experiment - Track experiments.
   *
   * @param  {type} uuid     user id
   * @param  {type} id       experiment id
   * @param  {type} count    experiment count
   * @param  {type} callback completion callback
   */
  experiment(uuid, id, count, callback) {
    logger.debug(`status: ${id} ${count}`);
    this.post(this.createGoogleAnalyticsOptionsExperiment(uuid, id, count), callback);
  }
}

module.exports = Analytics;
