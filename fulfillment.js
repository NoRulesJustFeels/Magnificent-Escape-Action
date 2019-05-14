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
 * Main fulfillment logic for Dialogflow intents.
 */

// Logging dependencies
const logger = require('winston').loggers.get('DEFAULT_LOGGER');

// Utility functions.
const utils = require('./utils');
// Game management functions.
const game = require('./game');
// All the user prompts.
const prompts = game.prompts;
// Google Analytics.
const analytics = game.analytics;

// Import the Dialogflow module from the Actions on Google client library.
// https://github.com/actions-on-google/actions-on-google-nodejs
const {dialogflow, Image, SimpleResponse, BasicCard} = require('actions-on-google');
// Node util module used for creating dynamic strings
const util = require('util');

// Instantiate the Dialogflow client with debug logging enabled.
const app = dialogflow({
  debug: true,
});

// Do common tasks for each intent invocation.
app.middleware((conv, framework) => {
  logger.info(`Intent=${conv.intent}`);
  logger.info(`Type=${conv.input.type}`);
  logger.info(`Raw=${conv.input.raw}`);

  // https://developers.google.com/actions/console/actions-health-check
  conv.isHealthCheck = false;
  if (conv.arguments[game.HEALTH_CHECK_ARGUMENT]) {
    logger.info(`Health check`);
    // Short circuit for health checks to do a simple response in the
    // main welcome intent handler.
    conv.isHealthCheck = true;
    return;
  }
  // Determine if the user input is by voice.
  conv.voice = conv.input.type === 'VOICE';
  if (!(conv.intent === 'Default Fallback Intent' || conv.intent === 'No-input')) {
    // Reset the fallback counter for error handling.
    conv.data.fallbackCount = 0;

    // Cleanup contexts if the current intent doesn't match the context.
    if (conv.intent !== 'Hint') {
      let intent = conv.intent.toLowerCase();
      if (intent !== 'direction') {
        game.deleteContext(conv, 'direction');
      }
      if (intent !== 'code') {
        game.deleteContext(conv, 'code');
      }
      if (intent !== 'color') {
        game.deleteContext(conv, 'color');
      }
      if (intent !== 'colors') {
        game.deleteContext(conv, 'colors');
      }
      if (intent !== 'turns') {
        game.deleteContext(conv, 'turns');
      }
    }
  }

  logger.info(`conv.user.storage='${JSON.stringify(conv.user.storage)}`);

  // First time user init the data and storage.
  if (!conv.user.storage || !conv.user.storage['init']) {
    game.reset(conv);
  } else {
    if (conv.data.currentRoom) {
      // Count the number of turns in the conversation for each room.
      let count = parseInt(conv.user.storage.rooms[conv.data.currentRoom].count);
      conv.user.storage.rooms[conv.data.currentRoom].count = count + 1;

      // Track the time spent in each room.
      if (conv.data.lastTime) {
        const currentTime = Date.now();
        const diff = currentTime - parseInt(conv.data.lastTime);

        if (conv.user.storage.rooms[conv.data.currentRoom].duration) {
          const duration = parseInt(conv.user.storage.rooms[conv.data.currentRoom].duration);
          conv.user.storage.rooms[conv.data.currentRoom].duration = duration + diff;
        } else {
          conv.user.storage.rooms[conv.data.currentRoom].duration = diff;
        }
      }
    } else {
      conv.data.currentRoom = null;
      conv.data.currentDirection = null;
      conv.data.currentItem = null;
    }
    // Track the total number of user interactions.
    if (conv.user.storage.total) {
      let total = parseInt(conv.user.storage.total);
      conv.user.storage.total = total + 1;
    } else {
      conv.user.storage.total = 1;
    }
  }
  conv.data.lastTime = Date.now();

  // Custom slot filling logic which involves tracking intents needed to get
  // the right parameter values from the user.
  if (!conv.data.intents) {
    conv.data.intents = [];
  }
  let intentsCount = conv.data.intents.unshift(conv.intent);
  if (intentsCount > 2) {
    conv.data.intents.pop();
  }
  logger.debug(`intents=${JSON.stringify(conv.data.intents)}`);
  if (intentsCount >= 2) {
    if (conv.data.intents[0] !== conv.data.intents[1]) {
      logger.debug(`reset conv.data.slotFillingCount: ${conv.data.intents[0]} vs '${conv.data.intents[1]}`);
      conv.data.slotFillingCount = 0;
    }
  }

  // Track the user raw input history for detecting exact sequential repeats.
  if (!conv.data.raws) {
    conv.data.raws = [];
  }
  if (conv.input.raw) {
    let rawsCount = conv.data.raws.unshift(conv.input.raw);
    if (rawsCount > 2) {
      conv.data.raws.pop();
    }
  } else {
    conv.input.raw = '';
  }
  logger.debug(`raws=${JSON.stringify(conv.data.raws)}`);

  conv.data.context = null;

  // Analytics for production.
  if (process.env.NODE_ENV !== 'development') {
    try {
      // https://github.com/google/chatbase-node/blob/master/README.md
      let chatbase = require('@google/chatbase')
        .setApiKey(process.env.CHATBASE_KEY) // Your Chatbase API Key
        .setAsTypeAgent();

      let platform = 'AUDIO';
      if (conv.screen) {
        if (conv.voice) {
          platform = 'SCREEN_VOICE';
        } else {
          platform = 'SCREEN_KEYBOARD';
        }
      }

      // Track user input that are not matched with main intents.
      if (!(conv.intent === 'Default Fallback Intent' || conv.intent === 'No-input')) {
        chatbase.newMessage(process.env.CHATBASE_KEY, conv.user.storage.uuid)
          .setAsTypeAgent()
          .setTimestamp(Date.now().toString())
          .setPlatform(platform)
          .setMessage(conv.intent)
          .setIntent(conv.intent)
          .setCustomSessionId(conv.id)
          .setAsHandled()
          .send()
          .then((msg) => logger.info(msg.getCreateResponse()))
          .catch((err) => logger.error(err));
        // Provide the raw user input.
        if (conv.input.raw && conv.input.raw !== '') {
          chatbase.newMessage(process.env.CHATBASE_KEY, conv.user.storage.uuid)
            .setAsTypeUser()
            .setTimestamp(Date.now().toString())
            .setPlatform(platform)
            .setMessage(conv.input.raw)
            .setCustomSessionId(conv.id)
            .setAsHandled()
            .send()
            .then((msg) => logger.info(msg.getCreateResponse()))
            .catch((err) => logger.error(err));
        }
      } else {
        // Track user input that matched main intents.
        if (conv.input.raw && conv.input.raw !== '') {
          chatbase.newMessage(process.env.CHATBASE_KEY, conv.user.storage.uuid)
            .setAsTypeUser()
            .setTimestamp(Date.now().toString())
            .setPlatform(platform)
            .setMessage(conv.input.raw)
            .setCustomSessionId(conv.id)
            .setAsNotHandled()
            .send()
            .then((msg) => logger.info(msg.getCreateResponse()))
            .catch((err) => logger.error(err));
        }
      }
    } catch (error) {
      logger.error(error);
    }
  }

  // Do some additional logic associated with an intent to track analytics
  // for experiments.
  const handleExperiment = (conv) => {
    logger.info(`handleExperiment: ${conv.data.experiment}`);
    if (conv.intent === 'Cancel') {
      if (conv.data.experiment) {
        logger.info(`experiment: ${conv.data.experiment}=${conv.user.storage.total}`);
        analytics.experiment(conv.user.storage.uuid, conv.data.experiment, conv.user.storage.total);
      }
    }
  };

  // Track experiments based on room of the game.
  if (conv.data.currentRoom) {
    analytics.intent(conv.user.storage.uuid, conv.data.currentRoom, conv.intent, () => {
      handleExperiment(conv);
    });
  } else {
    analytics.intent(conv.user.storage.uuid, game.LOBBY, conv.intent, () => {
      handleExperiment(conv);
    });
  }

  logger.info(`conv.user.storage=${JSON.stringify(conv.user.storage)}`);
});

// Default intent for handling the start of the action.
app.intent(['Default Welcome Intent', 'unknown.deeplink'], (conv) => {
  logger.info(`Welcome: ${conv.user.last.seen}`);
  // Check if health check
  if (conv.isHealthCheck) {
    conv.close('Thanks for checking in, Google! I\'m alive and well!');
    return;
  }
  // Go to the game lobby.
  game.lobby(conv, true);
});

// Play game event
app.intent('Play Game', (conv) => {
  logger.info(`Play Game: ${conv.user.last.seen}`);
  conv.data.playGame = true;
  // Experiment for adding play game BII intro.
  if (game.RUN_EXPERIMENT) {
    if (!conv.user.last.seen) {
      if (Math.random() >= 0.5) {
        conv.data.experiment = game.EXPERIMENT_PLAY_GAME_INTRO_NONE;
        conv.data.playGame = false;
      } else {
        conv.data.experiment = game.EXPERIMENT_PLAY_GAME_INTRO;
        conv.data.playGame = true;
      }
      logger.info(`experiment=${conv.data.experiment}`);
    }
  }
  game.lobby(conv, true);
});

// Handle list selection
// https://developers.google.com/actions/assistant/responses#list
app.intent('Option', (conv, params, option) => {
  logger.info(`Option: ${option}`);
  let roomKeys = Object.keys(game.ROOMS);
  for (let key of roomKeys) {
    let room = game.ROOMS[key];
    if (room.name[0].toLowerCase() === option.toLowerCase()) {
      conv.data.currentRoom = key;
      game.start(conv);
      return;
    }
  }
  game.ask(conv, null, `${utils.getRandomPrompt(conv, 'invalid_room')}`);
  game.lobby(conv, false);
});

// Handle user selection by position.
const selectOption = (conv, value) => {
  let roomKeys = Object.keys(game.ROOMS);
  if (value >= 0 && value <= roomKeys.length) {
    conv.data.currentRoom = roomKeys[value - 1];
    logger.info(`conv.data.currentRoom=${conv.data.currentRoom}`);
    game.start(conv);
    return;
  }
  game.ask(conv, null, `${utils.getRandomPrompt(conv, 'invalid_room')}`);
  game.lobby(conv, false);
};

// Dialogflow intent handler.
app.intent('Ordinal', (conv, {ordinal}) => {
  logger.info(`Ordinal: ${ordinal}`);
  selectOption(conv, ordinal);
});

// Dialogflow intent handler.
app.intent('Room Number', (conv, {number}) => {
  logger.info(`Room Number: ${number}`);
  selectOption(conv, number);
});

// Custom slot filling utility for getting the room name from the user.
const handleNoRoom = (conv, params) => {
  let room = params.room;
  conv.data.slotFillingCount = 0;

  let roomKeys = Object.keys(game.ROOMS);
  for (let i = 0; i < roomKeys.length; i++) {
    let key = roomKeys[i];
    if (game.ROOMS[key].name[0].toLowerCase() === room) {
      selectOption(conv, i + 1);
      return;
    }
  }
  selectOption(conv, -1);
};

// Dialogflow intent handler.
app.intent('Room Name', (conv, params) => {
  logger.info(`Room Name: params=${JSON.stringify(params)}`);
  let room = params.room;
  if (!room) {
    conv.data.slot = 'noRoom';
    game.setContext(conv, 'slot_room', 1);
    let roomKeys = Object.keys(game.ROOMS);
    let rooms = [];
    for (let key of roomKeys) {
      let room = game.ROOMS[key];
      rooms.push(room.name[0].toLowerCase());
    }
    return game.handleSlotFilling(conv, 'slot_filling_room', rooms, [], true);
  }
  handleNoRoom(conv, params);
});

// Custom slot filling for how much time spent in a room.
const handleNoHowLongRoom = (conv, params) => {
  let room = params.room.toLowerCase();
  conv.data.slotFillingCount = 0;

  let roomKeys = Object.keys(game.ROOMS);
  for (let key of roomKeys) {
    if (game.ROOMS[key].name[0].toLowerCase() === room) {
      if (key === conv.data.currentRoom) {
        game.askSuggestions(conv);
        game.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'how_long'),
          Math.round(parseInt(conv.user.storage.rooms[key].duration) / (1000 * 60)), room)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
      } else {
        handleLobby(conv);
      }
      return;
    }
  }
  game.ask(conv, null, `${game.makeRoomPromptResponse(conv)}`);
};

