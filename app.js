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
 * Main app for running a web server and providing fulfillment logic.
 */

// Dev env settings
require('dotenv').config();

// Disable all console logging
if (process.env.NODE_ENV !== 'development') {
  process.env.DEBUG = '';
  console.log = function() {};
  console.error = function() {};
}

// Use Express for a web server.
const express = require('express');
// Express dependencies:
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const errorHandler = require('errorhandler');
const methodOverride = require('method-override');
const winston = require('winston');
const helmet = require('helmet');
const timeout = require('express-timeout-handler');

// Main fulfillment handler.
const fulfillment = require('./fulfillment');

// Start a web server.
const app = express();
app.set('port', (process.env.PORT || 8080));
app.use(bodyParser.json({
  type: 'application/json',
}));
app.use(bodyParser.urlencoded({
  extended: true,
}));
app.use(compression());
app.use(methodOverride());
app.use(cookieParser());
app.use(helmet());

// Default logger
winston.loggers.add('DEFAULT_LOGGER', {
  console: {
    colorize: true,
    label: 'Default logger',
    json: false,
    timestamp: true,
  },
});
const logger = winston.loggers.get('DEFAULT_LOGGER');

// Environment specific configuration.
switch (process.env.NODE_ENV) {
  // Production configuration.
  case 'production':
    app.use(errorHandler());
    logger.transports.console.level = 'info';
    break;
  // Development configuration.
  default:
    app.use(errorHandler({
      dumpExceptions: true,
      showStack: true,
    }));
    logger.transports.console.level = 'debug';
    break;
}

// All responses need to be less than 10 seconds.
app.use(timeout.handler({
  timeout: 10000,
}));

// Dialogflow agent fulfillment.
app.post('/', fulfillment.fulfillment);

// Initiate the server on the specified port, or 8080 if none
const server = app.listen(process.env.PORT || '8080', () => {
  logger.info(
    'Server started on port %d in %s mode. Press Ctrl+C to quit.',
    server.address().port, app.settings.env);
});