// Dialogflow intent handler.
app.intent('How Long', (conv, params) => {
  logger.info(`How Long: params=${JSON.stringify(params)}`);
  let room = params.room;
  if (!room) {
    conv.data.slot = 'noHowLongRoom';
    game.setContext(conv, 'slot_room', 1);
    let roomKeys = Object.keys(game.ROOMS);
    let rooms = [];
    for (let key of roomKeys) {
      let room = game.ROOMS[key];
      rooms.push(room.name[0].toLowerCase());
    }
    return game.handleSlotFilling(conv, 'slot_filling_room', rooms, [], true);
  }
  handleNoHowLongRoom(conv, params);
});

// Custom slot filling for asking about the room difficulty.
const handleNoRoomDifficulty = (conv, params) => {
  let difficulty = params.difficulty;
  conv.data.slotFillingCount = 0;

  let roomKeys = Object.keys(game.ROOMS);
  for (let i = 0; i < roomKeys.length; i++) {
    let key = roomKeys[i];
    if (game.ROOMS[key].level.toLowerCase() === difficulty) {
      selectOption(conv, i + 1);
      return;
    }
  }
  selectOption(conv, -1);
};

// Dialogflow intent handler.
app.intent('Room Difficulty', (conv, params) => {
  logger.info(`Room Difficulty: params=${JSON.stringify(params)}`);
  let difficulty = params.difficulty;
  if (!difficulty) {
    conv.data.slot = 'noRoomDifficulty';
    game.setContext(conv, 'slot_room_difficulty', 1);
    let roomKeys = Object.keys(game.ROOMS);
    let levels = [];
    for (let key of roomKeys) {
      let room = game.ROOMS[key];
      levels.push(room.level.toLowerCase());
    }
    return game.handleSlotFilling(conv, 'slot_filling_room_difficulty', levels, [], true);
  }
  handleNoRoomDifficulty(conv, params);
});

// Dialogflow intent handler.
app.intent('Slot Difficulty', (conv, params) => {
  logger.info(`Slot Difficulty: conv.data.slot=${conv.data.slot}, params=${JSON.stringify(params)}`);
  if (conv.data.slot && params.difficulty) {
    if (conv.data.intents.length > 1) {
      conv.intent = conv.data.intents[1];
    }
    switch (conv.data.slot) {
      case 'noRoomDifficulty':
        handleNoRoom(conv, {difficulty: params.difficulty});
        break;
      default:
        handleLook(conv, {item: params.item});
    }
  } else {
    game.fallback(conv);
  }
  conv.data.slot = null;
});

// Dialogflow intent handler.
app.intent('Slot Room', (conv, params) => {
  logger.info(`Slot Room: conv.data.slot=${conv.data.slot}, params=${JSON.stringify(params)}`);
  if (conv.data.slot && params.room) {
    if (conv.data.intents.length > 1) {
      conv.intent = conv.data.intents[1];
    }
    switch (conv.data.slot) {
      case 'noRoom':
        handleNoRoom(conv, {room: params.room});
        break;
      case 'noHowLongRoom':
        handleNoHowLongRoom(conv, {room: params.room});
        break;
      default:
        handleLook(conv, {item: params.item});
    }
  } else {
    game.fallback(conv);
  }
  conv.data.slot = null;
});

// Dialogflow intent handler.
app.intent('Last', (conv) => {
  logger.info('Last');
  let roomKeys = Object.keys(game.ROOMS);
  conv.data.currentRoom = roomKeys[roomKeys.length - 1];
  game.start(conv);
});

// Teleport out of a room back to the game lobby.
const handleLobby = (conv) => {
  const confirmation = utils.getRandomPrompt(conv, 'confirmation');
  conv.ask(new SimpleResponse({
    speech: `<speak>
      <par>
        <media xml:id="confirmation" begin="0.0s">
          <speak>${confirmation}</speak>
        </media>
        <media xml:id="lobbySound" begin="confirmation.end+0.0s" soundLevel="0dB">
          <audio
            src="https://actions.google.com/sounds/v1/foley/swoosh.ogg"/>
        </media>
      </par>
    </speak>`,
    text: `${confirmation}`,
  }));
  game.reset(conv);
  game.lobby(conv, false);
};

// Dialogflow intent handler.
app.intent('Lobby', (conv) => {
  handleLobby(conv);
});

// Fallback intent to handle user responses that aren't handled by other intents
app.intent('Default Fallback Intent', (conv) => {
  logger.info(`Default Fallback Intent: fallbackCount=${conv.data.fallbackCount}`);
  logger.info(`Default Fallback Intent: raw=${conv.input.raw}`);
  game.fallback(conv);
});

// Dialogflow intent handler.
app.intent('Yes', (conv) => {
  game.fallback(conv);
});

// Dialogflow intent handler.
app.intent(['Repeat', 'Previous'], (conv) => {
  logger.info(`Repeat: ${conv.data.lastResponse}`);
  if (game.hasContext(conv, 'lobby')) {
    logger.info('lobby');
    game.setContext(conv, 'lobby', game.CONTEXT_LIFETIME);
    return game.lobby(conv, false);
  }
  if (conv.data.lastResponse) {
    game.ask(conv, null, `${conv.data.lastResponse}`);
  } else if (game.hasFoundItems(conv)) {
    game.ask(conv, null, `${game.makeRoomPromptResponse(conv)}`);
  } else {
    game.ask(conv, null, `${utils.getRandomPrompt(conv, 'walls')} ${utils.getRandomPrompt(conv, 'which_direction')}`);
  }
  game.askSuggestions(conv);
});

// Dialogflow intent handler.
app.intent(['Repeat Slowly', 'What Do You Mean'], (conv) => {
  logger.info(`Repeat Slowly: ${conv.data.lastResponse}`);
  if (game.hasContext(conv, 'lobby')) {
    logger.info('lobby');
    game.setContext(conv, 'lobby', game.CONTEXT_LIFETIME);
    return game.lobby(conv, false);
  }
  if (conv.data.lastResponse) {
    let ssmlPrompt = conv.data.lastResponse.replace(/\. /g, `.${game.SSML_BREAK_SHORT} `);
    ssmlPrompt = ssmlPrompt.replace(/, /g, `,${game.SSML_BREAK_SHORT} `);
    game.ask(conv, null, `${ssmlPrompt}`, true);
  } else if (game.hasFoundItems(conv)) {
    let ssmlPrompt = game.makeRoomPromptResponse(conv).replace(/\. /g, `.${game.SSML_BREAK_SHORT} `);
    ssmlPrompt = ssmlPrompt.replace(/, /g, `,${game.SSML_BREAK_SHORT} `);
    game.ask(conv, null, `${ssmlPrompt}`, true);
  } else {
    game.ask(conv, null, `${utils.getRandomPrompt(conv, 'walls')} ${utils.getRandomPrompt(conv, 'which_direction')}`, true);
  }
  game.askSuggestions(conv);
});

// Dialogflow intent handler.
app.intent('No', (conv) => {
  game.fallback(conv);
});

// Handle the Cancel intent by closing the conversation
app.intent('Cancel', (conv) => {
  game.handleCancel(conv);
});

// Dialogflow intent handler.
app.intent('Never Mind', (conv) => {
  if (game.hasContext(conv, 'lobby')) {
    game.handleCancel(conv);
    return;
  }
  game.handleHelp(conv, utils.getRandomPrompt(conv, 'positive_response'));
});

// Dialogflow intent handler.
app.intent(['Help', 'More', 'Next', 'Game Invocation'], (conv) => {
  if (game.hasContext(conv, 'lobby')) {
    return game.lobby(conv, false, `${utils.getRandomPrompt(conv, 'confirmation')} ${utils.getRandomPrompt(conv, 'lobby_help')}`, true);
  }
  game.handleHelp(conv);
});

// Dialogflow intent handler.
app.intent(`Don't know`, (conv) => {
  logger.info(`Don't know`);
  game.handleHelp(conv, utils.getRandomPrompt(conv, 'positive_response'));
});

// Dialogflow intent handler.
app.intent(['Hint', 'Feeling Lucky'], (conv) => {
  logger.info('Hint');
  game.handleHint(conv);
});

// Handle no-inputs from the user
// https://developers.google.com/actions/assistant/reprompts
app.intent('No-input', (conv) => {
  const repromptCount = utils.parseIntPositive(conv.arguments.get('REPROMPT_COUNT'));
  logger.info(`No-input: repromptCount=${repromptCount}`);
  if (repromptCount === 0) {
    if (game.hasContext(conv, 'lobby')) {
      game.setContext(conv, 'lobby', game.CONTEXT_LIFETIME);
      game.ask(conv, null, `${utils.getRandomPrompt(conv, 'no_input1_lobby')}`, true);
      return game.lobby(conv, false);
    }
    if (game.hasContext(conv, 'direction')) {
      game.askSuggestions(conv, game.suggestionsDirections);
      game.setContext(conv, 'direction', game.CONTEXT_LIFETIME);
      return game.ask(conv, null, utils.getRandomPrompt(conv, 'no_input1_direction'), true);
    }
    if (game.hasContext(conv, 'turns')) {
      game.askSuggestions(conv, game.suggestionsLeftRight);
      game.setContext(conv, 'turns', game.CONTEXT_LIFETIME);
      return game.ask(conv, null, utils.getRandomPrompt(conv, 'no_input1_turns'), true);
    }
    if (game.hasContext(conv, 'color')) {
      game.askSuggestions(conv);
      game.setContext(conv, 'color', game.CONTEXT_LIFETIME);
      return game.ask(conv, null, utils.getRandomPrompt(conv, 'no_input1_color'), true);
    }
    if (game.hasContext(conv, 'colors')) {
      game.askSuggestions(conv);
      game.setContext(conv, 'colors', game.CONTEXT_LIFETIME);
      return game.ask(conv, null, utils.getRandomPrompt(conv, 'no_input1_colors'), true);
    }
    if (game.hasContext(conv, 'code')) {
      game.askSuggestions(conv);
      game.setContext(conv, 'code', game.CONTEXT_LIFETIME);
      return game.ask(conv, null, utils.getRandomPrompt(conv, 'no_input1_code'), true);
    }
    game.ask(conv, null, utils.getRandomPrompt(conv, 'no_input1'));
  } else if (repromptCount === 1) {
    if (game.hasContext(conv, 'lobby')) {
      game.setContext(conv, 'lobby', game.CONTEXT_LIFETIME);
      game.ask(conv, null, `${utils.getRandomPrompt(conv, 'no_input2_lobby')}`, true);
      return game.lobby(conv, false);
    }
    if (game.hasContext(conv, 'direction')) {
      game.askSuggestions(conv, game.suggestionsDirections);
      game.setContext(conv, 'direction', game.CONTEXT_LIFETIME);
      if ((conv.screen && !conv.voice) || conv.user.storage.help_more_time) {
        return game.ask(conv, null, utils.getRandomPrompt(conv, 'no_input2_direction'), true);
      } else {
        conv.user.storage.help_more_time = true;
        return game.ask(conv, null, utils.getRandomPrompt(conv, 'no_input2_direction_more'), true);
      }
    }
    if (game.hasContext(conv, 'turns')) {
      game.askSuggestions(conv, game.suggestionsLeftRight);
      game.setContext(conv, 'turns', game.CONTEXT_LIFETIME);
      if ((conv.screen && !conv.voice) || conv.user.storage.help_more_time) {
        return game.ask(conv, null, utils.getRandomPrompt(conv, 'no_input2_turns'), true);
      } else {
        conv.user.storage.help_more_time = true;
        return game.ask(conv, null, utils.getRandomPrompt(conv, 'no_input2_turns_more'), true);
      }
    }
    if (game.hasContext(conv, 'code')) {
      game.askSuggestions(conv);
      game.setContext(conv, 'code', game.CONTEXT_LIFETIME);
      if ((conv.screen && !conv.voice) || conv.user.storage.help_more_time) {
        return game.ask(conv, null, utils.getRandomPrompt(conv, 'no_input2_code'), true);
      } else {
        conv.user.storage.help_more_time = true;
        return game.ask(conv, null, utils.getRandomPrompt(conv, 'no_input2_code_more'), true);
      }
    }
    if (game.hasContext(conv, 'color')) {
      game.askSuggestions(conv);
      game.setContext(conv, 'color', game.CONTEXT_LIFETIME);
      if ((conv.screen && !conv.voice) || conv.user.storage.help_more_time) {
        return game.ask(conv, null, utils.getRandomPrompt(conv, 'no_input2_color'), true);
      } else {
        conv.user.storage.help_more_time = true;
        return game.ask(conv, null, utils.getRandomPrompt(conv, 'no_input2_color_more'), true);
      }
    }
    if (game.hasContext(conv, 'colors')) {
      game.askSuggestions(conv);
      game.setContext(conv, 'colors', game.CONTEXT_LIFETIME);
      if ((conv.screen && !conv.voice) || conv.user.storage.help_more_time) {
        return game.ask(conv, null, utils.getRandomPrompt(conv, 'no_input2_colors'));
      } else {
        return game.ask(conv, null, utils.getRandomPrompt(conv, 'no_input2_colors_more'), true);
      }
    }
    game.askSuggestions(conv);
    game.ask(conv, null, utils.getRandomPrompt(conv, 'no_input2'), true);
  } else if (conv.arguments.get('IS_FINAL_REPROMPT')) {
    // Last no-input allowed; close conversation
    conv.close(utils.getRandomPrompt(conv, 'no_input3'));
  }
});

// Handling callback after media playback completion
// https://developers.google.com/actions/assistant/responses#media_responses
app.intent('Media Status', (conv) => {
  const mediaStatus = conv.arguments.get('MEDIA_STATUS');
  if (mediaStatus && mediaStatus.status === 'FINISHED') {
    logger.info(`track finished`);
    if (conv.screen && !conv.voice) {
      game.ask(conv, null, `${utils.getRandomPrompt(conv, 'press_play')}`);
    } else {
      conv.ask(`<speak><prosody volume="silent">${name} time-out</prosody></speak>`);
    }
    game.playDelay(conv);
  } else {
    logger.info('Unknown media status received.');
    conv.close(utils.getRandomPrompt(conv, 'error'));
  }
});

// Dialogflow intent handler.
app.intent('Direction', (conv, params) => {
  logger.info(`Direction: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  // Repeating user input
  if (game.handleRepeatRaws(conv)) {
    return;
  }
  let direction = params.direction;
  if (!direction) {
    return game.handleSlotFilling(conv, 'slot_filling_direction', game.DIRECTIONS, [], true);
  }
  conv.data.slotFillingCount = 0;
  if (game.OTHER_DIRECTIONS.includes(direction)) {
    game.invalidResponse(conv, `${utils.getRandomPrompt(conv, 'not_support_direction')} ${utils.getRandomPrompt(conv, 'walls')} ${utils.getRandomPrompt(conv, 'which_direction')}`);
    return;
  }
  if (!game.DIRECTIONS.includes(direction)) {
    for (let value of game.DIRECTIONS) {
      if (direction[0] === value[0]) {
        game.handleDirection(conv, value);
        return;
      }
    }
    game.invalidResponse(conv, `${utils.getRandomPrompt(conv, 'not_found_direction')} ${utils.getRandomPrompt(conv, 'walls')} ${utils.getRandomPrompt(conv, 'which_direction')}`);
    return;
  }
  game.handleDirection(conv, direction);
});

const handleNoDirection = (conv, params) => {
  let direction = params.direction;
  conv.data.slotFillingCount = 0;

  if (!game.DIRECTIONS.includes(direction)) {
    game.invalidResponse(conv, `${utils.getRandomPrompt(conv, 'not_found_direction')} ${utils.getRandomPrompt(conv, 'walls')} ${utils.getRandomPrompt(conv, 'which_direction')}`);
    return;
  }
  game.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'no_direction'), direction)}`);
  game.handleDirection(conv, direction);
};

// Dialogflow intent handler.
app.intent('No Direction', (conv, params) => {
  logger.info(`No Direction: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let direction = params.direction;
  if (!direction) {
    conv.data.slot = 'noDirection';
    game.setContext(conv, 'slot_direction', 1);
    return game.handleSlotFilling(conv, 'slot_filling_direction', game.DIRECTIONS, [], true);
  }
  handleNoDirection(conv, params);
});

// Dialogflow intent handler.
app.intent('Orientation', (conv, params) => {
  logger.info(`Orientation: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let orientation = params.orientation;
  game.handleOrientation(conv, orientation);
});

const doLook = (conv, item) => {
  logger.info(`doLook: ${item}`);
  if (conv.data.currentRoom && conv.user.storage.rooms[conv.data.currentRoom].foundItems.includes(item)) {
    logger.info('found');
    conv.data.currentItem = item;
    game.doLookAction(conv, item);
    game.addLookedItems(conv, [item]);
  } else if (item === 'wall') {
    game.handleDirection(conv, conv.data.currentDirection || 'north');
    return;
  } else {
    game.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'not_found_item'), item)} ${game.makeRoomPromptResponse(conv)}`);
  }
  game.askSuggestions(conv);
};

// Dialogflow intent handler for custom slot filling.
app.intent('Slot Item', (conv, params) => {
  logger.info(`Slot Item: conv.data.slot=${conv.data.slot}, params=${JSON.stringify(params)}`);
  if (conv.data.slot && params.item) {
    if (conv.data.intents.length > 1) {
      conv.intent = conv.data.intents[1];
    }
    switch (conv.data.slot) {
      case 'look':
        handleLook(conv, {item: params.item});
        break;
      case 'take':
        handleTake(conv, {item: params.item});
        break;
      case 'drop':
        handleDrop(conv, {item: params.item});
        break;
      case 'open':
        handleOpen(conv, {item: params.item});
        break;
      case 'useItem':
        handleUseItem(conv, {item: params.item});
        break;
      case 'connect':
        handleConnect(conv, {item1: params.item});
        break;
      case 'use':
        logger.debug(`conv.data.slotItem=${conv.data.slotItem}`);
        if (conv.data.slotItem) {
          handleUse(conv, {item1: conv.data.slotItem, item2: params.item});
          conv.data.slotItem = null;
        } else {
          conv.data.slotFillingCount = 0;
          conv.data.slotItem = params.item;
          handleUseParams(conv, {item1: params.item});
        }
        break;
      case 'noItem':
        handleNoItem(conv, {item: params.item});
        break;
      case 'shine':
        handleShine(conv, {item: params.item});
        break;
      case 'hit':
        logger.debug(`conv.data.slotItem=${onv.data.slotItem}`);
        if (conv.data.slotItem) {
          handleHit(conv, {item1: conv.data.slotItem, item2: params.item});
          conv.data.slotItem = null;
        } else {
          conv.data.slotFillingCount = 0;
          conv.data.slotItem = params.item;
          handleHitParams(conv, {item1: params.item});
        }
        break;
      case 'break':
        handleBreak(conv, {item: params.item});
        break;
      case 'start':
        handleStart(conv, {item: params.item});
        break;
      case 'kick':
        handleKick(conv, {item: params.item});
        break;
      case 'side':
        logger.debug(`conv.data.slotSide=${conv.data.slotSide}`);
        handleSide(conv, {item: params.item, side: conv.data.slotSide});
        break;
      case 'turnOver':
        handleTurnOver(conv, {item: params.item});
        break;
      case 'climb':
        handleClimb(conv, {item: params.item});
        break;
      case 'climbDown':
        handleClimbDown(conv, {item: params.item});
        break;
      case 'unscrew':
        handleUnscrew(conv, {item: params.item});
        break;
      case 'tape':
        handleTape(conv, {item: params.item});
        break;
      case 'tighten':
        handleTighten(conv, {item: params.item});
        break;
      case 'unlock':
        handleUnlock(conv, {item: params.item});
        break;
      case 'pick':
        handlePick(conv, {item: params.item});
        break;
      case 'unlockItem':
        logger.debug(`conv.data.slotItem=${conv.data.slotItem}`);
        if (conv.data.slotItem) {
          handleUnlockItem(conv, {item1: conv.data.slotItem, item2: params.item});
          conv.data.slotItem = null;
        } else {
          conv.data.slotFillingCount = 0;
          conv.data.slotItem = params.item;
          handleUnlockItemParams(conv, {item1: params.item});
        }
        break;
      case 'whatDo':
        game.handleWhatDo(conv, {item: params.item});
        break;
      case 'whatColor':
        game.handleWhatColor(conv, {item: params.item});
        break;
      case 'smell':
        game.handleSmell(conv, {item: params.item});
        break;
      case 'knock':
        game.handleKnock(conv, {item: params.item});
        break;
      case 'touch':
        game.handleTouch(conv, {item: params.item});
        break;
      case 'turnOnOff':
        game.handleOnOff(conv, {item: params.item, onOff: conv.data.slotOnOff});
        break;
      case 'flip':
        game.handleFlip(conv, {item: params.item});
        break;
      case 'where':
        game.handleWhere(conv, {item: params.item});
        break;
      case 'howMany':
        game.handleHowMany(conv, {item: params.item});
        break;
      case 'openWith':
        logger.debug(`conv.data.slotItem=${conv.data.slotItem}`);
        if (conv.data.slotItem) {
          handleOpenWith(conv, {item1: conv.data.slotItem, item2: params.item});
          conv.data.slotItem = null;
        } else {
          conv.data.slotFillingCount = 0;
          conv.data.slotItem = params.item;
          handleOpenWithParams(conv, {item1: params.item});
        }
        break;
      case 'sideIt':
        game.handleSideIt(conv, {side: params.side});
        break;
      default:
        handleLook(conv, {item: params.item});
    }
  } else {
    game.fallback(conv);
  }
  conv.data.slot = null;
});

// Dialogflow intent handler for custom slot filling.
app.intent('Slot Direction', (conv, params) => {
  logger.info(`Slot Direction: conv.data.slot=${conv.data.slot}, params=${JSON.stringify(params)}`);
  if (conv.data.slot && params.direction) {
    if (conv.data.intents.length > 1) {
      conv.intent = conv.data.intents[1];
    }
    switch (conv.data.slot) {
      case 'noDirection':
        handleNoDirection(conv, {direction: params.direction});
        break;
      default:
        handleLook(conv, {item: params.item});
    }
  } else {
    game.fallback(conv);
  }
  conv.data.slot = null;
});

const handleLook = (conv, params) => {
  let item = params.item;
  conv.data.slotFillingCount = 0;
  conv.user.storage.help_item = true;
  item = game.mapToFoundItem(conv, item);
  conv.user.storage.help_item = true;
  analytics.item(conv.user.storage.uuid, conv.data.currentRoom || game.LOBBY, item);
  doLook(conv, item);
};

// Dialogflow intent handler.
app.intent(['Look', 'Examine', 'Feel', 'Search', 'What Color'], (conv, params) => {
  logger.info(`Look: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  // Repeating user input
  if (game.handleRepeatRaws(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'look';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_look', conv.user.storage.rooms[conv.data.currentRoom].lookedItems, game.DEFAULT_ITEMS);
    }
    return game.handleSlotFilling(conv, 'slot_filling_look', [], game.DEFAULT_ITEMS);
  }

  handleLook(conv, params);
});

const handleUseItem = (conv, params) => {
  let item = params.item;
  conv.data.slotFillingCount = 0;

  item = game.mapToFoundItem(conv, item);
  game.handleSingleItemAction(conv, item);
};

// Dialogflow intent handler.
app.intent('Use Item', (conv, params) => {
  logger.info(`Use Item: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'useItem';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_single_use_intent', conv.user.storage.rooms[conv.data.currentRoom].lookedItems, game.DEFAULT_ITEMS, false, true);
    }
    return game.handleSlotFilling(conv, 'slot_filling_single_use_intent', [], game.DEFAULT_ITEMS, false, true);
  }

  handleUseItem(conv, params);
});

// Dialogflow intent handler.
app.intent('Look It', (conv, params) => {
  logger.info(`Look It: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  if (conv.data.currentItem) {
    doLook(conv, conv.data.currentItem);
  } else {
    game.fallback(conv);
  }
});

const handleLookAround = (conv) => {
  game.askSuggestions(conv);
  if (conv.data.currentRoom) {
    if (game.ROOMS[conv.data.currentRoom]) {
      const items = [];
      conv.user.storage.rooms[conv.data.currentRoom].foundItems.forEach((item) => {
        if (!DEFAULT_ITEMS.includes(item) && !game.MORE_TIME.includes(item)) {
          if (game.VOWELS.indexOf(item.charAt(0)) === -1) {
            if (item.endsWith('s')) {
              items.push(`${item}`);
            } else {
              items.push(`a ${item}`);
            }
          } else {
            items.push(`an ${item}`);
          }
        }
      });
      let {prompt} = game.doAction(conv, 'look');
      if (prompt) {
        return game.ask(conv, null, `${prompt} ${items.length > 0 ? util.format(utils.getRandomPrompt(conv, 'items'), utils.makeOxfordCommaList(items, 'and')) : ''}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
      }
    }
  }
  conv.data.currentItem = null;
  game.ask(conv, null, `${game.makeRoomPromptResponse(conv)}`);
};

// Dialogflow intent handler.
app.intent('Look Around', (conv) => {
  logger.info('Look Around');
  if (game.inLobby(conv)) {
    return;
  }
  handleLookAround(conv);
});

const handleTake = (conv, params) => {
  let item = params.item;
  conv.data.slotFillingCount = 0;

  item = game.mapToFoundItem(conv, item);
  analytics.item(conv.user.storage.uuid, conv.data.currentRoom || game.LOBBY, item);
  if (conv.data.currentRoom) {
    if (!conv.user.storage.rooms[conv.data.currentRoom].foundItems.includes(item)) {
      game.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'not_found_item'), item)} ${game.makeRoomPromptResponse(conv)}`);
      game.askSuggestions(conv);
      return;
    }
    if (!conv.user.storage.rooms[conv.data.currentRoom].collectedItems.includes(item)) {
      if (conv.user.storage.rooms[conv.data.currentRoom].droppedItems.includes(item)) {
        conv.user.storage.rooms[conv.data.currentRoom].droppedItems.splice(conv.user.storage.rooms[conv.data.currentRoom].droppedItems.indexOf(item), 1);
        conv.user.storage.rooms[conv.data.currentRoom].collectedItems.unshift(item);
        game.ask(conv, `${utils.getRandomPrompt(conv, 'confirmation')}`, `${util.format(utils.getRandomPrompt(conv, 'dropped_added'), item)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
        return;
      }
      if (game.ROOMS[conv.data.currentRoom].stuff[item] && game.ROOMS[conv.data.currentRoom].stuff[item].hasOwnProperty('static') && game.ROOMS[conv.data.currentRoom].stuff[item].static) {
        game.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'cannot_take'), item)} ${game.makeRoomPromptResponse(conv)}`);
        game.askSuggestions(conv);
        return;
      }
      let currentItem = conv.data.currentItem;
      conv.data.currentItem = item;
      let {prompt, lose, secret, failed} = game.doAction(conv, conv.intent.toLowerCase());
      if (prompt) {
        if (failed) {
          game.invalidResponse(conv, `${utils.getRandomItem(prompt)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
          game.askSuggestions(conv);
          return;
        }
        if (lose) {
          return game.handleLose(conv, prompt);
        } else if (secret) {
          handleSecret(conv, [`${utils.getRandomItem(prompt)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`]);
        } else {
          game.ask(conv, null, `${utils.getRandomItem(prompt)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
        }
        game.askSuggestions(conv);
        return;
      }
      conv.data.currentItem = currentItem;
      conv.user.storage.rooms[conv.data.currentRoom].collectedItems.unshift(item);
      game.addState(conv, item, {item1: item, action: 'take'});
      game.ask(conv, `${utils.getRandomPrompt(conv, 'confirmation')}`, `${util.format(utils.getRandomPrompt(conv, 'inventory_added'), item)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
    } else {
      game.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'inventory_duplicate'), item)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
    }
  } else {
    game.ask(conv, null, `${game.makeRoomPromptResponse(conv)}`);
  }
  game.askSuggestions(conv);
};

// Dialogflow intent handler.
app.intent('Take', (conv, params) => {
  logger.info(`Take: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'take';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_look', conv.user.storage.rooms[conv.data.currentRoom].foundItems, game.DEFAULT_ITEMS);
    }
    return game.handleSlotFilling(conv, 'slot_filling_look', [], game.DEFAULT_ITEMS);
  }
  handleTake(conv, params);
});

const handleDrop = (conv, params) => {
  let item = params.item;
  conv.data.slotFillingCount = 0;

  item = game.mapToFoundItem(conv, item);
  logger.info(`Drop: item=${item}`);
  analytics.item(conv.user.storage.uuid, conv.data.currentRoom || game.LOBBY, item);
  if (conv.data.currentRoom) {
    if (!conv.user.storage.rooms[conv.data.currentRoom].collectedItems.includes(item)) {
      game.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'cannot_drop'), item)} ${game.makeRoomPromptResponse(conv)}`);
      game.askSuggestions(conv);
      return;
    }
    const index = conv.user.storage.rooms[conv.data.currentRoom].collectedItems.indexOf(item);
    if (index > -1) {
      conv.user.storage.rooms[conv.data.currentRoom].collectedItems.splice(index, 1);
      game.ask(conv, `${utils.getRandomPrompt(conv, 'confirmation')}`, `${util.format(utils.getRandomPrompt(conv, 'inventory_removed'), item)}`);
      game.addDroppedItems(conv, [item]);
    }
  } else {
    game.ask(conv, null, `${game.makeRoomPromptResponse(conv)}`);
  }
  game.askSuggestions(conv);
};

// Dialogflow intent handler.
app.intent('Drop', (conv, params) => {
  logger.info(`Drop: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'drop';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_look', conv.user.storage.rooms[conv.data.currentRoom].foundItems, game.DEFAULT_ITEMS);
    }
    return game.handleSlotFilling(conv, 'slot_filling_look', [], game.DEFAULT_ITEMS);
  }
  handleDrop(conv, params);
});

const handleOpen = (conv, params) => {
  let item = params.item;
  conv.data.slotFillingCount = 0;

  item = game.mapToFoundItem(conv, item);
  game.handleSingleItemAction(conv, item);
};

// Dialogflow intent handler.
app.intent(['Open', 'Lift', 'Turn', 'Fix', 'Close', 'Straighten', 'Take Down', 'Wipe', 'Move'], (conv, params) => {
  logger.info(`Open: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'open';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_single_use_intent', conv.user.storage.rooms[conv.data.currentRoom].foundItems, game.DEFAULT_ITEMS, false, true);
    }
    return game.handleSlotFilling(conv, 'slot_filling_single_use_intent', [], game.DEFAULT_ITEMS, false, true);
  }
  handleOpen(conv, params);
});

// Dialogflow intent handler.
app.intent('Move It', (conv, params) => {
  logger.info(`Move It: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  if (conv.data.currentItem) {
    conv.intent = 'Move';
    game.handleSingleItemAction(conv, conv.data.currentItem);
  } else {
    game.fallback(conv);
  }
});

// Dialogflow intent handler.
app.intent('Kick It', (conv, params) => {
  logger.info(`Kick It: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  if (conv.data.currentItem) {
    conv.intent = 'Kick';
    game.handleSingleItemAction(conv, conv.data.currentItem);
  } else {
    game.fallback(conv);
  }
});

// Dialogflow intent handler.
app.intent('Open It', (conv, params) => {
  logger.info(`Open It: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  if (conv.data.currentItem) {
    conv.intent = 'Open';
    game.handleSingleItemAction(conv, conv.data.currentItem);
  } else {
    game.fallback(conv);
  }
});

// Dialogflow intent handler.
app.intent('Unlock It', (conv, params) => {
  logger.info(`Unlock It: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  if (conv.data.currentItem) {
    conv.intent = 'Unlock';
    game.handleSingleItemAction(conv, conv.data.currentItem);
  } else {
    game.fallback(conv);
  }
});

// Dialogflow intent handler.
app.intent('Fix It', (conv, params) => {
  logger.info(`Fix It: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  if (conv.data.currentItem) {
    conv.intent = 'Fix';
    game.handleSingleItemAction(conv, conv.data.currentItem);
  } else {
    game.fallback(conv);
  }
});

const handleConnect = (conv, params) => {
  let item1 = params.item1;
  let item2 = params.item2;
  conv.data.slotFillingCount = 0;

  if (item2) {
    item1 = game.mapToFoundItem(conv, item1);
    item2 = game.mapToFoundItem(conv, item2);
    doUse(conv, item2, item1);
  } else {
    item1 = game.mapToFoundItem(conv, item1);
    game.handleSingleItemAction(conv, item1);
  }
};

// Dialogflow intent handler.
app.intent('Connect', (conv, params) => {
  logger.info(`Connect: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item1 = params.item1;
  if (!item1) {
    conv.data.slot = 'connect';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use_on', conv.user.storage.rooms[conv.data.currentRoom].collectedItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use_on', [], []);
  }
  handleConnect(conv, params);
});

const handleOpenWith = (conv, params) => {
  let item1 = params.item1;
  let item2 = params.item2;
  conv.data.slotFillingCount = 0;

  item1 = game.mapToFoundItem(conv, item1);
  item2 = game.mapToFoundItem(conv, item2);
  analytics.item(conv.user.storage.uuid, conv.data.currentRoom, `${item1}-${item2}`);
  doUse(conv, item2, item1);
};

const handleOpenWithParams = (conv, params) => {
  let item1 = params.item1;
  if (!item1) {
    conv.data.slotItem = null;
    conv.data.slot = 'openWith';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use_on', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use_on', [], game.DEFAULT_ITEMS);
  }
  conv.data.slotItem = params.item1;
  let item2 = params.item2;
  if (!item2) {
    conv.data.slot = 'openWith';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use', conv.user.storage.rooms[conv.data.currentRoom].collectedItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use', [], []);
  }
  handleOpenWith(conv, params);
};

// Dialogflow intent handler.
app.intent('Open With', (conv, params) => {
  logger.info(`Open With: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  handleOpenWithParams(conv, params);
});

// Dialogflow intent handler.
app.intent('Listen', (conv, {item}) => {
  logger.info(`Listen: item=${item}`);
  if (game.inLobby(conv)) {
    return;
  }
  // NOTE: item not required
  item = game.mapToFoundItem(conv, item);
  analytics.item(conv.user.storage.uuid, conv.data.currentRoom || game.LOBBY, item);
  if (conv.data.currentRoom && item) {
    if (!conv.user.storage.rooms[conv.data.currentRoom].foundItems.includes(item)) {
      conv.data.currentItem = null;
      game.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'not_found_item'), item)} ${game.makeRoomPromptResponse(conv)}`);
    } else {
      conv.data.currentItem = item;
      let {prompt, questioned, win, lose, failed} = game.doAction(conv, conv.intent.toLowerCase());
      if (lose) {
        return game.handleLose(conv, prompt);
      } else if (win) {
        return game.handleWin(conv, prompt);
      } else if (prompt) {
        if (failed) {
          game.invalidResponse(conv, `${utils.getRandomItem(prompt)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
          game.askSuggestions(conv);
          return;
        }
        if (questioned) {
          game.ask(conv, `${utils.getRandomPrompt(conv, 'confirmation')}`, `${utils.getRandomItem(prompt)}`);
        } else {
          game.ask(conv, `${utils.getRandomPrompt(conv, 'confirmation')}`, `${utils.getRandomItem(prompt)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
        }
      } else {
        if (conv.intent === 'Listen') {
          game.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'listen_not_supported'), item)} ${game.makeRoomPromptResponse(conv)}`);
        } else {
          game.invalidResponse(conv, `${utils.getRandomPrompt(conv, 'cannot_listen')} ${game.makeRoomPromptResponse(conv)}`);
        }
      }
    }
  } else {
    game.invalidResponse(conv, `${utils.getRandomPrompt(conv, 'cannot_listen')} ${game.makeRoomPromptResponse(conv)}`);
  }
  game.askSuggestions(conv);
});

const handleSecret = (conv, prompt) => {
  if (Array.isArray(prompt)) {
    prompt = utils.getRandomItem(prompt);
  }
  game.ask(conv, null, `${prompt}`);

  conv.ask(new BasicCard({
    image: new Image({
      url: 'https://upload.wikimedia.org/wikipedia/commons/7/79/StarIconGold.png',
      alt: 'MAGNIFICENT!',
    }),
    display: 'WHITE',
  }));
};

const doUse = (conv, item1, item2) => {
  logger.info(`doUse: ${item1}, ${item2}`);
  if (conv.data.currentRoom) {
    if (item1 && item2) {
      if (!conv.user.storage.rooms[conv.data.currentRoom].collectedItems.includes(item1)) {
        logger.info(`not collected: ${item1}`);
        // Items out of order
        if (conv.user.storage.rooms[conv.data.currentRoom].collectedItems.includes(item2) &&
            conv.user.storage.rooms[conv.data.currentRoom].foundItems.includes(item2)) {
          let tmp = item2;
          item2 = item1;
          item1 = tmp;
        } else {
          conv.data.currentItem = null;
          game.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'item_not_inventory'), item1)} ${game.makeRoomPromptResponse(conv)}`);
          game.askSuggestions(conv);
          return;
        }
      }
      if (!conv.user.storage.rooms[conv.data.currentRoom].foundItems.includes(item2)) {
        logger.info(`not found: ${item2}`);
        conv.data.currentItem = null;
        game.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'not_found_item'), item2)} ${game.makeRoomPromptResponse(conv)}`);
        game.askSuggestions(conv);
        return;
      }
    } else if (item1) {
      if (!conv.user.storage.rooms[conv.data.currentRoom].collectedItems.includes(item1)) {
        logger.info(`not collected: ${item1}`);
        conv.data.currentItem = null;
        game.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'item_not_inventory'), item1)} ${game.makeRoomPromptResponse(conv)}`);
        game.askSuggestions(conv);
        return;
      }
    }
    conv.data.currentItem = item2;
    let {prompt, questioned, win, lose, secret, failed} = game.doAction(conv, 'use', item1);
    if (prompt) {
      if (failed) {
        game.invalidResponse(conv, `${utils.getRandomItem(prompt)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
        game.askSuggestions(conv);
        return;
      }
      if (secret) {
        handleSecret(conv, `${prompt}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
        game.askSuggestions(conv);
        return;
      } else if (lose) {
        return game.handleLose(conv, prompt);
      } else if (win) {
        return game.handleWin(conv, prompt);
      } else if (prompt) {
        if (questioned) {
          game.ask(conv, `${utils.getRandomPrompt(conv, 'confirmation')}`, `${utils.getRandomItem(prompt)}`);
        } else {
          game.ask(conv, `${utils.getRandomPrompt(conv, 'confirmation_encouragement')}`, `${utils.getRandomItem(prompt)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
        }
        game.askSuggestions(conv);
      }
    } else {
      game.invalidResponse(conv, `${utils.getRandomPrompt(conv, 'action_not_supported')} ${utils.getRandomPrompt(conv, 'action_encouragement')} ${game.makeRoomPromptResponse(conv)}`);
      game.askSuggestions(conv);
    }
  } else {
    game.invalidResponse(conv, `${utils.getRandomPrompt(conv, 'action_not_supported')} ${utils.getRandomPrompt(conv, 'action_encouragement')} ${game.makeRoomPromptResponse(conv)}`);
    game.askSuggestions(conv);
  }
};

const handleUse = (conv, params) => {
  logger.info(`handleUse: params=${JSON.stringify(params)}`);
  let item1 = params.item1;
  let item2 = params.item2;
  conv.data.slotFillingCount = 0;

  item1 = game.mapToFoundItem(conv, item1);
  item2 = game.mapToFoundItem(conv, item2);
  analytics.item(conv.user.storage.uuid, conv.data.currentRoom, `${item1}-${item2}`);
  doUse(conv, item1, item2);
};

const handleUseParams = (conv, params) => {
  logger.info(`handleUseParams: params=${JSON.stringify(params)}`);
  let item1 = params.item1;
  if (!item1) {
    conv.data.slotItem = null;
    conv.data.slot = 'use';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use', conv.user.storage.rooms[conv.data.currentRoom].collectedItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use', [], []);
  }
  conv.data.slotItem = params.item1;
  let item2 = params.item2;
  if (!item2) {
    conv.data.slot = 'use';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use_on', conv.user.storage.rooms[conv.data.currentRoom].foundItems, game.DEFAULT_ITEMS);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use_on', [], game.DEFAULT_ITEMS);
  }
  handleUse(conv, params);
};

// Dialogflow intent handler.
app.intent(['Use', 'Put In', 'Put On', 'Push Into'], (conv, params) => {
  logger.info(`Use: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  conv.user.storage.help_use = true;

  handleUseParams(conv, params);
});

const handleNoItem = (conv, params) => {
  let item = params.item;
  conv.data.slotFillingCount = 0;

  logger.debug(`conv.data.lastCurrentItem=${conv.data.lastCurrentItem}`);
  logger.debug(`conv.data.lastItem=${conv.data.lastItem}`);
  logger.debug(`conv.data.lastAction=${conv.data.lastAction}`);

  let item1 = null;
  let item2 = null;
  if (conv.data.lastItem) {
    item1 = item;
    item2 = conv.data.lastItem;
  } else {
    item2 = item;
  }
  game.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'no_item'), item)}`);
  if (conv.data.lastAction === 'use') {
    analytics.item(conv.user.storage.uuid, conv.data.currentRoom, `${item1}-${item2}`);
    doUse(conv, item2, item1);
  } else {
    doLook(conv, item);
    analytics.item(conv.user.storage.uuid, conv.data.currentRoom || game.LOBBY, item);
  }
};

// Dialogflow intent handler.
app.intent('No Item', (conv, params) => {
  logger.info(`No Item: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'noItem';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use', conv.user.storage.rooms[conv.data.currentRoom].collectedItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use', [], []);
  }
  handleNoItem(conv, params);
});

const handleShine = (conv, params) => {
  let item1 = params.item1;
  conv.data.slotFillingCount = 0;
  let item2 = params.item2;

  if (!item2) {
    item2 = conv.data.currentItem;
  } else {
    item2 = game.mapToFoundItem(conv, item2);
  }
  item1 = game.mapToFoundItem(conv, item1);
  analytics.item(conv.user.storage.uuid, conv.data.currentRoom, item1 + '-' + item2);
  doUse(conv, item1, item2);
};

// Dialogflow intent handler.
app.intent('Shine', (conv, params) => {
  logger.info(`Shine: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item1 = params.item1;
  if (!item1) {
    conv.data.slot = 'shine';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use', [], []);
  }
  handleShine(conv, params);
});

const handleHit = (conv, params) => {
  let item1 = params.item1;
  let item2 = params.item2;
  conv.data.slotFillingCount = 0;

  item1 = game.mapToFoundItem(conv, item1);
  item2 = game.mapToFoundItem(conv, item2);
  analytics.item(conv.user.storage.uuid, conv.data.currentRoom, `${item1}-${item2}`);
  doUse(conv, item2, item1);
};

const handleHitParams = (conv, params) => {
  let item1 = params.item1;
  if (!item1) {
    conv.data.slotItem = null;
    conv.data.slot = 'hit';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use_on', conv.user.storage.rooms[conv.data.currentRoom].foundItems, game.DEFAULT_ITEMS);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use_on', [], game.DEFAULT_ITEMS);
  }
  conv.data.slotItem = params.item1;
  let item2 = params.item2;
  if (!item2) {
    conv.data.slot = 'hit';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use', conv.user.storage.rooms[conv.data.currentRoom].collectedItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use', [], []);
  }
  handleHit(conv, params);
};

// Dialogflow intent handler.
app.intent('Hit', (conv, params) => {
  logger.info(`Hit: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  handleHitParams(conv, params);
});

const handleBreak = (conv, params) => {
  let item = params.item;
  conv.data.slotFillingCount = 0;

  item = game.mapToFoundItem(conv, item);
  analytics.item(conv.user.storage.uuid, conv.data.currentRoom || game.LOBBY, item);
  conv.data.currentItem = item;
  if (conv.data.currentRoom && conv.user.storage.rooms[conv.data.currentRoom].collectedItems && conv.user.storage.rooms[conv.data.currentRoom].collectedItems.length > 0) {
    game.invalidResponse(conv, `${utils.getRandomPrompt(conv, 'action_not_supported')} ${utils.getRandomPrompt(conv, 'items_instructions')}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
  } else {
    game.invalidResponse(conv, `${utils.getRandomPrompt(conv, 'action_not_supported')} ${utils.getRandomPrompt(conv, 'action_encouragement')} ${game.makeRoomPromptResponse(conv)}`);
  }
  game.askSuggestions(conv);
};

// Dialogflow intent handler.
app.intent('Break', (conv, params) => {
  logger.info(`Break: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'break';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use', [], []);
  }
  handleBreak(conv, params);
});

const handleStart = (conv, params) => {
  let item = params.item;
  conv.data.slotFillingCount = 0;

  item = game.mapToFoundItem(conv, item);
  analytics.item(conv.user.storage.uuid, conv.data.currentRoom || game.LOBBY, item);
  conv.data.currentItem = item;
  if (conv.data.currentRoom && conv.user.storage.rooms[conv.data.currentRoom].collectedItems && conv.user.storage.rooms[conv.data.currentRoom].collectedItems.length > 0) {
    game.invalidResponse(conv, `${utils.getRandomPrompt(conv, 'action_not_supported')} ${utils.getRandomPrompt(conv, 'items_instructions')}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
  } else {
    game.invalidResponse(conv, `${utils.getRandomPrompt(conv, 'action_not_supported')} ${utils.getRandomPrompt(conv, 'action_encouragement')} ${game.makeRoomPromptResponse(conv)}`);
  }
  game.askSuggestions(conv);
};

// Dialogflow intent handler.
app.intent('Start', (conv, params) => {
  logger.info(`Start: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'start';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use', [], []);
  }
  handleBreak(conv, params);
});

const handleKick = (conv, params) => {
  let item = params.item;
  conv.data.slotFillingCount = 0;

  item = game.mapToFoundItem(conv, item);
  analytics.item(conv.user.storage.uuid, conv.data.currentRoom || game.LOBBY, item);
  conv.data.currentItem = item;
  if (item) {
    if (conv.data.currentRoom && conv.user.storage.rooms[conv.data.currentRoom].foundItems && !conv.user.storage.rooms[conv.data.currentRoom].foundItems.includes(item)) {
      game.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'not_found_item'), item)} ${game.makeRoomPromptResponse(conv)}`);
      game.askSuggestions(conv);
      return;
    }
    game.failedResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'kick'), item)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
  } else {
    game.invalidResponse(conv, `${utils.getRandomPrompt(conv, 'action_not_supported')} ${utils.getRandomPrompt(conv, 'action_encouragement')} ${game.makeRoomPromptResponse(conv)}`);
  }
  game.askSuggestions(conv);
};

// Dialogflow intent handler.
app.intent('Kick', (conv, params) => {
  logger.info(`Kick: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'kick';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use', [], []);
  }
  handleKick(conv, params);
});

const doSide = (conv, item, side) => {
  if (item && conv.data.currentRoom && !conv.user.storage.rooms[conv.data.currentRoom].foundItems.includes(item)) {
    conv.data.currentItem = null;
    game.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'not_found_item'), item)} ${game.makeRoomPromptResponse(conv)}`);
  } else {
    conv.data.currentItem = item;
    let {prompt, failed} = game.doAction(conv, side);
    if (prompt) {
      if (failed) {
        game.invalidResponse(conv, `${utils.getRandomItem(prompt)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
        game.askSuggestions(conv);
        return;
      }
      game.ask(conv, null, `${utils.getRandomItem(prompt)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
    } else {
      if (prompts[`nothing_${side}`]) {
        game.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, `nothing_${side}`), item)} ${game.makeRoomPromptResponse(conv)}`);
      } else {
        game.ask(conv, null, `${utils.getRandomPrompt(conv, 'action_not_supported')} ${utils.getRandomPrompt(conv, 'action_encouragement')} ${game.makeRoomPromptResponse(conv)}`);
      }
    }
  }
  game.askSuggestions(conv);
};

const handleSide = (conv, params) => {
  logger.info(`handleSide: params=${JSON.stringify(params)}`);
  let item = params.item;
  let side = params.side;
  conv.data.slotFillingCount = 0;

  item = game.mapToFoundItem(conv, item);
  analytics.item(conv.user.storage.uuid, conv.data.currentRoom || game.LOBBY, item);
  doSide(conv, item, side);
};

const handleSideParams = (conv, params) => {
  logger.info(`handleSideParams: params=${JSON.stringify(params)}`);
  let side = params.side;
  if (!side) {
    conv.data.slot = 'side';
    game.setContext(conv, 'slot_item', 1);
    return game.handleSlotFilling(conv, 'slot_filling_side', game.SIDES, []);
  }
  conv.data.slotSide = params.side;
  let item = params.item;
  if (!item) {
    conv.data.slot = 'side';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_single_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_single_use', [], []);
  }
  handleSide(conv, params);
};

// Dialogflow intent handler.
app.intent('Side', (conv, params) => {
  logger.info(`Side: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  handleSideParams(conv, params);
});

// Dialogflow intent handler.
app.intent('Side It', (conv, params) => {
  logger.info(`Side It: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  if (conv.data.currentItem) {
    game.handleSideIt(conv, params);
  } else {
    game.fallback(conv);
  }
});

const handleTurnOver = (conv, params) => {
  let item = params.item;
  conv.data.slotFillingCount = 0;

  item = game.mapToFoundItem(conv, item);
  analytics.item(conv.user.storage.uuid, conv.data.currentRoom || game.LOBBY, item);
  if (conv.data.currentRoom && game.ROOMS[conv.data.currentRoom].stuff[item] && game.ROOMS[conv.data.currentRoom].stuff[item].hasOwnProperty('static') && game.ROOMS[conv.data.currentRoom].stuff[item].static) {
    doSide(conv, item, 'below');
  } else {
    doSide(conv, item, 'behind');
  }
};

// Dialogflow intent handler.
app.intent('Turn Over', (conv, params) => {
  logger.info(`Turn Over: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'turnOver';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use', [], []);
  }
  handleTurnOver(conv, params);
});

const handleClimb = (conv, params) => {
  let item = params.item;
  conv.data.slotFillingCount = 0;

  item = game.mapToFoundItem(conv, item);
  analytics.item(conv.user.storage.uuid, conv.data.currentRoom || game.LOBBY, item);
  if (item && conv.data.currentRoom && !conv.user.storage.rooms[conv.data.currentRoom].foundItems.includes(item)) {
    conv.data.currentItem = null;
    game.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'not_found_item'), item)} ${game.makeRoomPromptResponse(conv)}`);
  } else {
    conv.data.currentItem = item;
    let {prompt, secret, failed} = game.roomPrompt(conv, 'climb');
    if (prompt) {
      if (failed) {
        game.invalidResponse(conv, `${utils.getRandomItem(prompt)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
        game.askSuggestions(conv);
        return;
      }
      if (secret) {
        handleSecret(conv, [`${utils.getRandomItem(prompt)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`]);
      } else {
        game.ask(conv, null, `${utils.getRandomItem(prompt)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
      }
    } else {
      game.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'climb_not_supported'), item)} ${game.makeRoomPromptResponse(conv)}`);
    }
  }
  game.askSuggestions(conv);
};

// Dialogflow intent handler.
app.intent('Climb', (conv, params) => {
  logger.info(`Climb: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'climb';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_single_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_single_use', [], []);
  }
  handleClimb(conv, params);
});

const handleClimbDown = (conv, params) => {
  let item1 = params.item1;
  let item2 = params.item2;
  conv.data.slotFillingCount = 0;

  item1 = game.mapToFoundItem(conv, item1);
  if (item2) {
    item2 = game.mapToFoundItem(conv, item2);
    analytics.item(conv.user.storage.uuid, conv.data.currentRoom, `${item1}-${item2}`);
    doUse(conv, item1, item2);
    return;
  }
  analytics.item(conv.user.storage.uuid, conv.data.currentRoom || game.LOBBY, item1);
  if (conv.data.currentRoom && !conv.user.storage.rooms[conv.data.currentRoom].foundItems.includes(item1)) {
    conv.data.currentItem = null;
    game.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'not_found_item'), item1)} ${game.makeRoomPromptResponse(conv)}`);
  } else {
    conv.data.currentItem = item1;
    let {prompt, lose, secret, failed} = game.roomPrompt(conv, 'climb down');
    if (prompt) {
      if (failed) {
        game.invalidResponse(conv, `${utils.getRandomItem(prompt)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
        game.askSuggestions(conv);
        return;
      }
      if (lose) {
        return game.handleLose(conv, prompt);
      } else if (secret) {
        handleSecret(conv, [`${utils.getRandomItem(prompt)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`]);
      } else {
        game.ask(conv, null, `${utils.getRandomItem(prompt)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
      }
    } else {
      game.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'climb_not_supported'), item1)} ${game.makeRoomPromptResponse(conv)}`);
    }
  }
  game.askSuggestions(conv);
};

// Dialogflow intent handler.
app.intent('Climb Down', (conv, params) => {
  logger.info(`Climb Down: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }

  let item1 = params.item1;
  if (!item1) {
    conv.data.slot = 'climbDown';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_single_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, game.DEFAULT_ITEMS);
    }
    return game.handleSlotFilling(conv, 'slot_filling_single_use', [], game.DEFAULT_ITEMS);
  }
  handleClimbDown(conv, params);
});

// Dialogflow intent handler.
app.intent('Inventory', (conv) => {
  logger.info('Inventory');
  logger.info(`conv.user.storage=${JSON.stringify(conv.user.storage)}`);
  if (game.inLobby(conv)) {
    return;
  }
  conv.user.storage.help_inventory = true;
  if (conv.data.currentRoom && conv.user.storage.rooms[conv.data.currentRoom].collectedItems && conv.user.storage.rooms[conv.data.currentRoom].collectedItems.length > 0) {
    let options = [];
    conv.user.storage.rooms[conv.data.currentRoom].collectedItems.forEach((item) => {
      if (game.VOWELS.indexOf(item.charAt(0)) === -1) {
        options.push(`a ${item}`);
      } else {
        options.push(`an ${item}`);
      }
    });
    game.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'inventory_contents'), utils.makeOxfordCommaList(options, 'and'))}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
  } else {
    game.ask(conv, null, `${utils.getRandomPrompt(conv, 'no_inventory')}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
  }
  game.askSuggestions(conv);
});

// Dialogflow intent handler.
app.intent('Colors', (conv, {color1, color2, color3, color4}) => {
  logger.info(`Colors: color1=${color1} color2=${color2} color3=${color3} color4=${color4}`);
  if (game.inLobby(conv)) {
    return;
  }
  const tryPrompt = `${util.format(utils.getRandomPrompt(conv, 'try_colors'), utils.makeOxfordCommaList([color1, color2, color3, color4], 'and'))}`;
  if (conv.data.currentRoom) {
    let action;
    for (let act of game.ROOMS[conv.data.currentRoom].stuff[conv.data.currentItem].actions) {
      if (act.type && act.type.includes('colors')) {
        action = act;
      }
    }
    const solution = action.solution;
    if (solution && color1 === solution[0] && color2 === solution[1] && color3 === solution[2] && color4 === solution[3]) {
      let {prompt, win, lose, secret} = game.handleAction(conv, conv.data.currentItem, game.ROOMS[conv.data.currentRoom].stuff[conv.data.currentItem], 'colors', null);
      if (secret) {
        game.ask(conv, null, `${tryPrompt}`);
        handleSecret(conv, [`${prompt}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`]);
      } else if (lose) {
        return game.handleLose(conv, [`${tryPrompt} ${prompt}`]);
      } else if (win) {
        return game.handleWin(conv, [`${tryPrompt} ${prompt}`]);
      } else if (prompt) {
        game.ask(conv, null, `${tryPrompt}`);
        game.ask(conv, null, `${prompt}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
      } else {
        game.ask(conv, null, `${tryPrompt}`);
        game.ask(conv, null, `${utils.getRandomItem(action.description)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
      }
      conv.data.colorsCounter = 0;
      game.deleteContext(conv, 'colors');
      game.addState(conv, conv.data.currentItem, {item1: conv.data.currentItem, action: 'colors'});
    } else {
      game.ask(conv, null, `${tryPrompt}`);
      game.setContext(conv, 'colors', game.CONTEXT_LIFETIME);
      if (conv.data.colorsCounter) {
        const counter = parseInt(conv.data.colorsCounter);
        conv.data.colorsCounter = counter + 1;
      } else {
        conv.data.colorsCounter = 1;
      }
      if (conv.data.colorsCounter % 3 === 2) {
        game.failedResponse(conv, `${utils.getRandomPrompt(conv, 'colors_failed')}<break time="${game.BREAK_NEXT}"/>${utils.getRandomPrompt(conv, 'hint_colors')}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
      } else if (conv.data.colorsCounter % 3 === 1) {
        game.failedResponse(conv, `${utils.getRandomPrompt(conv, 'colors_failed')} ${utils.getRandomPrompt(conv, 'which_colors')}`);
      } else {
        game.failedResponse(conv, `${utils.getRandomPrompt(conv, 'colors_failed')} ${game.makeRoomPromptResponse(conv)}`);
      }
    }
  } else {
    game.ask(conv, null, `${tryPrompt}`);
    game.ask(conv, null, `${game.makeRoomPromptResponse(conv)}`);
  }
  game.askSuggestions(conv);
});

// Dialogflow intent handler.
app.intent('Color', (conv, {color}) => {
  logger.info(`Color: color=${color}`);
  if (game.inLobby(conv)) {
    return;
  }
  const tryPrompt = `${util.format(utils.getRandomPrompt(conv, 'try_color'), color)}`;
  if (conv.data.currentRoom) {
    let action;
    for (let act of game.ROOMS[conv.data.currentRoom].stuff[conv.data.currentItem].actions) {
      if (act.type && act.type.includes('color')) {
        action = act;
      }
    }
    const solution = action.solution;
    if (solution && color === solution[0]) {
      let {prompt, win, lose, secret} = game.handleAction(conv, conv.data.currentItem, game.ROOMS[conv.data.currentRoom].stuff[conv.data.currentItem], 'color', null);
      if (secret) {
        game.ask(conv, null, `${tryPrompt}`);
        handleSecret(conv, [`${prompt}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`]);
      } else if (lose) {
        return game.handleLose(conv, [`${tryPrompt} ${prompt}`]);
      } else if (win) {
        return game.handleWin(conv, [`${tryPrompt} ${prompt}`]);
      } else if (prompt) {
        game.ask(conv, null, `${tryPrompt}`);
        game.ask(conv, null, `${prompt}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
      } else {
        game.ask(conv, null, `${tryPrompt}`);
        game.ask(conv, null, `${utils.getRandomItem(action.description)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
      }
      conv.data.colorCounter = 0;
      game.deleteContext(conv, 'color');
      game.addState(conv, conv.data.currentItem, {item1: conv.data.currentItem, action: 'color'});
    } else {
      game.ask(conv, null, `${tryPrompt}`);
      game.setContext(conv, 'color', game.CONTEXT_LIFETIME);
      if (conv.data.colorCounter) {
        const counter = parseInt(conv.data.colorCounter);
        conv.data.colorCounter = counter + 1;
      } else {
        conv.data.colorCounter = 1;
      }
      if (conv.data.colorCounter % 3 === 2) {
        game.failedResponse(conv, `${utils.getRandomPrompt(conv, 'color_failed')}<break time="${game.BREAK_NEXT}"/>${utils.getRandomPrompt(conv, 'hint_color')}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
      } else if (conv.data.colorCounter % 3 === 1) {
        game.failedResponse(conv, `${utils.getRandomPrompt(conv, 'color_failed')} ${utils.getRandomPrompt(conv, 'which_color')}`);
      } else {
        game.failedResponse(conv, `${utils.getRandomPrompt(conv, 'color_failed')} ${game.makeRoomPromptResponse(conv)}`);
      }
    }
  } else {
    game.ask(conv, null, `${tryPrompt}`);
    game.ask(conv, null, `${game.makeRoomPromptResponse(conv)}`);
  }
  game.askSuggestions(conv);
});

// Dialogflow intent handler.
app.intent('Code', (conv, {code}) => {
  logger.info(`Code: code=${code}`);
  if (game.inLobby(conv)) {
    return;
  }
  let fixedCode = utils.makeCode(conv);
  if (fixedCode !== null) {
    game.handleCode(conv, fixedCode);
    return;
  }
  game.setContext(conv, 'code', game.CONTEXT_LIFETIME);
  game.askSuggestions(conv);
  return game.ask(conv, null, utils.getRandomPrompt(conv, 'fallback1_code'), true);
});

// Dialogflow intent handler.
app.intent('Directions', (conv, {direction1, direction2, direction3, direction4}) => {
  logger.info(`Directions: direction1=${direction} direction2=${direction2} direction3=${direction3} direction4=${direction4}`);
  if (game.inLobby(conv)) {
    return;
  }
  const tryPrompt = `${util.format(utils.getRandomPrompt(conv, 'try_directions'), utils.makeOxfordCommaList([direction1, direction2, direction3, direction4], 'and'))}`;
  if (conv.data.currentRoom) {
    let action;
    for (let act of game.ROOMS[conv.data.currentRoom].stuff[conv.data.currentItem].actions) {
      if (act.type && act.type.includes('directions')) {
        action = act;
      }
    }
    const solution = action.solution;
    if (solution && direction1 === solution[0] && direction2 === solution[1] && direction3 === solution[2] && direction4 === solution[3]) {
      let {prompt, win, lose, secret} = game.handleAction(conv, conv.data.currentItem, game.ROOMS[conv.data.currentRoom].stuff[conv.data.currentItem], 'directions', null);
      if (secret) {
        game.ask(conv, null, `${tryPrompt}`);
        handleSecret(conv, [`${prompt}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`]);
      } else if (lose) {
        return game.handleLose(conv, [`${tryPrompt} ${prompt}`]);
      } else if (win) {
        return game.handleWin(conv, [`${tryPrompt} ${prompt}`]);
      } else if (prompt) {
        game.ask(conv, null, `${tryPrompt}`);
        game.ask(conv, null, `${prompt}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
      } else {
        game.ask(conv, null, `${tryPrompt}`);
        game.ask(conv, null, `${utils.getRandomItem(action.description)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
      }
      conv.data.directionsCounter = 0;
      game.deleteContext(conv, 'directions');
      game.addState(conv, conv.data.currentItem, {item1: conv.data.currentItem, action: 'directions'});
    } else {
      game.ask(conv, null, `${tryPrompt}`);
      game.setContext(conv, 'directions', game.CONTEXT_LIFETIME);
      if (conv.data.directionsCounter) {
        const counter = parseInt(conv.data.directionsCounter);
        conv.data.directionsCounter = counter + 1;
      } else {
        conv.data.directionsCounter = 1;
      }
      if (conv.data.directionsCounter % 3 === 2) {
        game.failedResponse(conv, `${utils.getRandomPrompt(conv, 'directions_failed')}<break time="${game.BREAK_NEXT}"/>${utils.getRandomPrompt(conv, 'hint_directions')}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
      } else if (conv.data.directionsCounter % 3 === 1) {
        game.failedResponse(conv, `${utils.getRandomPrompt(conv, 'directions_failed')} ${utils.getRandomPrompt(conv, 'which_directions')}`);
      } else {
        game.failedResponse(conv, `${utils.getRandomPrompt(conv, 'directions_failed')} ${game.makeRoomPromptResponse(conv)}`);
      }
    }
  } else {
    game.ask(conv, null, `${tryPrompt}`);
    game.ask(conv, null, `${game.makeRoomPromptResponse(conv)}`);
  }
  game.askSuggestions(conv);
});

// Dialogflow intent handler.
app.intent('Turns', (conv, {direction}) => {
  logger.info(`Turns: direction=${direction}`);
  if (game.inLobby(conv)) {
    return;
  }
  let raw = conv.input.raw.toLowerCase();
  const rights = (raw.match(/right/g) || []).length;
  const lefts = (raw.match(/left/g) || []).length;
  // turn right two times
  const index = raw.indexOf('times');
  if (lefts > 1 || rights > 1 || (lefts + rights) > 1 || index !== -1) {
    game.askSuggestions(conv, game.suggestionsLeftRight);
    return game.ask(conv, null, utils.getRandomPrompt(conv, 'fallback1_turns_too_many'), true);
  }
  let action;
  if (conv.data.currentRoom) {
    if (!conv.data.solution) {
      for (let act of game.ROOMS[conv.data.currentRoom].stuff[conv.data.currentItem].actions) {
        if (act.type && act.type.includes('turns')) {
          action = act;
        }
      }
      conv.data.solution = action.solution;
      conv.data.solutionIndex = 0;
    }
    let solutionIndex = parseInt(conv.data.solutionIndex);
    let clickSound = '';
    let hintPrompt = null;
    if (conv.data.solution[solutionIndex] === direction) {
      conv.data.solutionIndex = solutionIndex + 1;
    } else {
      logger.info(`conv.data.solutionResetCount: ${conv.data.solutionResetCount}`);
      if (conv.data.solutionResetCount) {
        let solutionResetCount = parseInt(conv.data.solutionResetCount);
        conv.data.solutionResetCount = solutionResetCount + 1;
        if (!conv.user.storage.turn_hint && conv.data.solutionResetCount > 2) {
          hintPrompt = `${util.format(utils.getRandomPrompt(conv, 'by_the_way'), utils.getRandomPrompt(conv, 'hint_turns').toLowerCase())}`;
          logger.debug(`hintPrompt=${hintPrompt}`);
          conv.user.storage.turn_hint = true;
        }
      } else {
        conv.data.solutionResetCount = 1;
      }
      conv.data.solutionIndex = 0;
    }
    logger.info(`conv.data.solutionIndex=${conv.data.solutionIndex}`);
    let textPrompt = utils.getRandomPrompt(conv, `turn_${direction}`);
    if (conv.data.solutionIndex === conv.data.solution.length) {
      let {prompt, win, lose, secret} = game.handleAction(conv, conv.data.currentItem, game.ROOMS[conv.data.currentRoom].stuff[conv.data.currentItem], 'turns', null);
      if (secret) {
        handleSecret(conv, [`<audio src="https://actions.google.com/sounds/v1/office/click_continuous.ogg"></audio>${prompt}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`]);
      } else if (lose) {
        return game.handleLose(conv, prompt);
      } else if (win) {
        return game.handleWin(conv, prompt);
      } else if (prompt) {
        game.ask(conv, null, `<audio src="https://actions.google.com/sounds/v1/office/click_continuous.ogg"></audio>${prompt}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
      } else if (action) {
        game.ask(conv, null, `${utils.getRandomItem(action.description)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
      } else {
        game.ask(conv, null, `${game.makeRoomPromptResponse(conv)}`);
      }
      game.deleteContext(conv, 'turns');
      game.addState(conv, conv.data.currentItem, {item1: conv.data.currentItem, action: 'turns'});
      game.askSuggestions(conv);
      return;
    } else if (conv.data.solutionIndex !== 0 && conv.data.solution[conv.data.solutionIndex] !== conv.data.solution[conv.data.solutionIndex - 1]) {
      clickSound = `<audio src="https://actions.google.com/sounds/v1/office/click_continuous.ogg"></audio>`;
      if (conv.screen) {
        textPrompt = utils.getRandomPrompt(conv, `turn_${direction}_click`);
      }
    }
    if (direction === 'left') {
      if (hintPrompt) {
        conv.ask(hintPrompt);
      }
      conv.ask(new SimpleResponse({
        speech: `<speak><audio src="https://actions.google.com/sounds/v1/office/click_continuous.ogg"></audio>${clickSound}</speak>`,
        text: `${textPrompt}`,
      }));
      game.setContext(conv, 'turns', game.CONTEXT_LIFETIME);
    } else if (direction === 'right') {
      if (hintPrompt) {
        conv.ask(hintPrompt);
      }
      conv.ask(new SimpleResponse({
        speech: `<speak><audio src="https://actions.google.com/sounds/v1/office/click_continuous.ogg"></audio>${clickSound}</speak>`,
        text: `${textPrompt}`,
      }));
      game.setContext(conv, 'turns', game.CONTEXT_LIFETIME);
    } else {
      game.failedResponse(conv, `${utils.getRandomPrompt(conv, 'turns_failed')} ${game.makeRoomPromptResponse(conv)}`);
    }
  } else {
    game.ask(conv, null, `${game.makeRoomPromptResponse(conv)}`);
  }

  game.askSuggestions(conv, game.suggestionsLeftRight);
});

const doUnscrewUnlock = (conv, item, tool) => {
  if (conv.data.currentRoom) {
    if (!conv.user.storage.rooms[conv.data.currentRoom].collectedItems.includes(tool)) {
      conv.data.currentItem = null;
      game.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'item_not_inventory'), tool)} ${game.makeRoomPromptResponse(conv)}`);
      game.askSuggestions(conv);
      return;
    }
    if (!conv.user.storage.rooms[conv.data.currentRoom].foundItems.includes(item)) {
      conv.data.currentItem = null;
      game.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'not_found_item'), item)} ${game.makeRoomPromptResponse(conv)}`);
      game.askSuggestions(conv);
      return;
    }
    conv.data.currentItem = item;
    let {prompt, questioned, win, lose, failed} = game.doAction(conv, 'use', tool);
    if (prompt) {
      conv.data.currentItem = item;
      if (failed) {
        game.invalidResponse(conv, `${utils.getRandomItem(prompt)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
        game.askSuggestions(conv);
        return;
      }
      if (lose) {
        return game.handleLose(conv, prompt);
      } else if (win) {
        return game.handleWin(conv, prompt);
      } else {
        if (questioned) {
          game.ask(conv, `${utils.getRandomPrompt(conv, 'confirmation')}`, `${utils.getRandomItem(prompt)}`);
        } else {
          game.ask(conv, `${utils.getRandomPrompt(conv, 'confirmation_encouragement')}`, `${utils.getRandomItem(prompt)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
        }
        game.askSuggestions(conv);
      }
      return;
    }
  }
  conv.data.currentItem = null;
  game.invalidResponse(conv, `${utils.getRandomPrompt(conv, 'action_not_supported')} ${utils.getRandomPrompt(conv, 'action_encouragement')} ${game.makeRoomPromptResponse(conv)}`);
  game.askSuggestions(conv);
};

const handleUnscrew = (conv, params) => {
  let item = params.item;
  conv.data.slotFillingCount = 0;

  item = game.mapToFoundItem(conv, item);
  doUnscrewUnlock(conv, item, 'screwdriver');
};

// Dialogflow intent handler.
app.intent('Unscrew', (conv, params) => {
  logger.info(`Unscrew: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'unscrew';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_single_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_single_use', [], []);
  }
  handleUnscrew(conv, params);
});

const handleTape = (conv, params) => {
  let item = params.item;
  conv.data.slotFillingCount = 0;

  item = game.mapToFoundItem(conv, item);
  doUnscrewUnlock(conv, item, 'tape');
};

// Dialogflow intent handler.
app.intent('Tape', (conv, params) => {
  logger.info(`Tape: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'tape';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_single_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_single_use', [], []);
  }
  handleTape(conv, params);
});

const handleTighten = (conv, params) => {
  let item = params.item;
  conv.data.slotFillingCount = 0;

  item = game.mapToFoundItem(conv, item);
  doUse(conv, 'wrench', item);
};

// Dialogflow intent handler.
app.intent('Tighten', (conv, params) => {
  logger.info(`Tighten: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'tighten';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_single_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_single_use', [], []);
  }
  handleTighten(conv, params);
});

const handleUnlock = (conv, params) => {
  let item = params.item;
  conv.data.slotFillingCount = 0;

  item = game.mapToFoundItem(conv, item);
  doUnscrewUnlock(conv, item, 'key');
};

// Dialogflow intent handler.
app.intent('Unlock', (conv, params) => {
  logger.info(`Unlock: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'unlock';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_single_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_single_use', [], []);
  }
  handleUnlock(conv, params);
});

const handlePick = (conv, params) => {
  let item = params.item;
  conv.data.slotFillingCount = 0;

  item = game.mapToFoundItem(conv, item);
  game.handleNotSupported(conv, item);
};

// Dialogflow intent handler.
app.intent('Pick', (conv, params) => {
  logger.info(`Pick: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'pick';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_single_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_single_use', [], []);
  }
  handlePick(conv, params);
});

const handleUnlockItem = (conv, params) => {
  let item1 = params.item1;
  let item2 = params.item2;
  conv.data.slotFillingCount = 0;

  item1 = game.mapToFoundItem(conv, item1);
  item2 = game.mapToFoundItem(conv, item2);
  analytics.item(conv.user.storage.uuid, conv.data.currentRoom, `${item1}-${item2}`);
  doUse(conv, item2, item1);
};

const handleUnlockItemParams = (conv, params) => {
  let item1 = params.item1;
  if (!item1) {
    conv.data.slot = 'unlockItem';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use_on', conv.user.storage.rooms[conv.data.currentRoom].foundItems, game.DEFAULT_ITEMS);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use_on', [], game.DEFAULT_ITEMS);
  }
  conv.data.slotItem = params.item1;
  let item2 = params.item2;
  if (!item2) {
    conv.data.slot = 'unlockItem';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use', conv.user.storage.rooms[conv.data.currentRoom].collectedItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use', [], []);
  }
  handleUnlockItem(conv, params);
};

// Dialogflow intent handler.
app.intent('Unlock Item', (conv, params) => {
  logger.info(`Unlock Item: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item1 = params.item1;
  if (!item1) {
    conv.data.slotItem = null;
    conv.data.slot = 'unlockItem';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use_on', conv.user.storage.rooms[conv.data.currentRoom].foundItems, game.DEFAULT_ITEMS);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use_on', [], game.DEFAULT_ITEMS);
  }
  let item2 = params.item2;
  if (!item2) {
    conv.data.slot = 'unlockItem';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use', conv.user.storage.rooms[conv.data.currentRoom].collectedItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use', [], []);
  }
  handleUnlockItemParams(conv, params);
});

// Dialogflow intent handler.
app.intent('Rate', (conv) => {
  logger.info(`Rate`);
  game.ask(conv, null, utils.getRandomPrompt(conv, 'rate'));
  if (conv.screen) {
    game.rate(conv, false);
  }
});

// Dialogflow intent handler.
app.intent('More Time', (conv) => {
  logger.info('More Time');
  if (game.inLobby(conv)) {
    return;
  }
  game.doMoreTime(conv);
});

// Dialogflow intent handler.
app.intent('Walkthrough', (conv) => {
  logger.info('Walkthrough');
  if (game.inLobby(conv)) {
    return;
  }
  game.ask(conv, null, `${utils.getRandomPrompt(conv, 'walkthrough')}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
  game.askSuggestions(conv);
});

// Dialogflow intent handler.
app.intent('What Do', (conv, params) => {
  logger.info(`What Do: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'whatDo';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use', [], []);
  }
  game.handleWhatDo(conv, params);
});

// Dialogflow intent handler.
app.intent('What Color', (conv, params) => {
  logger.info(`What Color: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'whatColor';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use', [], []);
  }
  game.handleWhatColor(conv, params);
});

// Dialogflow intent handler.
app.intent('Stats', (conv) => {
  logger.info(`Stats: conv.user.storage.count=${conv.user.storage.count}`);
  let count = 0;
  if (conv.user.storage.count) {
    count = parseInt(conv.user.storage.count);
  }
  if (game.hasContext(conv, 'lobby')) {
    if (count === 1) {
      game.ask(conv, null, `${utils.getRandomPrompt(conv, 'stats_lobby1')}`);
    } else if (count > 0) {
      game.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'stats_lobby'), count)}`);
    } else {
      game.ask(conv, null, `${utils.getRandomPrompt(conv, 'stats_lobby_no_rooms')}`);
    }
    game.lobby(conv, false);
    return;
  } else {
    if (count === 1) {
      game.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'stats1'), game.doTime(conv))}`);
    } else if (count > 0) {
      game.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'stats'), count, game.doTime(conv))}`);
    } else {
      game.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'stats_no_rooms'), game.doTime(conv))}`);
    }
  }
  let secrets = 0;
  if (conv.user.storage.secrets) {
    secrets = parseInt(conv.user.storage.secrets);
  }
  if (secrets > 0) {
    game.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'secrets_found'), secrets)}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
  } else {
    game.ask(conv, null, `${utils.getRandomPrompt(conv, 'secrets_not_found')}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
  }
  game.askSuggestions(conv);
});

// Dialogflow intent handler.
app.intent('Room', (conv) => {
  logger.info('Room');
  if (game.inLobby(conv)) {
    return;
  }
  game.handleRoom(conv);
});

// Dialogflow intent handler.
app.intent('Sing', (conv) => {
  logger.info('Sing');
  if (game.inLobby(conv)) {
    return;
  }
  game.ask(conv, null, `${utils.getRandomPrompt(conv, 'sing')}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
  game.askSuggestions(conv);
});

// Dialogflow intent handler.
app.intent('Undo', (conv) => {
  logger.info('Undo');
  if (game.inLobby(conv)) {
    return;
  }
  game.ask(conv, null, `${utils.getRandomPrompt(conv, 'undo')}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
  game.askSuggestions(conv);
});

// Dialogflow intent handler.
app.intent('Smell', (conv, params) => {
  logger.info(`Smell: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'smell';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_single_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_single_use', [], []);
  }
  game.handleSmell(conv, params);
});

// Dialogflow intent handler.
app.intent('Knock', (conv, params) => {
  logger.info(`Knock: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'knock';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_single_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_single_use', [], []);
  }
  game.handleKnock(conv, params);
});

// Dialogflow intent handler.
app.intent('Touch', (conv, params) => {
  logger.info(`Touch: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'touch';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_single_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_single_use', [], []);
  }
  game.handleTouch(conv, params);
});

// Dialogflow intent handler.
app.intent('Why', (conv) => {
  logger.info('Why');
  if (game.inLobby(conv)) {
    return;
  }
  game.ask(conv, null, `${utils.getRandomPrompt(conv, 'why')}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
  game.askSuggestions(conv);
});

// Dialogflow intent handler.
app.intent('Map', (conv) => {
  logger.info('Map');
  if (game.inLobby(conv)) {
    return;
  }
  game.ask(conv, null, `${utils.getRandomPrompt(conv, 'map')}`);
  handleLookAround(conv);
});

// Dialogflow intent handler.
app.intent('Restart', (conv) => {
  logger.info(`Restart: ${conv.data.currentRoom}`);
  if (game.handleAssistant(conv)) {
    return;
  }
  if (game.hasContext(conv, 'lobby')) {
    conv.user.storage = {};
    conv.close(`${utils.getRandomPrompt(conv, 'quit')}`);
    return;
  }
  game.restart(conv);
  logger.info(`conv.user.storage=${JSON.stringify(conv.user.storage)}`);
  game.ask(conv, `${utils.getRandomPrompt(conv, 'confirmation')}`, `${utils.getRandomPrompt(conv, 'restart')}`);
  game.start(conv);
});

// Dialogflow intent handler.
app.intent('Turn OnOff', (conv, params) => {
  logger.info(`Turn OnOff: params: ${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  // Repeating user input
  if (game.handleRepeatRaws(conv)) {
    return;
  }
  game.handleOnOffParams(conv, params);
});

// Dialogflow intent handler.
app.intent('Flip', (conv, params) => {
  logger.info(`Flip: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'flip';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use', [], []);
  }
  game.handleFlip(conv, params);
});

// Dialogflow intent handler.
app.intent('Where', (conv, params) => {
  logger.info(`Where: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'where';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use', [], []);
  }
  game.handleWhere(conv, params);
});

// Dialogflow intent handler.
app.intent('How Many', (conv, params) => {
  logger.info(`How Many: params=${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  let item = params.item;
  if (!item) {
    conv.data.slot = 'howMany';
    game.setContext(conv, 'slot_item', 1);
    if (conv.data.currentRoom) {
      return game.handleSlotFilling(conv, 'slot_filling_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
    }
    return game.handleSlotFilling(conv, 'slot_filling_use', [], []);
  }
  game.handleHowMany(conv, params);
});

// Dialogflow intent handler.
app.intent('Items', (conv) => {
  logger.info('Items');
  if (game.inLobby(conv)) {
    return;
  }
  if (conv.data.currentRoom) {
    const items = [];
    conv.user.storage.rooms[conv.data.currentRoom].foundItems.forEach((item) => {
      if (game.VOWELS.indexOf(item.charAt(0)) === -1) {
        items.push(`a ${item}`);
      } else {
        items.push(`an ${item}`);
      }
    });
    game.ask(conv, `${utils.getRandomPrompt(conv, 'confirmation')}`, `${util.format(utils.getRandomPrompt(conv, 'items'), utils.makeOxfordCommaList(items, 'and'))}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
  } else {
    game.ask(conv, null, `${game.makeRoomPromptResponse(conv)}`);
  }
  game.askSuggestions(conv);
});

// Dialogflow intent handler.
app.intent('Easter Egg', (conv) => {
  logger.info('Easter Egg');
  if (game.hasContext(conv, 'lobby')) {
    return game.lobby(conv, false, `${utils.getRandomPrompt(conv, 'easter_egg')} ${utils.getRandomPrompt(conv, 'lobby_pick')}`);
  }
  game.askSuggestions(conv);
  game.ask(conv, null, `${utils.getRandomPrompt(conv, 'easter_egg')} ${game.makeRoomPromptResponse(conv)}`);
});

// Dialogflow intent handler.
app.intent('Which Tool', (conv) => {
  logger.info('Which Tool');
  if (game.inLobby(conv)) {
    return;
  }
  game.askSuggestions(conv);
  game.ask(conv, null, `${utils.getRandomPrompt(conv, 'help_tool')}`);
});

// Dialogflow intent handler.
app.intent('Boring', (conv) => {
  logger.info('Boring');
  if (game.inLobby(conv)) {
    return;
  }
  if (conv.user.storage.boring) {
    game.handleCancel(conv);
    return;
  }
  conv.user.storage.boring = true;
  game.askSuggestions(conv);
  game.ask(conv, null, `${utils.getRandomPrompt(conv, 'boring')}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
});

// Dialogflow intent handler.
app.intent('Magnificent', (conv) => {
  logger.info('Magnificent');
  if (game.inLobby(conv)) {
    return;
  }
  game.askSuggestions(conv);
  game.ask(conv, null, `${utils.getRandomPrompt(conv, 'agree')}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
});

// Dialogflow intent handler.
app.intent('Answer My Question', (conv) => {
  logger.info('Answer My Question');
  if (game.inLobby(conv)) {
    return;
  }
  game.askSuggestions(conv);
  game.ask(conv, null, `${utils.getRandomPrompt(conv, 'answer')}`);
});

// Dialogflow intent handler.
app.intent('Bad', (conv) => {
  logger.info('Bad');
  if (game.inLobby(conv)) {
    return;
  }
  game.askSuggestions(conv);
  game.ask(conv, null, `${utils.getRandomPrompt(conv, 'bad')}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
});

// Dialogflow intent handler.
app.intent('Language', (conv, params) => {
  logger.info(`Language: ${JSON.stringify(params)}`);
  if (game.hasContext(conv, 'lobby')) {
    game.ask(conv, null, `${utils.getRandomPrompt(conv, 'language')}`);
    game.lobby(conv, false);
  } else {
    game.askSuggestions(conv);
    game.ask(conv, null, `${utils.getRandomPrompt(conv, 'language')}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
  }
});

// Dialogflow intent handler.
app.intent('Bla', (conv, params) => {
  logger.info(`Bla: ${JSON.stringify(params)}`);
  if (game.hasContext(conv, 'lobby')) {
    game.ask(conv, null, `${utils.getRandomPrompt(conv, 'bla')}`);
    game.lobby(conv, false);
  } else {
    game.askSuggestions(conv);
    game.ask(conv, null, `${utils.getRandomPrompt(conv, 'bla')}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
  }
});

// Dialogflow intent handler.
app.intent('Escape', (conv) => {
  logger.info('Escape');
  if (game.inLobby(conv)) {
    return;
  }
  game.askSuggestions(conv);
  game.ask(conv, null, `${utils.getRandomPrompt(conv, 'why')}<break time="${game.BREAK_NEXT}"/>${game.nextMovePrompt(conv)}`);
});

// Dialogflow intent handler.
app.intent('Hello', (conv) => {
  logger.info('Hello');
  if (game.inLobby(conv)) {
    return;
  }
  game.askSuggestions(conv);
  game.ask(conv, null, `${utils.getRandomPrompt(conv, 'hello')}<break time="${game.BREAK_LONG}"/>${game.nextMovePrompt(conv)}`);
});

// Dialogflow intent handler.
app.intent('Forget', (conv, params) => {
  logger.info(`Forget: ${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  // Repeating user input
  if (game.handleRepeatRaws(conv)) {
    return;
  }
  game.askSuggestions(conv);
  game.ask(conv, null, `${utils.getRandomPrompt(conv, 'ok')}<break time="${game.BREAK_LONG}"/>${game.nextMovePrompt(conv)}`);
});

// Dialogflow intent handler.
app.intent('Ok', (conv, params) => {
  logger.info(`Ok: ${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  // Repeating user input
  if (game.handleRepeatRaws(conv)) {
    return;
  }
  game.askSuggestions(conv);
  game.ask(conv, null, `${game.nextMovePrompt(conv)}`);
});

// Dialogflow intent handler.
app.intent('Ready', (conv, params) => {
  logger.info(`Ready: ${JSON.stringify(params)}`);
  if (game.inLobby(conv)) {
    return;
  }
  // Repeating user input
  if (game.handleRepeatRaws(conv)) {
    return;
  }
  game.askSuggestions(conv);
  game.ask(conv, utils.getRandomPrompt(conv, 'confirmation'), `${utils.getRandomPrompt(conv, 'take_time_welcome')}<break time="${game.BREAK_LONG}"/>${game.nextMovePrompt(conv)}`);
});

// Fallback function for any intents that don't have handlers.
app.fallback((conv) => {
  logger.info(`fallback: ${conv.intent}`);
  game.fallback(conv);
});

// Catch any exceptions using the client library.
app.catch((conv, e) => {
  logger.error(e);
  conv.close(`Oops. Something went wrong. Please try again later.`);
});

exports.fulfillment = app;
