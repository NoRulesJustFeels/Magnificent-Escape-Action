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
 * Functions for managing the game logic and state.
 */

// Logging dependencies
const logger = require('winston').loggers.get('DEFAULT_LOGGER');

const Analytics = require('./analytics');
const analytics = new Analytics(process.env.GOOGLE_ANALYTICS_TRACKING_ID);

const Filter = require('bad-words');
const filter = new Filter();

// Node util module used for creating dynamic strings
const util = require('util');

// Import the Dialogflow module from the Actions on Google client library.
// https://github.com/actions-on-google/actions-on-google-nodejs
const {Button, Suggestions, MediaObject, List, Image, SimpleResponse, BasicCard} = require('actions-on-google');

// Utility functions.
const utils = require('./utils');
// Load all the user prompts.
const prompts = require('./prompts').prompts;
// Load the room data.
const ROOMS = require('./rooms').ROOMS;

// Store a dictionary of words found in the descriptions of each room.
// Used for matching user input to things located in a room.
const dictionaries = utils.generateDictionaries(ROOMS);

module.exports = {
  // States for switches.
  ON_OFF: ['on', 'off'],
  // Limit how many hints you can ask for; high for now; adjust lower to affect gameplay.
  HINT_MAX: 1000,

  // Suggestion chips to let the user pick options on screens.
  // https://developers.google.com/actions/assistant/responses#suggestion_chip
  suggestionsExit: new Suggestions('Exit'),
  suggestionsExitStats: new Suggestions('Exit', 'Stats'),
  suggestionsExitRate: new Suggestions('Exit', 'Rate', 'Stats'),
  suggestionsHelpLobbyExit: ['help', 'lobby', 'exit'],
  suggestionsHintHelpLobbyExit: ['hint', 'help', 'lobby', 'exit'],
  suggestionsLobbyExit: new Suggestions('Lobby', 'Exit'),

  // Suggestion chips to let the user pick options on screens.
  // https://developers.google.com/actions/assistant/responses#suggestion_chip
  suggestionsDirections: ['look north', 'look south', 'look east', 'look west', 'look up', 'look down'],
  suggestionsLeftRight: ['turn left', 'turn right'],

  // Various sounds used in the SSML responses.
  BACKGROUND_MUSIC: [
    'https://actions.google.com/sounds/v1/ambiences/warm_evening_outdoors.ogg',
  ],

  INVALID_SOUNDS: [
    'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg',
  ],

  FAILED_SOUNDS: [
    'https://actions.google.com/sounds/v1/cartoon/cartoon_cowbell.ogg',
  ],

  CODE_SOUNDS: [
    'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
  ],

  CONFIRMATION_SOUNDS: [
    'https://actions.google.com/sounds/v1/foley/swoosh.ogg',
  ],

  REWARD_SOUNDS: [
    'https://actions.google.com/sounds/v1/alarms/bugle_tune.ogg',
  ],

  // The name of the action used in the welcome prompt.
  NAME: 'Magnificent Escape',

  // Items in every room.
  DEFAULT_ITEMS: ['wall', 'ceiling', 'floor'],

  // State to give the user more time by playing some music.
  MORE_TIME: ['more time'],

  // Default lifetime for Dialogflow intent contexts.
  CONTEXT_LIFETIME: 3,

  // JSON data about all the game rooms.
  ROOMS: ROOMS,

  // All the response prompts.
  prompts: prompts,

  analytics: analytics,

  // SSML break values for pacing the TTS responses.
  BREAK_NEXT: '0.8s',
  BREAK_LONG: '1.0s',
  SSML_BREAK_SHORT: '<break time="700ms"/>',

  // Vowels to build proper grammatical responses.
  VOWELS: ['a', 'e', 'i', 'o', 'u'],
  // All the directions the user can look in a room.
  DIRECTIONS: ['north', 'south', 'east', 'west', 'up', 'down'],
  // Intermediate directions that are mnot supported.
  OTHER_DIRECTIONS: ['northeast', 'southeast', 'southwest', 'northwest'],
  // Compass to orient the user when turning left/right.
  COMPASS: ['north', 'east', 'south', 'west'],
  // Orientations relative to current direction.
  ORIENTATIONS: ['left', 'right', 'forwards', 'backwards'],
  // Possible sides of items the user can investigate.
  SIDES: ['below', 'under', 'inside', 'left', 'behind', 'right', 'above'],

  // ID for the game lobby.
  LOBBY: 'lobby',

  // Track experiments.
  RUN_EXPERIMENT: false,
  // eslint-disable-next-line no-unused-vars
  EXPERIMENT_PLAY_GAME_INTRO_NONE: 'experimentPlayGameIntroNone',
  // eslint-disable-next-line no-unused-vars
  EXPERIMENT_PLAY_GAME_INTRO: 'experimentPlayGameIntro',

  HEALTH_CHECK_ARGUMENT: 'is_health_check',

  // Keep track of items in the room.
  addItems: (conv, array, items) => {
    let added = false;
    if (items && conv.data.currentRoom) {
      if (!conv.user.storage.rooms[conv.data.currentRoom][array]) {
        conv.user.storage.rooms[conv.data.currentRoom][array] = [];
      }
      items.forEach((item) => {
        if (!conv.user.storage.rooms[conv.data.currentRoom][array].includes(item)) {
          added = true;
          conv.user.storage.rooms[conv.data.currentRoom][array].unshift(item);
        } else {
          // Re-add to beginning
          const index = conv.user.storage.rooms[conv.data.currentRoom][array].indexOf(item);
          conv.user.storage.rooms[conv.data.currentRoom][array].splice(index, 1);
          conv.user.storage.rooms[conv.data.currentRoom][array].unshift(item);
        }
      });
      logger.info(`addItems: added=${added}, items=${items}`);
    }
    return added;
  },

  // Remove items found in the room.
  removeItems: (conv, array, items) => {
    let removed = false;
    if (items && conv.data.currentRoom) {
      if (!conv.user.storage.rooms[conv.data.currentRoom][array]) {
        conv.user.storage.rooms[conv.data.currentRoom][array] = [];
      }
      items.forEach((item) => {
        const index = conv.user.storage.rooms[conv.data.currentRoom][array].indexOf(item);
        if (index !== -1) {
          removed = true;
          conv.user.storage.rooms[conv.data.currentRoom][array].splice(index, 1);
        }
      });
      logger.info(`removeItems: removed=${removed}, items=${items}`);
    }
    return removed;
  },

  // Give the user a reward.
  giveReward: (conv, prompt, isRoomPrompt) => {
    logger.info(`giveReward: prompt=${prompt}`);
    if (conv.data.currentRoom && module.exports.ROOMS[conv.data.currentRoom].rewards) {
      let index = 0;
      let hint = null;
      for (let reward of module.exports.ROOMS[conv.data.currentRoom].rewards) {
        if (!conv.user.storage.rooms[conv.data.currentRoom].rewards) {
          conv.user.storage.rooms[conv.data.currentRoom].rewards = [];
        }
        if (!conv.user.storage.rooms[conv.data.currentRoom].rewards.includes(index)) {
          for (let action of reward.actions) {
            if (action.type.includes('look')) { // look at item
              for (let item of action.items) {
                if (conv.data.currentItem === item) {
                  hint = utils.getRandomItem(reward.description);
                }
              }
            } else if (action.type.includes('direction')) {
              for (let value of action.values) {
                if (conv.data.currentDirection === value) {
                  hint = utils.getRandomItem(reward.description);
                }
              }
            }
            if (hint) {
              break;
            }
          }
        }
        if (hint) {
          logger.info(`hint=${hint}`);
          conv.user.storage.rooms[conv.data.currentRoom].rewards.push(index);
          if (!conv.user.storage.rooms[conv.data.currentRoom].hints) {
            conv.user.storage.rooms[conv.data.currentRoom].hints = [];
          }
          conv.user.storage.rooms[conv.data.currentRoom].hints.unshift(hint);
          break;
        }
        index++;
      }

      if (hint) {
        conv.reward = true;
        if (!prompt) {
          prompt = module.exports.makeRoomPromptResponse(conv);
        }
        if (!conv.user.storage.reward_hint) {
          conv.user.storage.reward_hint = true;
          module.exports.soundResponse(conv, `${utils.getRandomPrompt(conv, 'confirmation_encouragement')} ${utils.getRandomPrompt(conv, 'reward1')}<break time="${module.exports.BREAK_LONG}"/>`, module.exports.REWARD_SOUNDS);
          if (isRoomPrompt) {
            module.exports.ask(conv, null, `${prompt}`);
          } else {
            module.exports.ask(conv, null, `${utils.getRandomItem(prompt)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
          }
          return true;
        } else {
          module.exports.soundResponse(conv, `${utils.getRandomPrompt(conv, 'confirmation_encouragement')} ${utils.getRandomPrompt(conv, 'reward')}<break time="${module.exports.BREAK_LONG}"/>`, module.exports.REWARD_SOUNDS);
          if (isRoomPrompt) {
            module.exports.ask(conv, null, `${prompt}`);
          } else {
            module.exports.ask(conv, null, `${utils.getRandomItem(prompt)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
          }
          return true;
        }
      }
    }
    return false;
  },

  // Add items found by the user.
  addFoundItems: (conv, items) => {
    if (items && conv.data.currentRoom && conv.data.currentDirection) {
      for (let item of items) {
        conv.user.storage.rooms[conv.data.currentRoom].foundItemsDirections[item] = conv.data.currentDirection;
      }
    }
    return module.exports.addItems(conv, 'foundItems', items);
  },

  // Track directions used by the user.
  addFoundDirections: (conv, items) => {
    return module.exports.addItems(conv, 'foundDirections', items);
  },

  // Track items the user looked at.
  addLookedItems: (conv, items) => {
    return module.exports.addItems(conv, 'lookedItems', items);
  },

  // Track items the user collected and added to the inventory.
  addCollectedItems: (conv, items) => {
    return module.exports.addItems(conv, 'collectedItems', items);
  },

  // Track items removed from the inventory.
  removeCollectedItems: (conv, items) => {
    return module.exports.removeItems(conv, 'collectedItems', items);
  },

  // Track items dropped on the floor.
  addDroppedItems: (conv, items) => {
    return module.exports.addItems(conv, 'droppedItems', items);
  },

  // Utility to create a response with appropriate sounds and considering contexts.
  ask: (conv, confirmation, response, ignore) => {
    if (conv.data.currentRoom) {
      conv.speechBiasing = module.exports.generateSpeechBiasing(conv.data.currentRoom);
    }
    if (typeof response === 'string' && !response.startsWith('<speak>')) {
      let prompt = confirmation ? `${confirmation} ${response}` : response;
      if (!ignore) {
        conv.data.lastResponse = response;
      } else {
        conv.data.lastResponse = null;
      }
      if (!conv.reward && !conv.hasSound && !response.startsWith('<audio') && !module.exports.hasContext(conv, 'lobby')) {
        conv.hasSound = true;
        module.exports.soundResponse(conv, `<speak>${prompt}</speak>`, module.exports.CONFIRMATION_SOUNDS);
      } else {
        return conv.ask(`<speak>${prompt}</speak>`, );
      }
    } else {
      if (!conv.reward && !conv.hasSound && !module.exports.hasContext(conv, 'lobby')) {
        conv.hasSound = true;
        module.exports.soundResponse(conv, confirmation ? `${confirmation} ${response}` : response, module.exports.CONFIRMATION_SOUNDS);
      } else {
        return conv.ask(confirmation ? `${confirmation} ${response}` : response);
      }
    }
  },

  // Generate speech biasing hints to improve NLU.
  // Use directions and items in the current room.
  generateSpeechBiasing: (roomKey) => {
    logger.info(`generateSpeechBiasing: ${roomKey}`);
    const speechBiasing = [];
    const room = module.exports.ROOMS[roomKey];
    const directionKeys = Object.keys(room.directions);
    for (const directionKey of directionKeys) {
      logger.debug(`directionKey=${directionKey}`);
      speechBiasing.push(directionKey);
    }
    const stuffKeys = Object.keys(room.stuff);
    for (const stuffKey of stuffKeys) {
      logger.debug(`stuffKey=${stuffKey}`);
      speechBiasing.push(stuffKey);
    }
    logger.debug(`speechBiasing=${JSON.stringify(speechBiasing)}`);
    return speechBiasing;
  },

  // Create SSML for TTS and sounds.
  // https://developers.google.com/actions/reference/ssml
  soundResponse: (conv, response, sounds, end) => {
    // Track previous response, but remove <break> tags.
    conv.data.lastResponse = response.replace(/<[^>]*>/g, ' ');
    if (end) {
      return conv.ask(new SimpleResponse({
        speech: `<speak>
          <par>
            <media xml:id="prompt" begin="0.0s">
              <speak>${response}</speak>
            </media>
            <media xml:id="sound" begin="prompt.end+0.5s" soundLevel="0dB">
              <audio
                src="${utils.getRandomItem(sounds)}"/>
            </media>
          </par>
        </speak>`,
        text: `${conv.data.lastResponse}`,
      }));
    }
    return conv.ask(new SimpleResponse({
      speech: `<speak>
        <par>
          <media xml:id="sound" begin="0.0s" soundLevel="0dB">
            <audio
              src="${utils.getRandomItem(sounds)}"/>
          </media>
          <media xml:id="prompt" begin="sound.end+0.5s">
            <speak>${response}</speak>
          </media>
        </par>
      </speak>`,
      text: `${conv.data.lastResponse}`,
    }));
  },

  // Generate an invalid response with sound effect.
  invalidResponse: (conv, response) => {
    logger.debug(`invalidResponse: response=${response}`);
    if (conv.data.invalidCount) {
      let invalidCount = parseInt(conv.data.invalidCount);
      conv.data.invalidCount = invalidCount + 1;
    } else {
      conv.data.invalidCount = 1;
    }
    return module.exports.soundResponse(conv, response, module.exports.INVALID_SOUNDS);
  },

  // Generate a failed response with sound effect.
  failedResponse: (conv, response) => {
    logger.debug(`failedResponse: response=${response}`);
    if (conv.data.failedCount) {
      let failedCount = parseInt(conv.data.failedCount);
      conv.data.failedCount = failedCount + 1;
    } else {
      conv.data.failedCount = 1;
    }
    return module.exports.soundResponse(conv, response, module.exports.FAILED_SOUNDS);
  },

  // Generate a code response with sound effect.
  codeResponse: (conv, response) => {
    logger.debug(`codeResponse: response=${response}`);
    return module.exports.soundResponse(conv, response, module.exports.CODE_SOUNDS, true);
  },

  // Delete the contexts used by Dialogflow for matching intents.
  deleteContext: (conv, context) => {
    logger.info(`deleteContext: context=${context}`);
    if (!conv.deletedContexts) {
      conv.deletedContexts = [];
    }
    conv.deletedContexts.push(context);
    conv.contexts.delete(context);
  },

  // Check if an intent exists for matching Dialogflow intents.
  hasContext: (conv, context) => {
    logger.info(`hasContext: context=${context}`);
    if (conv.deletedContexts) {
      if (conv.deletedContexts.includes(context)) {
        logger.info('hasContext: false');
        return false;
      }
    }
    return conv.contexts.get(context);
  },

  // Check if the user has found any items in the current room.
  hasFoundItems: (conv) => {
    if (conv.data.currentRoom && conv.user.storage.rooms[conv.data.currentRoom].foundItems.length > 0) {
      for (let item of conv.user.storage.rooms[conv.data.currentRoom].foundItems) {
        // Ignore special items.
        if (!module.exports.DEFAULT_ITEMS.includes(item) && !module.exports.MORE_TIME.includes(item)) {
          return true;
        }
      }
    }
    return false;
  },

  // Map a item name to named things in the current room.
  mapToFoundItem: (conv, item) => {
    if (item) {
      if (conv.data.currentRoom && conv.user.storage.rooms[conv.data.currentRoom].foundItems.length > 0) {
        for (let foundItem of conv.user.storage.rooms[conv.data.currentRoom].foundItems) {
          let words = foundItem.split(' ');
          for (let word of words) {
            if (item === word) {
              return foundItem;
            }
          }
        }
      }
    }
    return item;
  },

  // Adjust the direction based on the current item the user is inspecting.
  adjustDirectionForItem: (conv, item) => {
    if (item && conv.data.currentRoom && !conv.user.storage.rooms[conv.data.currentRoom].collectedItems.includes(item)) {
      let direction = conv.user.storage.rooms[conv.data.currentRoom].foundItemsDirections[item];
      if (direction) {
        logger.info(`adjusted direction to: ${direction}`);
        conv.data.currentDirection = direction;
      }
    }
  },

  // Change the state of the item based on the user interaction.
  addState: (conv, item, state) => {
    logger.info(`addState: item=${item}, state=${JSON.stringify(state)}`);
    if (conv.data.currentRoom && item && state) {
      if (state === 'look') {
        return;
      }
      // Initialize the states for the item.
      if (!conv.user.storage.rooms[conv.data.currentRoom].states[item]) {
        conv.user.storage.rooms[conv.data.currentRoom].states[item] = [];
      }
      // Ignore if the item state already exists.
      for (let currentState of conv.user.storage.rooms[conv.data.currentRoom].states[item]) {
        if (currentState.action === state.action) {
          return;
        }
      }
      conv.user.storage.rooms[conv.data.currentRoom].states[item].push(state);
    }
  },

  // Remove the state associated with an item.
  removeState: (conv, item, action) => {
    logger.info(`removeState: item=${item}, action=${action}`);
    if (conv.data.currentRoom && item) {
      if (action) {
        // Iterate all states of the item.
        for (let i = 0; i < conv.user.storage.rooms[conv.data.currentRoom].states[item].length; i++) {
          let state = conv.user.storage.rooms[conv.data.currentRoom].states[item][i];
          // State action need to match.
          if (state.action && state.action === action) {
            conv.user.storage.rooms[conv.data.currentRoom].states[item].splice(i, 1);
            return;
          }
        }
      } else {
        delete conv.user.storage.rooms[conv.data.currentRoom].states[item];
      }
    }
  },

  // Get the state of item.
  getState: (conv, item, action) => {
    logger.info(`getState: item=${item}, action=${action}`);
    if (action === 'look') {
      action = null;
    }
    if (conv.data.currentRoom && item) {
      if (conv.user.storage.rooms[conv.data.currentRoom].states[item]) {
        if (action) {
          for (let state of conv.user.storage.rooms[conv.data.currentRoom].states[item]) {
            // State action needs to match.
            if (state.action && state.action === action) {
              return state;
            }
          }
        } else {
          return conv.user.storage.rooms[conv.data.currentRoom].states[item][0];
        }
      }
    }
    return null;
  },

  // Determine if a particular item state exists.
  hasState: (conv, state) => {
    logger.info(`hasState: state=${JSON.stringify(state)}`);
    if (conv.data.currentRoom && state && state.item1) {
      if (conv.user.storage.rooms[conv.data.currentRoom].states[state.item1]) {
        logger.debug(`hasState: states=${JSON.stringify(conv.user.storage.rooms[conv.data.currentRoom].states[state.item1])}`);
        for (let currentState of conv.user.storage.rooms[conv.data.currentRoom].states[state.item1]) {
          logger.debug(`hasState: currentState=${JSON.stringify(currentState)}`);
          const actions = state.action.split(',');
          logger.debug(`hasState: actions=${JSON.stringify(actions)}`);
          if (actions.includes(currentState.action)) {
            if (state.item2 && currentState.item2 && state.item2 === currentState.item2) {
              return true;
            } else if (!state.item2 && !currentState.item2) {
              return true;
            }
          }
        }
      }
    }
    return false;
  },

  // Reset all the variables for tracking the room state and data.
  resetRoom: (conv, room) => {
    logger.info(`resetRoom: ${room}`);
    if (room !== null) {
      conv.user.storage.rooms[room] = {
        // Track the items found by the user.
        foundItems: module.exports.DEFAULT_ITEMS,
        // Track the direction of each found item.
        foundItemsDirections: {},
        // Track the directions user looked.
        foundDirections: [],
        // Track the items the user looked at.
        lookedItems: [],
        // Track the items the user collected.
        collectedItems: [],
        // Track the items the users dropped.
        droppedItems: [],
        // Track the rewards the user earned.
        rewards: [],
        // Track item states.
        states: {},
        start: Date.now(),
        // Count the number of turns in conversation.
        count: 0,
        // Track if a secret was found.
        secret: false,
        // Track if the user won the room.
        win: false,
        // Track if the user lost the room.
        lose: false,
        // Track time spent in the room.
        duration: 0,
        // Track if the user got a room hint.
        help_room_hint: false,
        // Track the hints given to the user.
        hints: [],
      };
    }
  },

  // Reset all the data associated with the game logic and user.
  reset: (conv) => {
    // The room ID of the current room (see rooms.js)
    conv.data.currentRoom = null;
    // The current direction the user is looking.
    conv.data.currentDirection = null;
    // The item the user is interacting with.
    conv.data.currentItem = null;
    // Track the current step in the multi-step solution.
    conv.data.solutionIndex = 0;
    // The steps needed for a multi-step solution (like multiple turns for opening a safe).
    conv.data.solution = null;
    // Track how many times the user got a hint.
    conv.data.hinted = 0;
    // Count how many times the user looked at things in the room.
    conv.data.lookCount = 0;
    if (!conv.user.storage) {
      conv.user.storage = {};
    }
    // Initialize various data about the user and game state.
    if (!conv.user.storage['init']) {
      conv.user.storage.init = true;
      // Give the user an ID.
      conv.user.storage.uuid = utils.generateUUID();
      // Track when the user started playing the module.exports.
      conv.user.storage.date = Date.now();
      // Track if various kinds of help was given to the user to avoid duplication.
      conv.user.storage.help_item = false;
      conv.user.storage.help_use = false;
      conv.user.storage.help_hint = false;
      conv.user.storage.help_inventory = false;
      conv.user.storage.help_more_time = false;
      conv.user.storage.help_look_count = false;
      conv.user.storage.help_walls = false;
      // Track if the user said a bad word to influence reprompts.
      conv.user.storage.first_bad_word = false;
      // Track variations on the quit message.
      conv.user.storage.quit_encourage = false;
      conv.user.storage.quit_first = false;
      conv.user.storage.quit_easter_egg = false;
      // Track if various kinds of hints were given to the user.
      conv.user.storage.turn_hint = false;
      conv.user.storage.reward_hint = false;
      // Track the rooms the user visited.
      conv.user.storage.rooms = {};
      // Track the game results for each room.
      conv.user.storage.roomResults = {};
      // Initialize the data for each room for this user.
      let roomKeys = Object.keys(module.exports.ROOMS);
      for (let key of roomKeys) {
        module.exports.resetRoom(conv, key);
      }
      logger.info(`conv.user.storage=${JSON.stringify(conv.user.storage)}`);
    }
  },

  // Determine if the user is currently in the game lobby.
  inLobby: (conv) => {
    logger.info('inLobby');
    if (module.exports.hasContext(conv, 'lobby')) {
      module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'invalid_room')}`);
      module.exports.lobby(conv, false);
      return true;
    }
    return false;
  },

  // Create a list of the options to select for a screen device.
  // https://developers.google.com/actions/assistant/responses#list
  selection: (conv, titles, descriptions, images) => {
    let items = {};
    for (let i = 0; i < titles.length; i++) {
      let key = titles[i];
      let item = {};
      item.synonyms = [key];
      // Upper case for first char
      item.title = `${key[0].toUpperCase()}${key.slice(1)}`;
      if (descriptions) {
        let description = descriptions[i];
        item.description = `${description[0].toUpperCase()}${description.slice(1)}`;
      }
      if (images) {
        let image = images[i];
        item.image = new Image({url: image, alt: item.title});
      }
      items[key] = item;
    }
    conv.ask(new List({
      items: items,
    }));
  },

  // Generate a prompt for the game lobby.
  // List the rooms and provide some suggestions.
  lobby: (conv, welcome, alternatePrompt, noListPrompt) => {
    let rooms = [];
    let levels = [];
    let images = [];
    let roomKeys = Object.keys(module.exports.ROOMS);
    for (let key of roomKeys) {
      let room = module.exports.ROOMS[key];
      rooms.push(room.name[0]);
      levels.push(`${room.level || 'easy'}`);
      let image = room.image;
      if (conv.user.storage.roomResults && conv.user.storage.roomResults[key]) {
        if (conv.user.storage.roomResults[key].secret && conv.user.storage.roomResults[key].win) {
          image = room.imageEasterEggWin;
        } else if (conv.user.storage.roomResults[key].win) {
          image = room.imageWin;
        } else if (conv.user.storage.roomResults[key].secret) {
          image = room.imageEasterEgg;
        }
      }
      images.push(image || 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Armchair_MET_DP256699.jpg/190px-Armchair_MET_DP256699.jpg');
    }
    let lobbyPrompt = welcome ? `${utils.getRandomItem(prompts.lobby)} ${utils.getRandomItem(prompts.lobby_pick)}` : `${utils.getRandomItem(prompts.lobby_return)}  ${utils.getRandomItem(prompts.lobby_pick)}`;
    if (alternatePrompt) {
      lobbyPrompt = alternatePrompt;
    }
    let voicePrompt = `${lobbyPrompt}`;
    if (conv.voice) {
      voicePrompt = `${lobbyPrompt}${module.exports.SSML_BREAK_SHORT}${util.format(utils.getRandomPrompt(conv, 'rooms'), utils.makeOxfordCommaList(rooms, 'and'))} ${utils.getRandomPrompt(conv, 'which_room')}`;
      if (!conv.user.last.seen) {
        voicePrompt = `${utils.getRandomItem(prompts.lobby)}${module.exports.SSML_BREAK_SHORT}${util.format(utils.getRandomPrompt(conv, 'lobby_easy'), rooms[1], rooms[2], rooms[0])}<break time="${module.exports.BREAK_NEXT}"/>${utils.getRandomPrompt(conv, 'which_room')}`;
      }
    }
    if (welcome) {
      // Welcome a new user.
      if (!conv.user.last.seen) {
        conv.ask(new SimpleResponse({
          speech: `<speak>
            <par>
              <media xml:id="playIntro" begin="0.0s">
                <speak><voice gender="female"><emphasis level="strong">Here's the top pick, just for you!</emphasis></voice></speak>
              </media>
              <media xml:id="introSound" begin="playIntro.end+1.0s" soundLevel="0dB">
                <speak>Welcome to ${module.exports.NAME}. In this game you have to escape a room. Follow the clues and use items to find a way out.</speak>
              </media>
              <media xml:id="intro" begin="introSound.end+1.0s">
                <speak>${voicePrompt}</speak>
              </media>
            </par>
          </speak>`,
          text: `${utils.getRandomItem(prompts.welcome)} ${utils.getRandomPrompt(conv, 'intro')} ${lobbyPrompt}`,
        }));
        conv.ask(module.exports.suggestionsExit);
      } else {
        // Welcome back an existing user.
        conv.ask(new SimpleResponse({
          speech: `<speak>
            <par>
              <media xml:id="introSound" begin="0.0s" soundLevel="0dB">
                <speak>Welcome back to ${module.exports.NAME}.</speak>
              </media>
              <media xml:id="intro" begin="introSound.end+1.0s">
                <speak>${voicePrompt}</speak>
              </media>
            </par>
          </speak>`,
          text: `${utils.getRandomItem(prompts.welcome_back)} ${lobbyPrompt}`,
        }));
        conv.ask(module.exports.suggestionsExitStats);
      }
    } else {
      let rated = false;
      if (!conv.user.storage.review) {
        if (conv.user.storage.total) {
          let total = parseInt(conv.user.storage.total);
          if (total > 3) {
            conv.ask(module.exports.suggestionsExitRate);
            rated = true;
          }
        }
      }
      if (!rated) {
        conv.ask(module.exports.suggestionsExitStats);
      }
    }

    if (!welcome) {
      if (conv.voice && !noListPrompt) {
        module.exports.ask(conv, null, `${lobbyPrompt} ${util.format(utils.getRandomPrompt(conv, 'rooms'),
          utils.makeOxfordCommaList(rooms, 'and'))} ${utils.getRandomPrompt(conv, 'which_room')}`);
      } else {
        module.exports.ask(conv, null, `${lobbyPrompt}`);
      }
    }
    // Show a list of options on a screen.
    if (conv.screen) {
      module.exports.selection(conv, rooms, levels, images);
    }
    module.exports.setContext(conv, 'lobby', module.exports.CONTEXT_LIFETIME);
  },

  handleCancel: (conv) => {
    const duration = module.exports.doTime(conv);
    module.exports.analytics.cancelDuration(conv.user.storage.uuid, conv.data.currentRoom, duration);
    // quit_encourage
    if (!conv.user.storage.quit_encourage && conv.data.currentRoom && conv.user.storage.rooms[conv.data.currentRoom].foundDirections.length >= 4) {
      conv.user.storage.quit_encourage = true;
      return conv.close(utils.getRandomPrompt(conv, 'quit_encourage'));
    }
    if (!conv.user.storage.quit_first) {
      conv.user.storage.quit_first = true;
      return conv.close(utils.getRandomPrompt(conv, 'quit_first'));
    }
    if (conv.data.currentRoom && !conv.user.storage.rooms[conv.data.currentRoom].secret && !conv.user.storage.quit_easter_egg &&
         conv.user.storage.rooms[conv.data.currentRoom].count && conv.user.storage.rooms[conv.data.currentRoom].count > 10) {
      conv.user.storage.quit_easter_egg = true;
      return conv.close(utils.getRandomPrompt(conv, 'quit_easter_egg'));
    }
    if (conv.screen) {
      if (conv.data.playGame) {
        conv.close(new SimpleResponse({
          speech: `<speak>${utils.getRandomPrompt(conv, 'quit_talk')}</speak>`,
          text: `Okay, let's try this again later.`,
        }));
      } else {
        conv.close(new SimpleResponse({
          speech: `<speak>${utils.getRandomPrompt(conv, 'quit')}</speak>`,
          text: `Okay, let's try this again later.`,
        }));
      }
    } else {
      if (conv.data.playGame) {
        conv.close(new SimpleResponse({
          speech: `<speak>${utils.getRandomPrompt(conv, 'quit_talk')}</speak>`,
          text: `Okay, let's try this again later.`,
        }));
      } else {
        conv.close(new SimpleResponse({
          speech: `<speak>${utils.getRandomPrompt(conv, 'quit')}</speak>`,
          text: `Okay, let's try this again later.`,
        }));
      }
    }
  },

  // Utility to generate suggestions for the response.
  askSuggestions: (conv, suggestions) => {
    logger.info(`askSuggestions: suggestions=${suggestions}`);
    if (conv.data.currentRoom) {
      if ((module.exports.hasContext(conv, 'turns') || conv.data.context === 'turns') && conv.data.currentItem && module.exports.ROOMS[conv.data.currentRoom].stuff[conv.data.currentItem]) {
        for (let act of module.exports.ROOMS[conv.data.currentRoom].stuff[conv.data.currentItem].actions) {
          if (act.type && act.type.includes('turns')) {
            suggestions = module.exports.suggestionsLeftRight;
          }
        }
      }

      if (conv.user.storage.rooms[conv.data.currentRoom].hints && conv.user.storage.rooms[conv.data.currentRoom].hints.length > 0) {
        if (suggestions) {
          return conv.ask(new Suggestions(suggestions.concat(module.exports.suggestionsHintHelpLobbyExit).slice(0, 7)));
        } else {
          return conv.ask(new Suggestions(module.exports.suggestionsHintHelpLobbyExit.slice(0, 7)));
        }
      }
    }
    if (suggestions) {
      conv.ask(new Suggestions(suggestions.concat(module.exports.suggestionsHelpLobbyExit).slice(0, 7)));
    } else {
      conv.ask(new Suggestions(module.exports.suggestionsHelpLobbyExit.slice(0, 7)));
    }
  },

  // Provide a response for the user requesting help.
  handleHelp: (conv, confirmation) => {
    if (!confirmation) {
      module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'gentle_confirmation')}`);
    } else {
      module.exports.ask(conv, null, `${confirmation}`);
    }
    module.exports.askSuggestions(conv);
    if (module.exports.hasContext(conv, 'which_direction')) {
      module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'help_direction')}`);
    } else {
      module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'help')}`);
    }
  },

  handleHint: (conv, alternatePrompt) => {
    logger.info(`handleHint: alternatePrompt=${alternatePrompt}`);
    if (module.exports.hasContext(conv, 'lobby')) {
      if (alternatePrompt) {
        return module.exports.lobby(conv, false, `${alternatePrompt} ${utils.getRandomPrompt(conv, 'lobby_help')}`, true);
      } else {
        return module.exports.lobby(conv, false, `${utils.getRandomPrompt(conv, 'confirmation')} ${utils.getRandomPrompt(conv, 'lobby_help')}`, true);
      }
    }
    conv.user.storage.help_hint = true;
    let hinted = parseInt(conv.data.hinted);
    conv.data.hinted = hinted + 1;

    if (conv.data.hinted > module.exports.HINT_MAX) {
      return module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'hint_limit')}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
    }

    if (conv.data.currentRoom && module.exports.ROOMS[conv.data.currentRoom].rewards) {
      if (conv.user.storage.rooms[conv.data.currentRoom].hints && conv.user.storage.rooms[conv.data.currentRoom].hints.length > 0) {
        if (alternatePrompt) {
          module.exports.ask(conv, null, `${alternatePrompt}`);
        } else {
          module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'gentle_confirmation')}`);
        }
        module.exports.askSuggestions(conv);
        module.exports.ask(conv, null, `${conv.user.storage.rooms[conv.data.currentRoom].hints.pop()}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
        conv.user.storage.rooms[conv.data.currentRoom].hinted = true;
        return;
      } else {
        module.exports.askSuggestions(conv);
        if (conv.data.currentRoom && conv.user.storage.rooms[conv.data.currentRoom].hinted) {
          return module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'hint_limit')}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
        } else {
          return module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'hint_limit1')}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
        }
      }
    }

    if (module.exports.hasContext(conv, 'colors')) {
      module.exports.askSuggestions(conv);
      module.exports.setContext(conv, 'colors', module.exports.CONTEXT_LIFETIME);
      return module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'hint_colors')} ${utils.getRandomPrompt(conv, 'hint_colors_next')}`);
    } else if (module.exports.hasContext(conv, 'color')) {
      module.exports.askSuggestions(conv);
      module.exports.setContext(conv, 'color', module.exports.CONTEXT_LIFETIME);
      return module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'hint_color')} ${utils.getRandomPrompt(conv, 'hint_color_next')}`);
    } else if (module.exports.hasContext(conv, 'code')) {
      module.exports.askSuggestions(conv);
      module.exports.setContext(conv, 'code', module.exports.CONTEXT_LIFETIME);
      return module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'hint_code')} ${utils.getRandomPrompt(conv, 'hint_code_next')}`);
    } else if (module.exports.hasContext(conv, 'directions')) {
      module.exports.askSuggestions(conv);
      module.exports.setContext(conv, 'directions', module.exports.CONTEXT_LIFETIME);
      return module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'hint_directions')} ${utils.getRandomPrompt(conv, 'hint_directions_next')}`);
    } else if (module.exports.hasContext(conv, 'turns')) {
      module.exports.askSuggestions(conv, module.exports.suggestionsLeftRight);
      module.exports.setContext(conv, 'turns', module.exports.CONTEXT_LIFETIME);
      return module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'hint_turns')} ${utils.getRandomPrompt(conv, 'hint_turns_next')}`);
    }

    if (conv.data.currentRoom && conv.data.currentDirection) {
      if (conv.data.currentItem && module.exports.ROOMS[conv.data.currentRoom].stuff[conv.data.currentItem] && !conv.user.storage.rooms[conv.data.currentRoom].states[conv.data.currentItem]) {
        const action = module.exports.ROOMS[conv.data.currentRoom].stuff[conv.data.currentItem].action;
        if (action) {
          for (let act of action) {
            if (act.items) {
              if (!conv.user.storage.help_inventory && conv.user.storage.rooms[conv.data.currentRoom].collectedItems && conv.user.storage.rooms[conv.data.currentRoom].collectedItems.length === 0) {
                conv.user.storage.help_inventory = true;
                module.exports.askSuggestions(conv);
                return module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'hint_inventory')}`);
              } else if (!conv.user.storage.help_use) {
                conv.user.storage.help_use = true;
                module.exports.askSuggestions(conv);
                return module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'hint_action_item'), conv.data.currentItem)}`);
              }
            }
          }
          if (!conv.user.storage.help_use) {
            conv.user.storage.help_use = true;
            module.exports.askSuggestions(conv);
            return module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'hint_action'), conv.data.currentItem)}`);
          }
        }
      }

      let counter = 0;
      for (let item of conv.user.storage.rooms[conv.data.currentRoom].foundItems) {
        if ((conv.data.currentItem && conv.data.currentItem === item) || module.exports.DEFAULT_ITEMS.includes(item) || module.exorts.MORE_TIME.includes(item)) {
          continue;
        }
        if (!conv.user.storage.help_item && !conv.user.storage.rooms[conv.data.currentRoom].lookedItems.includes(item) && !conv.user.storage.rooms[conv.data.currentRoom].collectedItems.includes(item) && !conv.user.storage.rooms[conv.data.currentRoom].states[conv.data.currentItem]) {
          conv.user.storage.help_item = true;
          module.exports.askSuggestions(conv);
          return module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'hint_item'), item)}`);
        }
        if (counter++ > 1) {
          break;
        }
      }
    }

    if (conv.data.currentRoom) {
      for (let direction of module.exports.DIRECTIONS) {
        if (!conv.user.storage.rooms[conv.data.currentRoom].foundDirections.includes(direction)) {
          module.exports.askSuggestions(conv);
          return module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'hint_direction'), direction)}`);
        }
      }

      if (!conv.user.storage.help_inventory && conv.user.storage.rooms[conv.data.currentRoom].collectedItems && conv.user.storage.rooms[conv.data.currentRoom].collectedItems.length === 0) {
        conv.user.storage.help_inventory = true;
        module.exports.askSuggestions(conv);
        return module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'hint_inventory')}`);
      }

      if (module.exports.hasFoundItems(conv) && !conv.user.storage.rooms[conv.data.currentRoom].help_room_hint && module.exports.ROOMS[conv.data.currentRoom].hints) {
        conv.user.storage.rooms[conv.data.currentRoom].help_room_hint = true;
        module.exports.askSuggestions(conv);
        return module.exports.ask(conv, null, `${utils.getRandomItem(module.exports.ROOMS[conv.data.currentRoom].hints)}`);
      }
    }
    module.exports.askSuggestions(conv);
    module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'hint')}`);
  },

  // Ask the user to rate the module.exports.
  rate: (conv, close) => {
    conv.user.storage.review = true;
    let card = new BasicCard({
      text: `If you enjoy this free game, would you mind taking a moment to do a review? It won't take more than a minute. Thanks for your support! 😊`,
      title: `Review ${module.exports.NAME}`,
      buttons: new Button({
        title: 'Review it now',
        url: 'https://assistant.google.com/services/a/uid/00000047ab5fbcf8?hl=en',
      }),
    });
    if (close) {
      conv.close(card);
    } else {
      conv.ask(card);
      conv.ask(module.exports.suggestionsLobbyExit);
    }
  },

  // Play some music to delay the gameplay.
  playDelay: (conv) => {
    if (conv.data.background) {
      conv.data.background = parseInt(conv.data.background) + 1;
    } else {
      conv.data.background = 1;
    }
    // Create a media response
    // https://developers.google.com/actions/assistant/responses#media_responses
    conv.ask(new MediaObject({
      name: ` `,
      url: module.exports.BACKGROUND_MUSIC[conv.data.background % 2],
    }));
    module.exports.askSuggestions(conv);
  },

  // Play music when the user requests more time.
  doMoreTime: (conv) => {
    if (!conv.surface.capabilities.has('actions.capability.MEDIA_RESPONSE_AUDIO')) {
      module.exports.ask(conv, `${utils.getRandomPrompt(conv, 'gentle_confirmation')}`, `${utils.getRandomPrompt(conv, 'take_time')}`);
      return conv.ask(new SimpleResponse({
        speech: `<speak><audio src="https://actions.google.com/sounds/v1/ambiences/daytime_forrest_bonfire.ogg"/><break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}</speak>`,
        text: `...`,
      }));
    }
    module.exports.ask(conv, `${utils.getRandomPrompt(conv, 'gentle_confirmation')}`, `${utils.getRandomPrompt(conv, 'take_time')} ${utils.getRandomPrompt(conv, 'take_time_return')}`);
    module.exports.playDelay(conv);
  },

  // Handler for 'what do...' intent.
  handleWhatDo: (conv, params) => {
    let item = params.item;
    conv.data.slotFillingCount = 0;

    item = module.exports.mapToFoundItem(conv, item);
    if (conv.data.currentRoom && module.exports.ROOMS[conv.data.currentRoom].stuff[item] && module.exports.ROOMS[conv.data.currentRoom].stuff[item].hasOwnProperty('static') && module.exports.ROOMS[conv.data.currentRoom].stuff[item].static) {
      module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'whatdo_static')}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
    } else {
      module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'whatdo_item')}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
    }
    module.exports.askSuggestions(conv);
  },

  // Handler for 'what color...' intent.
  handleWhatColor: (conv, params) => {
    let item = params.item;
    conv.data.slotFillingCount = 0;

    item = module.exports.mapToFoundItem(conv, item);
    if (conv.data.currentRoom && module.exports.ROOMS[conv.data.currentRoom].stuff[item] && module.exports.ROOMS[conv.data.currentRoom].stuff[item].hasOwnProperty('color')) {
      module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'whatcolor_known'), item, module.exports.ROOMS[conv.data.currentRoom].stuff[item].color)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
    } else {
      module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'whatcolor_unknown'), item)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
    }
    module.exports.askSuggestions(conv);
  },

  // Handler for 'room' intent.
  handleRoom: (conv) => {
    if (conv.data.currentRoom) {
      module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'room'), utils.getRandomItem(module.exports.ROOMS[conv.data.currentRoom].name).toLowerCase())} ${utils.getRandomPrompt(conv, 'lobby_hint')}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
    } else {
      module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'room'), 'lobby')}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
    }
    module.exports.askSuggestions(conv);
  },

  // Handler for 'smell' intent.
  handleSmell: (conv, params) => {
    let item = params.item;
    conv.data.slotFillingCount = 0;

    item = module.exports.mapToFoundItem(conv, item);
    module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'smell'), item, item)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
    module.exports.askSuggestions(conv);
  },

  // Handler for 'knock' intent.
  handleKnock: (conv, params) => {
    let item = params.item;
    conv.data.slotFillingCount = 0;

    item = module.exports.mapToFoundItem(conv, item);
    module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'knock'), item)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
    module.exports.askSuggestions(conv);
  },

  // Handler for 'touch' intent.
  handleTouch: (conv, params) => {
    let item = params.item;
    conv.data.slotFillingCount = 0;

    item = module.exports.mapToFoundItem(conv, item);
    module.exports.handleSingleItemAction(conv, item);
  },

  // Utility to restart the game by resetting the game state.
  restart: (conv) => {
    module.exports.resetRoom(conv, conv.data.currentRoom);
    conv.data.currentDirection = null;
    conv.data.currentItem = null;
    conv.user.storage.walls_hint = false;
    conv.data.solutionIndex = 0;
    conv.data.solution = null;
  },

  // Generate an appropriate prompt based on the current user interaction.
  roomPrompt: (conv, value) => {
    logger.info(`roomPrompt: ${value}`);
    let action = value || 'look';

    if (conv.data.currentRoom) {
      // User is interacting with an item.
      if (conv.data.currentItem) {
        let {prompt, questioned, collected, win, lose, secret, failed, saveState} = module.exports.handleAction(conv, conv.data.currentItem, module.exports.ROOMS[conv.data.currentRoom].stuff[conv.data.currentItem], action, null);
        logger.info(`currentItem: prompt=${prompt}, questioned=${questioned}, collected=${collected}`);
        return {prompt: prompt, questioned: questioned, collected: collected, win: win,
          lose: lose, secret: secret, failed: failed, saveState: saveState};
      } else if (conv.data.currentDirection) {
        // No item yet, but looking in a direction.
        let {prompt, questioned, collected, win, lose, secret, failed, saveState} = module.exports.handleAction(conv, conv.data.currentRoom, module.exports.ROOMS[conv.data.currentRoom].directions[conv.data.currentDirection], action, null);
        logger.info(`currentDirection: prompt=${prompt}, questioned=${questioned}, collected=${collected}`);
        return {prompt: prompt, questioned: questioned, collected: collected, win: win,
          lose: lose, secret: secret, failed: failed, saveState: saveState};
      } else if (conv.data.currentRoom) {
        // Not direction yet, but in a room.
        let {prompt, questioned, collected, win, lose, secret, failed, saveState} = module.exports.handleAction(conv, conv.data.currentRoom, module.exports.ROOMS[conv.data.currentRoom], action, null);
        logger.info(`currentRoom: prompt=${prompt}, questioned=${questioned}, collected=${collected}`);
        return {prompt: prompt, questioned: questioned, collected: collected, win: win,
          lose: lose, secret: secret, failed: failed, saveState: saveState};
      }
    }
    return {prompt: utils.getRandomPrompt(conv, 'fallback1'), questioned: false, collected: false,
      win: false, lose: false, secret: false, failed: false, saveState: false};
  },

  // Handle switches on/off logic.
  doOnOff: (conv, onOff, item) => {
    logger.info(`doOnOff: onOff: ${onOff}, item=${item}`);
    if (conv.data.currentRoom) {
      if (!conv.user.storage.rooms[conv.data.currentRoom].foundItems.includes(item)) {
        conv.data.currentItem = null;
        module.exports.s(conv, `${util.format(utils.getRandomPrompt(conv, 'not_found_item'), item)} ${module.exports.makeRoomPromptResponse(conv)}`);
        module.exports.askSuggestions(conv);
        return;
      }

      const state = module.exports.getState(conv, item);
      let onOffState = false;
      if (state) {
        const actions = state.action.split(',');
        if (actions.includes('on')) {
          onOffState = true;
        }
      }

      if (onOff === 'on' && onOffState) {
        // Already on
        module.exports.askSuggestions(conv);
        module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'already_on'), item)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
        return;
      } else if (onOff === 'off' && !onOffState) {
        // Already off
        module.exports.askSuggestions(conv);
        module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'already_off'), item)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
        return;
      } else {
        conv.data.currentItem = item;
        const {prompt, questioned, win, lose, failed} = module.exports.roomPrompt(conv, onOff);
        logger.info(`questioned=${questioned}`);
        if (lose) {
          return module.exports.handleLose(conv, prompt);
        } else if (win) {
          return module.exports.handleWin(conv, prompt);
        } else if (prompt) {
          if (failed) {
            module.exports.askSuggestions(conv);
            module.exports.invalidResponse(conv, `${utils.getRandomItem(prompt)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
            return;
          }
          if (onOff === 'on') {
            module.exports.askSuggestions(conv);
            module.exports.ask(conv, null, `${prompt}<break time="${module.exports.BREAK_NEXT}"/>${questioned ? '' : module.exports.nextMovePrompt(conv)}`);
            return;
          } else if (onOff === 'off') {
            module.exports.askSuggestions(conv);
            module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'turn_off'), item)}<break time="${module.exports.BREAK_NEXT}"/>${questioned ? '' : module.exports.nextMovePrompt(conv)}`);
            delete module.exports.removeState(conv, item);
            return;
          }
        }
      }
    }
    module.exports.askSuggestions(conv);
    module.exports.ask(conv, null, `${module.exports.makeRoomPromptResponse(conv)}`);
  },

  handleOnOff: (conv, params) => {
    let item = params.item;
    let onOff = params.onOff;
    conv.data.slotFillingCount = 0;

    module.exports.doOnOff(conv, onOff, item);
  },

  // Custom slot filling utility.
  handleSlotFilling: (conv, promptId, foundItems, defaultItems, noAn, addIntent) => {
    logger.debug(`handleSlotFilling: promptId=${promptId}, conv.data.slotFillingCount=${conv.data.slotFillingCount}`);
    // Keep a count of how many attempts at filling the slot.
    // Adjust the prompts to help the user provide valid input.
    if (conv.data.slotFillingCount) {
      let slotFillingCount = parseInt(conv.data.slotFillingCount);
      conv.data.slotFillingCount = slotFillingCount + 1;
    } else {
      conv.data.slotFillingCount = 1;
    }
    logger.debug(`conv.data.slotFillingCount=${conv.data.slotFillingCount}`);
    if (conv.data.slotFillingCount === 1) {
      if (addIntent) {
        return conv.ask(util.format(utils.getRandomPrompt(conv, `${promptId}1`), conv.intent.toLowerCase()));
      } else {
        return conv.ask(utils.getRandomPrompt(conv, `${promptId}1`));
      }
    } else if (conv.data.slotFillingCount === 2) {
      if (conv.data.currentRoom) {
        if (module.exports.ROOMS[conv.data.currentRoom]) {
          // Make a list of found item for the user to select from.
          const items = [];
          let clonedFoundItems = [];
          foundItems.forEach((item) => {
            if (!defaultItems.includes(item)) {
              clonedFoundItems.push(item);
            }
          });
          clonedFoundItems = clonedFoundItems.slice(0, 2);
          clonedFoundItems.forEach((item) => {
            if (noAn) {
              items.push(item);
            } else {
              if (module.exports.VOWELS.indexOf(item.charAt(0)) === -1) {
                items.push(`a ${item}`);
              } else {
                items.push(`an ${item}`);
              }
            }
          });
          let prompt;
          if (addIntent) {
            prompt = util.format(utils.getRandomPrompt(conv, `${promptId}2`), conv.intent.toLowerCase());
          } else {
            prompt = utils.getRandomPrompt(conv, `${promptId}2`);
          }
          if (items.length > 0) {
            conv.ask(utils.getRandomPrompt(conv, 'fallback1_sorry'));
            return module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, `${promptId}_items`), utils.makeOxfordCommaList(items, 'and'))}<break time="${module.exports.BREAK_NEXT}"/>${prompt}`);
          } else if (defaultItems.length > 0) {
            conv.ask(utils.getRandomPrompt(conv, 'fallback1_sorry'));
            return module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, `${promptId}_try_items`), utils.makeOxfordCommaList(defaultItems, 'or'))}<break time="${module.exports.BREAK_NEXT}"/>${prompt}`);
          } else {
            module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'fallback1_still_sorry')}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.makeRoomPromptResponse(conv, true)}`);
          }
        }
      }
    } else if (conv.data.slotFillingCount === 3) {
      if (defaultItems.length > 0) {
        if (addIntent) {
          return module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, `${promptId}_try_items`), utils.makeOxfordCommaList(defaultItems, 'or'))}<break time="${module.exports.BREAK_NEXT}"/>${util.format(utils.getRandomPrompt(conv, `${promptId}2`), conv.intent.toLowerCase())}`);
        } else {
          return module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, `${promptId}_try_items`), utils.makeOxfordCommaList(defaultItems, 'or'))}<break time="${module.exports.BREAK_NEXT}"/>${utils.getRandomPrompt(conv, `${promptId}2`)}`);
        }
      } else {
        if (addIntent) {
          return module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'fallback1_still_sorry')}<break time="${module.exports.BREAK_NEXT}"/>${util.format(utils.getRandomPrompt(conv, `${promptId}2`), conv.intent.toLowerCase())}`);
        } else {
          return module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'fallback1_still_sorry')}<break time="${module.exports.BREAK_NEXT}"/>${utils.getRandomPrompt(conv, `${promptId}2`)}`);
        }
      }
    } else {
      conv.close(utils.getRandomPrompt(conv, 'fallback3'));
    }
  },

  // Handler for custom slot filling to get switch action parameters.
  handleOnOffParams: (conv, params) => {
    let onOff = params.onOff;
    if (!onOff) {
      conv.data.slot = 'turnOnOff';
      module.exports.setContext(conv, 'slot_item', 1);
      return module.exports.handleSlotFilling(conv, 'slot_filling_on_off', module.exports.ON_OFF, []);
    }
    conv.data.slotOnOff = params.onOff;
    let item = params.item;
    if (!item) {
      conv.data.slotItem = null;
      conv.data.slot = 'turnOnOff';
      module.exports.setContext(conv, 'slot_item', 1);
      if (conv.data.currentRoom) {
        return module.exports.handleSlotFilling(conv, 'slot_filling_single_use', conv.user.storage.rooms[conv.data.currentRoom].foundItems, []);
      }
      return module.exports.handleSlotFilling(conv, 'slot_filling_single_use', [], []);
    }
    module.exports.handleOnOff(conv, params);
  },

  // Handler for 'flip' intent.
  handleFlip: (conv, params) => {
    let item = params.item;
    conv.data.slotFillingCount = 0;

    item = module.exports.mapToFoundItem(conv, item);
    module.exports.doOnOff(conv, 'on', item);
  },

  // Handler for the 'where' intent.
  handleWhere: (conv, params) => {
    let item = params.item;
    conv.data.slotFillingCount = 0;

    item = module.exports.mapToFoundItem(conv, item);
    if (conv.data.currentRoom) {
      if (conv.user.storage.rooms[conv.data.currentRoom].collectedItems.includes(item)) {
        conv.user.storage.help_inventory = true;
        module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'inventory_item'), item)}<break time="${module.exports.BREAK_NEXT}"/>${utils.getRandomPrompt(conv, 'help_inventory')}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
        module.exports.askSuggestions(conv);
        return;
      }
      if (conv.user.storage.rooms[conv.data.currentRoom].foundItems.includes(item)) {
        const directionsKeys = Object.keys(module.exports.ROOMS[conv.data.currentRoom].directions);
        for (let directionKey of directionsKeys) {
          const direction = module.exports.ROOMS[conv.data.currentRoom].directions[directionKey];
          for (let action of direction.actions) {
            if (action.items && action.items.includes(item)) {
              module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'found_item'), item)} ${util.format(utils.getRandomPrompt(conv, 'look_item'), directionKey)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
              module.exports.askSuggestions(conv);
              return;
            }
          }
        }
        module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'found_item'), item)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
        module.exports.askSuggestions(conv);
        return;
      }
    }
    module.exports.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'not_found_item'), item)} ${utils.getRandomPrompt(conv, 'help')}`);
    module.exports.askSuggestions(conv);
  },

  // Handler for 'how many' intent.
  handleHowMany: (conv, params) => {
    let item = params.item;
    conv.data.slotFillingCount = 0;

    item = module.exports.mapToFoundItem(conv, item);
    if (conv.data.currentRoom) {
      if (conv.user.storage.rooms[conv.data.currentRoom].foundItems.includes(item)) {
        if (module.exports.ROOMS[conv.data.currentRoom].stuff[item].multiple) {
          module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'multiple_items'), item)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
          module.exports.askSuggestions(conv);
          return;
        } else {
          module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'single_items'), item)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
          module.exports.askSuggestions(conv);
          return;
        }
      }
    }
    module.exports.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'not_found_item'), item)} ${utils.getRandomPrompt(conv, 'help')}`);
    module.exports.askSuggestions(conv);
  },

  // Utility to set the game context.
  setContext: (conv, context, lifetime) => {
    conv.data.context = context;
    conv.contexts.set(context, lifetime || module.exports.CONTEXT_LIFETIME, {});
  },

  // Handler for generating response for 'not supported'.
  handleNotSupported: (conv, item) => {
    const intent = conv.intent.toLowerCase();
    const intentPrompt = intent.replace(/ /g, '_');
    logger.info(`handleNotSupported: intent=${intent}, item=${item}`);
    if (conv.data.currentRoom && item) {
      const itemKey = item.replace(/ /g, '_');
      const staticItem = module.exports.ROOMS[conv.data.currentRoom].stuff[item] && module.exports.ROOMS[conv.data.currentRoom].stuff[item].hasOwnProperty('static') && module.exports.ROOMS[conv.data.currentRoom].stuff[item].static;
      if (staticItem && prompts[`${intentPrompt}_static_not_supported2`]) {
        return module.exports.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, `${intentPrompt}_static_not_supported2`), item, item)} ${module.exports.makeRoomPromptResponse(conv)}`);
      } else if (prompts[`${intentPrompt}_not_supported2`]) {
        return module.exports.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, `${intentPrompt}_not_supported2`), item, item)} ${utils.getRandomPrompt(conv, 'action_encouragement')} ${module.exports.makeRoomPromptResponse(conv)}`);
      } else if (staticItem && prompts[`${intentPrompt}_static_not_supported`]) {
        return module.exports.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, `${intentPrompt}_static_not_supported`), item)} ${module.exports.makeRoomPromptResponse(conv)}`);
      } else if (prompts[`${intentPrompt}_not_supported_${itemKey}`]) {
        return module.exports.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, `${intentPrompt}_not_supported_${itemKey}`), item)} ${utils.getRandomPrompt(conv, 'action_encouragement')} ${module.exports.makeRoomPromptResponse(conv)}`);
      } else if (prompts[`${intentPrompt}_not_supported`]) {
        return module.exports.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, `${intentPrompt}_not_supported`), item)} ${utils.getRandomPrompt(conv, 'action_encouragement')} ${module.exports.makeRoomPromptResponse(conv)}`);
      } else if (staticItem) {
        return module.exports.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'cannot_action'), intent, item)} ${module.exports.makeRoomPromptResponse(conv)}`);
      }
    }
    module.exports.invalidResponse(conv, `${utils.getRandomPrompt(conv, 'action_not_supported')} ${utils.getRandomPrompt(conv, 'action_encouragement')} ${module.exports.makeRoomPromptResponse(conv)}`);
  },

  // Handler for actions on individual items (without any other items as tools).
  handleSingleItemAction: (conv, item) => {
    logger.info(`handleSingleItemAction: item=${item}`);
    module.exports.analytics.item(conv.user.storage.uuid, conv.data.currentRoom || module.exports.LOBBY, item);
    if (conv.data.currentRoom && item) {
      if (item && !conv.user.storage.rooms[conv.data.currentRoom].foundItems.includes(item)) {
        conv.data.currentItem = null;
        module.exports.invalidResponse(conv, `${util.format(utils.getRandomPrompt(conv, 'not_found_item'), item)} ${module.exports.makeRoomPromptResponse(conv)}`);
      } else {
        conv.data.currentItem = item;
        let {prompt, questioned, collected, win, lose, failed, saveState} = module.exports.doAction(conv, conv.intent.toLowerCase());
        if (lose) {
          return module.exports.handleLose(conv, prompt);
        } else if (win) {
          return module.exports.handleWin(conv, prompt);
        } else if (prompt) {
          if (failed) {
            module.exports.invalidResponse(conv, `${utils.getRandomItem(prompt)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
            module.exports.askSuggestions(conv);
            return;
          }
          if (questioned) {
            module.exports.ask(conv, `${utils.getRandomPrompt(conv, 'confirmation')}`, `${utils.getRandomItem(prompt)}`);
          } else {
            let helpPrompt = module.exports.helpUserPrompt(conv, collected);
            if (helpPrompt) {
              module.exports.ask(conv, `${utils.getRandomPrompt(conv, 'confirmation')}`, `${utils.getRandomItem(prompt)} ${helpPrompt} <break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
            } else {
              if (!saveState) {
                module.exports.ask(conv, `${utils.getRandomPrompt(conv, 'confirmation')}`, `${utils.getRandomItem(prompt)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
              } else {
                module.exports.ask(conv, `${utils.getRandomPrompt(conv, 'confirmation_encouragement')}`, `${utils.getRandomItem(prompt)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
              }
            }
          }
        } else {
          module.exports.handleNotSupported(conv, item);
        }
      }
    } else {
      module.exports.handleNotSupported(conv);
    }
    module.exports.askSuggestions(conv);
  },

  // Handler when the user wins a room.
  handleWin: (conv, prompt) => {
    logger.info(`handleWin: prompt=${prompt}`);
    let textPrompt = utils.getRandomItem(prompt);
    let ssmlPrompt = textPrompt.replace(/\. /g, `.${module.exports.SSML_BREAK_SHORT}`);
    let secretPrompt = utils.getRandomPrompt(conv, 'secret_not_found');
    if (conv.data.currentRoom) {
      if (conv.user.storage.rooms[conv.data.currentRoom].secret) {
        secretPrompt = utils.getRandomPrompt(conv, 'secret_found');
      }
      const duration = module.exports.doTime(conv);
      module.exports.analytics.duration(conv.user.storage.uuid, conv.data.currentRoom, duration, () => {
        module.exports.analytics.total(conv.user.storage.uuid, conv.data.currentRoom, conv.user.storage.total, () => {
          module.exports.analytics.status(conv.user.storage.uuid, conv.data.currentRoom, 'win');
        });
      });
      if (!conv.user.storage.roomResults) {
        conv.user.storage.roomResults = {};
      }
      if (!conv.user.storage.roomResults[conv.data.currentRoom]) {
        conv.user.storage.roomResults[conv.data.currentRoom] = {};
      }
      if (!conv.user.storage.roomResults[conv.data.currentRoom].duration) {
        conv.user.storage.roomResults[conv.data.currentRoom].duration = duration;
      } else if (duration < parseInt(conv.user.storage.roomResults[conv.data.currentRoom].duration)) {
        conv.user.storage.roomResults[conv.data.currentRoom].duration = duration;
      }
      conv.ask(new SimpleResponse({
        speech: `<speak>
          <par>
            <media xml:id="intro">
              <speak>${utils.getRandomPrompt(conv, 'confirmation')} ${ssmlPrompt}</speak>
            </media>
            <media xml:id="riser" soundLevel="0dB" begin="intro.end-8.0s">
              <audio
                src="https://actions.google.com/sounds/v1/cartoon/siren_whistle.ogg"/>
            </media>
            <media xml:id="complete" soundLevel="0dB" begin="riser.end-0.2s">
              <audio
                src="https://actions.google.com/sounds/v1/cartoon/siren_whistle.ogg"/>
            </media>
            <media xml:id="congrats" begin="complete.end-1.0s">
              <speak>${util.format(utils.getRandomPrompt(conv, 'congratulations'), utils.getRandomItem(module.exports.ROOMS[conv.data.currentRoom].name))} ${util.format(utils.getRandomPrompt(conv, 'time'), duration)} ${secretPrompt}</speak>
            </media>
            <media xml:id="reverseriser" soundLevel="0dB" begin="congrats.end+1.0s">
              <audio
                src="https://actions.google.com/sounds/v1/foley/swoosh.ogg"/>
            </media>
          </par>
          </speak>`,
        text: `${textPrompt.replace(/<[^>]*>/g, ' ')} ${util.format(utils.getRandomPrompt(conv, 'congratulations'), utils.getRandomItem(module.exports.ROOMS[conv.data.currentRoom].name).toLowerCase())} ${util.format(utils.getRandomPrompt(conv, 'time'), duration)} ${secretPrompt.replace(/<[^>]*>/g, ' ')}`,
      }));
    }
    module.exports.doCount(conv);
    module.exports.restart(conv);

    module.exports.lobby(conv, false);
  },

  // Handler when the user looses a room.
  handleLose: (conv, prompt) => {
    logger.info(`handleLose.: prompt=${prompt}`);
    let textPrompt = utils.getRandomItem(prompt);
    let ssmlPrompt = textPrompt.replace(/\. /g, `.${module.exports.SSML_BREAK_SHORT}`);
    if (conv.data.currentRoom) {
      const duration = module.exports.doTime(conv);
      module.exports.analytics.duration(conv.user.storage.uuid, conv.data.currentRoom, duration, () => {
        module.exports.analytics.total(conv.user.storage.uuid, conv.data.currentRoom, conv.user.storage.total, () => {
          module.exports.analytics.status(conv.user.storage.uuid, conv.data.currentRoom, 'lose');
        });
      });
      conv.ask(new SimpleResponse({
        speech: `<speak>
          <par>
            <media xml:id="intro">
              <speak>${utils.getRandomPrompt(conv, 'confirmation')} ${ssmlPrompt}</speak>
            </media>
            <media xml:id="complete" soundLevel="0dB" begin="intro.end+0.0s">
              <audio
                src="https://actions.google.com/sounds/v1/cartoon/metal_twang.ogg"/>
            </media>
            <media xml:id="lose" begin="complete.end+1.0s">
              <speak>${util.format(utils.getRandomPrompt(conv, 'lose'), utils.getRandomItem(module.exports.ROOMS[conv.data.currentRoom].name))}</speak>
            </media>
            <media xml:id="reverseriser" soundLevel="0dB" begin="lose.end+1.0s">
              <audio
                src="https://actions.google.com/sounds/v1/foley/swoosh.ogg"/>
            </media>
          </par>
          </speak>`,
        text: `${textPrompt.replace(/<[^>]*>/g, ' ')} ${util.format(utils.getRandomPrompt(conv, 'lose').replace(/<[^>]*>/g, ' '), utils.getRandomItem(module.exports.ROOMS[conv.data.currentRoom].name).toLowerCase())}`,
      }));
    }

    module.exports.lobby(conv, false);
  },

  // Utility to track number of moves.
  doCount: (conv) => {
    if (conv.user.storage.count) {
      let count = parseInt(conv.user.storage.count);
      conv.user.storage.count = count + 1;
    } else {
      conv.user.storage.count = 1;
    }
  },

  // Utility to count number of secrets (easter eggs).
  doSecret: (conv) => {
    if (conv.user.storage.secrets) {
      let secrets = parseInt(conv.user.storage.secrets);
      conv.user.storage.secrets = secrets + 1;
    } else {
      conv.user.storage.secrets = 1;
    }
  },

  // Utility to calculate time spent in current room.
  doTime: (conv) => {
    if (conv.data.currentRoom) {
      return Math.round(parseInt(conv.user.storage.rooms[conv.data.currentRoom].duration) / (1000 * 60));
    }
    return 0;
  },

  // Utility to generate a response to help the user.
  helpUserPrompt: (conv, collected) => {
    logger.info(`helpUserPrompt: collected=${collected}, conv.user.storage.total=${conv.user.storage.total}`);
    let prompt = null;
    if (conv.data.currentRoom) {
      logger.debug(`conv.user.storage.rooms[conv.data.currentRoom].help_room_hint=${conv.user.storage.rooms[conv.data.currentRoom].help_room_hint}`);
    }
    if (conv.reward) {
      return null;
    }
    // Choose a response based on the user interactions in the room.
    if (!conv.user.storage.help_look_count && conv.data.lookCount) {
      let lookCount = parseInt(conv.data.lookCount);
      if (lookCount > 4) {
        conv.user.storage.help_look_count = true;
        return `${utils.getRandomPrompt(conv, 'help_look_count')}`;
      }
    }
    // Pick an appropriate response based on the number of user interactions.
    if ((conv.user.storage.total % 2 === 0)) {
      if (conv.user.storage.total > 6) {
        if (!conv.user.storage.help_more_time) {
          conv.user.storage.help_more_time = true;
          prompt = `${utils.getRandomPrompt(conv, 'help_more_time')}`;
        } else if (module.exports.hasFoundItems(conv) && !conv.user.storage.rooms[conv.data.currentRoom].help_room_hint && module.exports.ROOMS[conv.data.currentRoom].hints) {
          conv.user.storage.rooms[conv.data.currentRoom].help_room_hint = true;
          prompt = `${util.format(utils.getRandomPrompt(conv, 'by_the_way'), utils.getRandomItem(module.exports.ROOMS[conv.data.currentRoom].hints).toLowerCase())}`;
        }
      } else if (conv.user.storage.total > 5) {
        if (!conv.user.storage.help_item) {
          conv.user.storage.help_item = true;
          prompt = `${utils.getRandomPrompt(conv, 'help_item')}`;
        } else if (collected && !conv.user.storage.help_inventory) {
          conv.user.storage.help_inventory = true;
          prompt = `${utils.getRandomPrompt(conv, 'help_inventory')}`;
        } else if (collected && !conv.user.storage.help_use) {
          conv.user.storage.help_use = true;
          prompt = `${utils.getRandomPrompt(conv, 'help_use')}`;
        }
      }
    }
    logger.info(`prompt=${prompt}`);
    return prompt;
  },

  // Create a response which typically consists of reacting to the user input,
  // providing feedback based on the interaction and optionally hints to help the user.
  makeRoomPromptResponse: (conv, force) => {
    const {prompt, questioned, collected, win, lose, secret, failed, saveState} = module.exports.roomPrompt(conv);
    logger.info(`makeRoomPromptResponse: prompt=${prompt}, force=${force}, questioned=${questioned},
      collected=${collected}, win=${win}, lose=${lose}, secret=${secret}, failed=${failed}, saveState=${saveState}`);
    let helpPrompt = module.exports.helpUserPrompt(conv, collected);
    logger.debug(`helpPrompt=${helpPrompt}`);
    if (!prompt) {
      if (!conv.user.storage.help_hint) {
        conv.user.storage.help_hint = true;
        return `${utils.getRandomPrompt(conv, 'help_hint')}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`;
      } else {
        if (helpPrompt) {
          return `${helpPrompt}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`;
        } else {
          if (conv.data.currentRoom) {
            return `${util.format(utils.getRandomPrompt(conv, 'room'), utils.getRandomItem(module.exports.ROOMS[conv.data.currentRoom].name).toLowerCase())}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`;
          }
        }
      }
      return `${module.exports.nextMovePrompt(conv)}`;
    }
    if (questioned) {
      return utils.getRandomItem(prompt);
    } else {
      if (!force && conv.data.currentRoom && conv.data.currentItem && conv.user.storage.rooms[conv.data.currentRoom].lookedItems.includes(conv.data.currentItem)) {
        return `${module.exports.nextMovePrompt(conv)}`;
      } else {
        if (helpPrompt) {
          return `${utils.getRandomItem(prompt)}<break time="${module.exports.BREAK_NEXT}"/>${helpPrompt}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`;
        } else {
          return `${utils.getRandomItem(prompt)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`;
        }
      }
    }
  },

  // Utility to pick a response for next move, but tapering over time.
  nextMovePrompt: (conv) => {
    if (conv.data.currentRoom) {
      let count = parseInt(conv.user.storage.rooms[conv.data.currentRoom].count);
      if (count > 5) {
        return utils.getRandomPrompt(conv, 'next_move_short');
      }
    }
    return utils.getRandomPrompt(conv, 'next_move');
  },

  // If the user asks for the Google Assistant, close the Action and prompt the user to ask again.
  handleAssistant: (conv) => {
    let raw = conv.input.raw.toLowerCase();
    if (raw.startsWith('talk to') || raw.startsWith('ok google') || raw.startsWith('hey google') || raw.startsWith('speak to') || raw.startsWith('ask ') || raw.startsWith('google assistant')) {
      conv.close(utils.getRandomPrompt(conv, 'assistant_handoff'));
      return true;
    }
    return false;
  },

  // The user is saying exactly the same thing over and over.
  handleRepeatRaws: (conv) => {
    if (conv.data.raws && conv.data.raws.length > 1 && conv.data.raws[1] === conv.data.raws[0]) {
      module.exports.askSuggestions(conv);
      module.exports.ask(conv, null, utils.getRandomPrompt(conv, 'fallback1_stuck'), true);
      return true;
    }
    return false;
  },

  // Handler for code inputs (e.g. sequence of numbers).
  handleCode: (conv, code) => {
    logger.info(`handleCode: ${code}`);
    if (conv.data.currentRoom) {
      const codeString = code.toString();
      if (codeString.length !== 4) {
        module.exports.failedResponse(conv, `${utils.getRandomPrompt(conv, 'code_failed')} ${module.exports.makeRoomPromptResponse(conv)}`);
        module.exports.askSuggestions(conv);
        return;
      }
      let action;
      for (let act of module.exports.ROOMS[conv.data.currentRoom].stuff[conv.data.currentItem].actions) {
        if (act.type && act.type.includes('code')) {
          action = act;
        }
      }
      const solution = action.solution;
      let tryPrompt = `${util.format(utils.getRandomPrompt(conv, 'try_code'), utils.makeOxfordCommaList([codeString[0], codeString[1], codeString[2], codeString[3]], 'and'))}`;
      if (action.audio) {
        module.exports.soundResponse(conv, tryPrompt, action.audio, true);
      } else {
        module.exports.codeResponse(conv, tryPrompt);
      }
      if (solution && codeString[0] === solution[0] && codeString[1] === solution[1] && codeString[2] === solution[2] && codeString[3] === solution[3]) {
        let {prompt, win, lose, secret} = module.exports.handleAction(conv, conv.data.currentItem, module.exports.ROOMS[conv.data.currentRoom].stuff[conv.data.currentItem], 'code', null);
        if (secret) {
          handleSecret(conv, [`${prompt}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`]);
        } else if (lose) {
          return module.exports.handleLose(conv, prompt);
        } else if (win) {
          return module.exports.handleWin(conv, prompt);
        } else if (prompt) {
          module.exports.ask(conv, null, `${prompt}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
        } else {
          module.exports.ask(conv, null, `${utils.getRandomItem(action.description)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
        }
        conv.data.codeCounter = 0;
        module.exports.deleteContext(conv, 'code');
        module.exports.addState(conv, conv.data.currentItem, {item1: conv.data.currentItem, action: 'code'});
        if (action.items) {
          module.exports.addFoundItems(conv, action.items);
        }
        if (action.collectedItems) {
          action.collectedItems.forEach((inventoryItem) => {
            if (!conv.user.storage.rooms[conv.data.currentRoom].collectedItems.includes(inventoryItem)) {
              conv.user.storage.rooms[conv.data.currentRoom].collectedItems.unshift(inventoryItem);
            }
          });
        }
      } else {
        module.exports.setContext(conv, 'code', module.exports.CONTEXT_LIFETIME);
        if (conv.data.codeCounter) {
          const counter = parseInt(conv.data.codeCounter);
          conv.data.codeCounter = counter + 1;
        } else {
          conv.data.codeCounter = 1;
        }
        logger.debug(`conv.data.codeCounter='${conv.data.codeCounter}`);
        if (codeString === '1234' || codeString === '4321' || codeString === '0000' || codeString === '1111') {
          module.exports.failedResponse(conv, `${utils.getRandomPrompt(conv, 'code_obvious')}<break time="${module.exports.BREAK_NEXT}"/>${utils.getRandomPrompt(conv, 'hint_code')}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
        } else if (conv.data.codeCounter === 1) {
          module.exports.failedResponse(conv, `${utils.getRandomPrompt(conv, 'code_failed1')}<break time="${module.exports.BREAK_NEXT}"/>${utils.getRandomPrompt(conv, 'hint_code')}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
        } else if (conv.data.codeCounter % 3 === 1) {
          module.exports.failedResponse(conv, `${utils.getRandomPrompt(conv, 'code_failed')}<break time="${module.exports.BREAK_NEXT}"/>${utils.getRandomPrompt(conv, 'hint_code')}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
        } else if (conv.data.codeCounter % 3 === 2) {
          module.exports.failedResponse(conv, `${utils.getRandomPrompt(conv, 'code_failed')} ${utils.getRandomPrompt(conv, 'which_code')}`);
        } else {
          module.exports.failedResponse(conv, `${utils.getRandomPrompt(conv, 'code_failed')} ${module.exports.makeRoomPromptResponse(conv)}`);
        }
      }
    } else {
      module.exports.ask(conv, null, `${module.exports.makeRoomPromptResponse(conv)}`);
    }
    module.exports.askSuggestions(conv);
  },

  // Handler for directions (e.g. north, south, etc.)
  handleDirection: (conv, direction) => {
    logger.info(`handleDirection: direction=${direction}`);
    conv.data.currentItem = null;
    conv.data.currentDirection = direction;
    if (conv.data.currentRoom) {
      if (!module.exports.ROOMS[conv.data.currentRoom].directions[direction]) {
        module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'nothing_direction')} ${utils.getRandomPrompt(conv, 'walls')} ${utils.getRandomPrompt(conv, 'which_direction')}`);
        module.exports.askSuggestions(conv, module.exports.suggestionsDirections);
        return;
      }
      module.exports.addFoundDirections(conv, [direction]);
      if (direction === 'down' && conv.user.storage.rooms[conv.data.currentRoom].droppedItems && conv.user.storage.rooms[conv.data.currentRoom].droppedItems.length > 0) {
        const {prompt} = module.exports.roomPrompt(conv);
        let options = [];
        conv.user.storage.rooms[conv.data.currentRoom].droppedItems.forEach((item) => {
          if (module.exports.VOWELS.indexOf(item.charAt(0)) === -1) {
            options.push(`a ${item}`);
          } else {
            options.push(`an ${item}`);
          }
        });
        module.exports.ask(conv, null, `${prompt} ${util.format(utils.getRandomPrompt(conv, 'dropped_contents'), utils.makeOxfordCommaList(options, 'and'))}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
      } else {
        if (!module.exports.giveReward(conv, null, true)) {
          module.exports.ask(conv, null, `${module.exports.makeRoomPromptResponse(conv)}`);
        }
      }
    } else {
      module.exports.ask(conv, null, `${module.exports.makeRoomPromptResponse(conv)}`);
    }
    module.exports.askSuggestions(conv);
    module.exports.deleteContext(conv, 'direction');
  },

  // Handler for orientations (e.g. left, right, etc.)
  handleOrientation: (conv, orientation) => {
    if (!orientation) {
      return module.exports.handleSlotFilling(conv, 'slot_filling_direction', module.exports.ORIENTATIONS, [], true);
    }
    conv.data.slotFillingCount = 0;

    if (!module.exports.ORIENTATIONS.includes(orientation)) {
      module.exports.invalidResponse(conv, `${utils.getRandomPrompt(conv, 'not_found_direction')} ${utils.getRandomPrompt(conv, 'orientation')} ${utils.getRandomPrompt(conv, 'which_direction')}`);
      return;
    }
    if (!conv.data.currentDirection) {
      conv.data.currentDirection = 'north';
    }
    let directionIndex = module.exports.COMPASS.indexOf(conv.data.currentDirection);
    switch (orientation) {
      case 'left':
        directionIndex--;
        break;
      case 'right':
        directionIndex++;
        break;
      case 'backwards':
        directionIndex++;
        directionIndex++;
        break;
      default:
    }
    const direction = module.exports.COMPASS[(directionIndex + 4) % 4];

    module.exports.handleDirection(conv, direction);
  },

  // Handler for relative side requests (e.g. what is to the left of it?)
  handleSideIt: (conv, params) => {
    logger.info(`handleSideIt: params=${JSON.stringify(params)}`);
    let side = params.side;
    if (!side) {
      conv.data.slot = 'sideIt';
      module.exports.setContext(conv, 'slot_item', 1);
      return module.exports.handleSlotFilling(conv, 'slot_filling_side', module.exports.SIDES, []);
    }
    conv.data.slotFillingCount = 0;

    analytics.item(conv.user.storage.uuid, conv.data.currentRoom || module.exports.LOBBY, conv.data.currentItem);
    doSide(conv, conv.data.currentItem, side);
  },

  // Handler for look action.
  doLookAction: (conv, item) => {
    module.exports.adjustDirectionForItem(conv, item);
    let {prompt, questioned, collected, win, lose, failed} = module.exports.doAction(conv, 'look');
    if (lose) {
      return module.exports.handleLose(conv, prompt);
    } else if (win) {
      return module.exports.handleWin(conv, prompt);
    } else if (prompt) {
      if (failed) {
        module.exports.invalidResponse(conv, `${utils.getRandomItem(prompt)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
        return;
      }
      if (questioned) {
        module.exports.ask(conv, null, `${utils.getRandomItem(prompt)}`);
      } else {
        if (module.exports.giveReward(conv, prompt)) {
          return;
        }
        let helpPrompt = module.exports.helpUserPrompt(conv, collected);
        if (helpPrompt) {
          module.exports.ask(conv, null, `${utils.getRandomItem(prompt)} ${helpPrompt}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
        } else {
          module.exports.ask(conv, null, `${utils.getRandomItem(prompt)}<break time="${module.exports.BREAK_NEXT}"/>${module.exports.nextMovePrompt(conv)}`);
        }
      }
    } else {
      module.exports.ask(conv, null, `${module.exports.makeRoomPromptResponse(conv, true)}`);
    }
  },

  // Start the game by teleporting to the selected room.
  start: (conv) => {
    logger.info(`start: ${conv.data.currentRoom}`);
    const whichDirection = utils.getRandomPrompt(conv, 'which_direction');
    module.exports.setContext(conv, 'which_direction', 1);
    // Prompt the user to start looking in various directions.
    let directionPrompt = whichDirection;
    if (conv.data.currentRoom) {
      if (conv.user.last.seen) {
        if (conv.user.storage.help_walls) {
          directionPrompt = `${util.format(utils.getRandomPrompt(conv, 'teleport'),
            utils.getRandomItem(module.exports.ROOMS[conv.data.currentRoom].name).toLowerCase())} ${whichDirection}`;
        } else {
          directionPrompt = `${util.format(utils.getRandomPrompt(conv, 'teleport'),
            utils.getRandomItem(module.exports.ROOMS[conv.data.currentRoom].name).toLowerCase())} ${utils.getRandomPrompt(conv, 'look_around')} ${utils.getRandomPrompt(conv, 'walls')} ${whichDirection}`;
          conv.user.storage.help_walls = true;
        }
      } else {
        // The user heard the general directions suggestion before.
        if (module.exports.ROOMS[conv.data.currentRoom].intro) {
          const direction = module.exports.ROOMS[conv.data.currentRoom].introDirection || 'south';
          conv.data.currentDirection = direction;
          module.exports.addFoundDirections(conv, [direction]);
          module.exports.handleAction(conv, conv.data.currentRoom, module.exports.ROOMS[conv.data.currentRoom].directions[conv.data.currentDirection], 'look', null);
          directionPrompt = `${util.format(utils.getRandomPrompt(conv, 'teleport'),
            utils.getRandomItem(module.exports.ROOMS[conv.data.currentRoom].name).toLowerCase())}<break time="500ms"/>${utils.getRandomItem(module.exports.ROOMS[conv.data.currentRoom].intro)}<break time="700ms"/>${whichDirection}`;
        } else {
          directionPrompt = `${util.format(utils.getRandomPrompt(conv, 'teleport'),
            utils.getRandomItem(module.exports.ROOMS[conv.data.currentRoom].name).toLowerCase())} ${utils.getRandomPrompt(conv, 'look_around')} ${utils.getRandomPrompt(conv, 'walls')} ${whichDirection}`;
          conv.user.storage.help_walls = true;
        }
      }
    }
    // Add SSML breaks for the spaces.
    let ssmlPrompt = directionPrompt.replace(/\. /g, `.${module.exports.SSML_BREAK_SHORT}`);
    conv.data.lastResponse = directionPrompt;
    conv.ask(new SimpleResponse({
      speech: `<speak>
        <par>
          <media xml:id="introSound" begin="0.0s" soundLevel="0dB">
            <audio
              src="https://actions.google.com/sounds/v1/foley/swoosh.ogg"/>
          </media>
          <media xml:id="intro" begin="introSound.end-0.5s">
            <speak>${ssmlPrompt}</speak>
          </media>
        </par>
      </speak>`,
      text: `${directionPrompt.replace(/<[^>]*>/g, ' ')}`,
    }));
    module.exports.askSuggestions(conv, module.exports.suggestionsDirections);
    module.exports.deleteContext(conv, 'lobby');
    conv.data.solutionIndex = 0;
    conv.data.solution = null;
  },

  // Default fallback handler for Dialogflow intents.
  fallback: (conv) => {
    // Track the fallback count in session storage.
    conv.data.fallbackCount = utils.parseIntPositive(conv.data.fallbackCount);
    conv.data.fallbackCount++;

    let raw = conv.input.raw.toLowerCase();
    // Check if the user wants to talk to the Assistant.
    if (module.exports.handleAssistant(conv)) {
      return;
    }

    const badWords = filter.isProfane(raw);
    logger.info(`badWords=${badWords}`);
    // Track bad words to adjust responses based on user sentiment.
    if (badWords) {
      if (!conv.user.storage.first_bad_word) {
        conv.user.storage.first_bad_word = true;
      }
    }

    // Try to recover the conversation twice before ending the action
    if (conv.data.fallbackCount === 1) {
      if (module.exports.hasContext(conv, 'lobby')) {
        let room = module.exports.makeRoom(conv);
        if (room !== null) {
          conv.data.currentRoom = room;
          module.exports.start(conv);
          return;
        }

        module.exports.setContext(conv, 'lobby', module.exports.CONTEXT_LIFETIME);
        module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'fallback1_sorry')}`, true);
        return module.exports.lobby(conv, false);
      }
      if (module.exports.hasContext(conv, 'direction')) {
        module.exports.askSuggestions(conv, module.exports.suggestionsDirections);
        module.exports.setContext(conv, 'direction', module.exports.CONTEXT_LIFETIME);
        return module.exports.ask(conv, null, utils.getRandomPrompt(conv, 'fallback1_direction'), true);
      }
      if (module.exports.hasContext(conv, 'turns')) {
        module.exports.askSuggestions(conv, module.exports.suggestionsLeftRight);
        module.exports.setContext(conv, 'turns', module.exports.CONTEXT_LIFETIME);
        const rights = (raw.match(/right/g) || []).length;
        const lefts = (raw.match(/left/g) || []).length;
        // turn right two times
        const index = raw.indexOf('times');
        if (lefts > 1 || rights > 1 || (lefts + rights) > 1 || index !== -1) {
          return module.exports.ask(conv, null, utils.getRandomPrompt(conv, 'fallback1_turns_too_many'), true);
        } else {
          return module.exports.ask(conv, null, utils.getRandomPrompt(conv, 'fallback1_turns'), true);
        }
      }
      if (module.exports.hasContext(conv, 'color')) {
        module.exports.askSuggestions(conv);
        module.exports.setContext(conv, 'color', module.exports.CONTEXT_LIFETIME);
        return module.exports.ask(conv, null, utils.getRandomPrompt(conv, 'fallback1_color'), true);
      }
      if (module.exports.hasContext(conv, 'colors')) {
        module.exports.askSuggestions(conv);
        module.exports.setContext(conv, 'colors', module.exports.CONTEXT_LIFETIME);
        return module.exports.ask(conv, null, utils.getRandomPrompt(conv, 'fallback1_colors'), true);
      }
      if (module.exports.hasContext(conv, 'code')) {
        module.exports.setContext(conv, 'code', module.exports.CONTEXT_LIFETIME);
        let code = utils.makeCode(conv);
        if (code !== null) {
          module.exports.handleCode(conv, code);
          return;
        }
        module.exports.askSuggestions(conv);
        return module.exports.ask(conv, null, utils.getRandomPrompt(conv, 'fallback1_code'), true);
      }
      if (conv.data.currentItem && utils.matchItem(conv, dictionaries) === conv.data.currentItem) {
        module.exports.askSuggestions(conv);
        return module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'fallback1_item'), conv.data.currentItem)}`, true);
      }
      let direction = module.exports.makeDirection(conv);
      if (direction !== null) {
        module.exports.handleDirection(conv, direction);
        return;
      }
      let orientation = module.exports.makeOrientation(conv);
      if (orientation !== null) {
        module.exports.handleOrientation(conv, orientation);
        return;
      }
      let side = module.exports.makeSide(conv);
      if (side !== null) {
        module.exports.handleSideIt(conv, {side: side});
        return;
      }
      let item = module.exports.makeLookItem(conv);
      if (item !== null) {
        conv.data.currentItem = item;
        module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'fallback1_sorry_item'), item)}`, true);
        module.exports.doLookAction(conv, item);
        module.exports.askSuggestions(conv);
        return;
      }
      let roomKeys = Object.keys(module.exports.ROOMS);
      for (let key of roomKeys) {
        let room = module.exports.ROOMS[key];
        if (raw === room.name[0].toLowerCase()) {
          module.exports.handleRoom(conv);
          return;
        }
      }
      if (conv.data.intents && conv.data.intents.length > 1) {
        switch (conv.data.intents[1]) {
          case 'Look':
            module.exports.askSuggestions(conv);
            return module.exports.ask(conv, null, utils.getRandomPrompt(conv, 'fallback1_look'), true);
          case 'Use':
            module.exports.askSuggestions(conv);
            return module.exports.ask(conv, null, utils.getRandomPrompt(conv, 'fallback1_use'), true);
          default:
        }
      }
      if (raw.indexOf(' and ') !== -1) {
        module.exports.askSuggestions(conv);
        return module.exports.ask(conv, null, utils.getRandomPrompt(conv, 'fallback1_and'), true);
      }
      module.exports.askSuggestions(conv);
      if (badWords) {
        return module.exports.ask(conv, utils.getRandomPrompt(conv, 'frustrated'), module.exports.nextMovePrompt(conv), true);
      }
      return module.exports.ask(conv, null, utils.getRandomPrompt(conv, 'fallback1'), true);
    } else if (conv.data.fallbackCount === 2) {
      if (module.exports.hasContext(conv, 'lobby')) {
        let room = module.exports.makeRoom(conv);
        if (room !== null) {
          conv.data.currentRoom = room;
          module.exports.start(conv);
          return;
        }

        module.exports.setContext(conv, 'lobby', module.exports.CONTEXT_LIFETIME);
        module.exports.ask(conv, null, `${utils.getRandomPrompt(conv, 'fallback2_lobby')}`, true);
        return module.exports.lobby(conv, false);
      }
      if (module.exports.hasContext(conv, 'direction')) {
        module.exports.askSuggestions(conv, module.exports.suggestionsDirections);
        module.exports.setContext(conv, 'direction', module.exports.CONTEXT_LIFETIME);
        return module.exports.ask(conv, null, utils.getRandomPrompt(conv, 'fallback2_direction'), true);
      }
      if (module.exports.hasContext(conv, 'turns')) {
        module.exports.askSuggestions(conv, module.exports.suggestionsLeftRight);
        module.exports.setContext(conv, 'turns', module.exports.CONTEXT_LIFETIME);
        return module.exports.ask(conv, null, utils.getRandomPrompt(conv, 'fallback2_turns'), true);
      }
      if (module.exports.hasContext(conv, 'color')) {
        module.exports.askSuggestions(conv);
        module.exports.setContext(conv, 'turns', module.exports.CONTEXT_LIFETIME);
        return module.exports.ask(conv, null, utils.getRandomPrompt(conv, 'fallback2_color'), true);
      }
      if (module.exports.hasContext(conv, 'colors')) {
        module.exports.askSuggestions(conv);
        module.exports.setContext(conv, 'colors', module.exports.CONTEXT_LIFETIME);
        return module.exports.ask(conv, null, utils.getRandomPrompt(conv, 'fallback2_colors'), true);
      }
      if (module.exports.hasContext(conv, 'code')) {
        module.exports.setContext(conv, 'code', module.exports.CONTEXT_LIFETIME);
        let code = utils.makeCode(conv);
        if (code !== null) {
          module.exports.handleCode(conv, code);
          return;
        }
        module.exports.askSuggestions(conv);
        return module.exports.ask(conv, null, utils.getRandomPrompt(conv, 'fallback2_code'), true);
      }
      let direction = module.exports.makeDirection(conv);
      if (direction !== null) {
        module.exports.setContext(conv, 'direction', module.exports.CONTEXT_LIFETIME);
        module.exports.handleDirection(conv, direction);
        return;
      }
      let item = module.exports.makeLookItem(conv);
      if (item !== null) {
        conv.data.currentItem = item;
        module.exports.ask(conv, null, `${util.format(utils.getRandomPrompt(conv, 'fallback1_still_sorry_item'), item)}`, true);
        module.exports.doLookAction(conv, item);
        module.exports.askSuggestions(conv);
        return;
      }
      // Repeating user input
      if (module.exports.handleRepeatRaws(conv)) {
        return;
      }
      module.exports.askSuggestions(conv);
      if (badWords) {
        return module.exports.ask(conv, utils.getRandomPrompt(conv, 'gentle_confirmation'), utils.getRandomPrompt(conv, 'fallback2_question'), true);
      }
      return module.exports.ask(conv, null, utils.getRandomPrompt(conv, 'fallback2'), true);
    }
    if (module.exports.hasContext(conv, 'lobby')) {
      let room = module.exports.makeRoom(conv);
      if (room !== null) {
        conv.data.currentRoom = room;
        module.exports.start(conv);
        return;
      }
      conv.ask(`${utils.getRandomPrompt(conv, 'suprise')}`);

      conv.data.currentRoom = '1';
      module.exports.start(conv);
      return;
    }
    conv.close(utils.getRandomPrompt(conv, 'fallback3'));
  },

  // Map the user input to a supported direction.
  makeDirection: (conv) => {
    let input = conv.input.raw.toLowerCase();
    let direction = utils.matchValues(conv, input, module.exports.DIRECTIONS);
    logger.info(`makeDirection direction=${direction}`);
    return direction;
  },

  // Map the user input to a supported orientation.
  makeOrientation: (conv) => {
    let input = conv.input.raw.toLowerCase();
    let orientation = utils.matchValues(conv, input, module.exports.ORIENTATIONS);
    logger.info(`makeOrientation orientation=${orientation}`);
    return orientation;
  },

  // Map the user input to a supported side.
  makeSide: (conv) => {
    if (conv.data.currentItem) {
      let input = conv.input.raw.toLowerCase();
      let side = utils.matchValues(conv, input, module.exports.SIDES);
      logger.info(`makeSide side=${side}`);
      return side;
    }
    return null;
  },

  // Map the user input to a supported item.
  makeLookItem: (conv) => {
    if (conv.data.currentRoom && conv.user.storage.rooms[conv.data.currentRoom].foundItems.length > 0) {
      let input = conv.input.raw.toLowerCase();
      if (input.indexOf(' ') !== -1) {
        const words = input.split(' ');
        for (let item of conv.user.storage.rooms[conv.data.currentRoom].foundItems) {
          if (!module.exports.DEFAULT_ITEMS.includes(item) && !module.exports.MORE_TIME.includes(item)) {
            for (let word of words) {
              if (item === word) {
                logger.info(`makeLookItem item=${item}`);
                return item;
              }
            }
          }
        }
      } else {
        for (let item of conv.user.storage.rooms[conv.data.currentRoom].foundItems) {
          if (!module.exports.DEFAULT_ITEMS.includes(item) && !module.exports.MORE_TIME.includes(item)) {
            if (item === input) {
              logger.info(`makeLookItem item=${item}`);
              return item;
            }
          }
        }
      }
    }
    logger.info('makeLookItem item=null');
    return null;
  },

  // Map the user input to a supported room.
  makeRoom: (conv) => {
    let input = conv.input.raw.toLowerCase();
    let room = null;
    if (input.indexOf(' ') !== -1) {
      let rooms = [];
      let roomKeys = Object.keys(module.exports.ROOMS);
      for (let key of roomKeys) {
        let room = module.exports.ROOMS[key];
        rooms.push(room.name[0].toLowerCase());
      }
      const words = input.split(' ');
      for (let word of words) {
        word = word.toLowerCase();
        for (let i = 0; i < rooms.length; i++) {
          let name = rooms[i];
          if (name === word) {
            room = roomKeys[i];
          }
        }
      }
      if (!room) {
        let name = utils.matchValues(conv, input, rooms);
        if (name) {
          for (let i = 0; i < rooms.length; i++) {
            if (rooms[i] === name) {
              room = roomKeys[i];
              break;
            }
          }
        }
      }
    }

    logger.info(`makeRoom room=${room}`);
    return room;
  },

  // Main function for determining how to respond to a user action.
  // The user action and item state is matched to the room states.
  handleAction: (conv, item1, item1Action, action, item2) => {
    logger.info(`handleAction: item1=${item1}, action=${action}, item2=${item2}`);
    let questioned = false;
    let collected = false;
    let removed = false;
    let win = false;
    let lose = false;
    let secret = false;
    let failed = false;
    let saveState = false;
    // Track the number of look actions.
    if (action === 'look') {
      if (conv.data.lookCount) {
        let lookCount = parseInt(conv.data.lookCount);
        conv.data.lookCount = lookCount + 1;
        logger.debug(`conv.data.lookCount=${conv.data.lookCount}`);
      } else {
        conv.data.lookCount = 1;
      }
    } else {
      conv.data.lookCount = 0;
    }
    if (conv.data.currentRoom && item1 && item1Action) {
      logger.info('has item1');
      if (item1Action.actions) {
        logger.info('has item1 actions');
        if (item2) {
          module.exports.adjustDirectionForItem(conv, item2);
        } else {
          module.exports.adjustDirectionForItem(conv, item1);
        }
        let actions = [];
        for (let itemAction of item1Action.actions) {
          actions.push(itemAction);
        }
        logger.info(`actions1=${JSON.stringify(actions)}`);
        // Match state + action + item
        if (item2) {
          for (let i = actions.length; i--;) {
            if (!actions[i].item || actions[i].item !== item2) {
              actions.splice(i, 1);
            }
          }
        } else {
          for (let i = actions.length; i--;) {
            if (actions[i].item) {
              actions.splice(i, 1);
            }
          }
        }
        if (actions.length === 0) {
          logger.info(`no matching items: ${item2}`);
          return {prompt: null, questioned: questioned, collected: collected, win: win,
            lose: lose, secret: secret, failed: failed, saveState: saveState};
        }

        logger.info(`actions2=${JSON.stringify(actions)}`);
        // Match types (e.g. look, move, etc.)
        let typesMatched = [];
        for (let itemAction of actions) {
          if (itemAction.type) {
            if (itemAction.type.includes(action)) {
              logger.info('has type match');
              typesMatched.push(itemAction);
            }
          } else {
            logger.info('no type match');
            typesMatched.push(itemAction);
          }
        }
        if (typesMatched.length === 0) {
          logger.info(`no matching types: ${action}`);
          return {prompt: null, questioned: questioned, collected: collected, win: win,
            lose: lose, secret: secret, failed: failed, saveState: saveState};
        }

        logger.info(`typesMatched=${JSON.stringify(typesMatched)}`);
        // Match item states.
        let states = [];
        for (let itemAction of typesMatched) {
          if (itemAction.states) {
            let matchState = true;
            for (let state of itemAction.states) {
              const inState = module.exports.hasState(conv, state);
              logger.info(`state=${JSON.stringify(state)}, module.exports.hasState=${inState}`);
              matchState = matchState && inState;
            }
            if (matchState) {
              logger.info('has state match');
              states.push(itemAction);
            }
          }
        }
        logger.info(`states=${JSON.stringify(states)}`);
        if (states.length === 0) {
          logger.info('no matching states1');
          // Filter no states
          for (let itemAction of typesMatched) {
            if (!itemAction.states) {
              states.push(itemAction);
            }
          }
        }

        if (states.length === 0) {
          logger.info('no matching states2');
          return {prompt: null, questioned: questioned, collected: collected, win: win,
            lose: lose, secret: secret, failed: failed, saveState: saveState};
        }

        const selectedAction = states[0];
        let selectedPrompt = selectedAction.description;
        if (selectedAction.items) {
          logger.info('found items');
          module.exports.addFoundItems(conv, selectedAction.items);
        }
        collected = module.exports.addCollectedItems(conv, selectedAction.collectedItems);
        logger.info(`collected items=${collected}`);
        removed = module.exports.removeCollectedItems(conv, selectedAction.removedItems);
        logger.info(`removed items=${removed}`);

        if (selectedAction.hasOwnProperty('question')) {
          logger.info('checking question types');
          questioned = selectedAction.question;
          logger.info(`questioned=${questioned}`);
        }
        if (selectedAction.hasOwnProperty('failed')) {
          logger.info('checking failed types');
          failed = selectedAction.failed;
          logger.info(`failed=${failed}`);
        }
        if (selectedAction.hasOwnProperty('context')) {
          logger.info('checking context types');
          const context = selectedAction.context;
          module.exports.setContext(conv, context, module.exports.CONTEXT_LIFETIME);
          logger.info(`context=${context}`);
        }
        if (selectedAction.hasOwnProperty('secret')) {
          logger.info('secret action');
          // already found secret for this room
          if (conv.user.storage.rooms[conv.data.currentRoom].secret) {
            logger.info('failed secret');
            selectedPrompt = prompts.action_not_supported;
            failed = true;
          } else {
            conv.user.storage.rooms[conv.data.currentRoom].secret = selectedAction.secret;
            if (!conv.user.storage.roomResults) {
              conv.user.storage.roomResults = {};
            }
            if (!conv.user.storage.roomResults[conv.data.currentRoom]) {
              conv.user.storage.roomResults[conv.data.currentRoom] = {};
            }
            conv.user.storage.roomResults[conv.data.currentRoom].secret = selectedAction.secret;
            logger.info(`secret=${selectedAction.secret}`);
            secret = true;
            analytics.item(conv.user.storage.uuid, conv.data.currentRoom, 'secret');
            module.exports.doSecret(conv);
          }
        }
        win = selectedAction.hasOwnProperty('win') && selectedAction.win;
        if (!conv.user.storage.roomResults) {
          conv.user.storage.roomResults = {};
        }
        if (!conv.user.storage.roomResults[conv.data.currentRoom]) {
          conv.user.storage.roomResults[conv.data.currentRoom] = {};
        }
        if (!conv.user.storage.roomResults[conv.data.currentRoom].win) {
          conv.user.storage.roomResults[conv.data.currentRoom].win = win;
        }
        lose = selectedAction.hasOwnProperty('lose') && selectedAction.lose;
        if (!conv.user.storage.roomResults[conv.data.currentRoom].lose) {
          conv.user.storage.roomResults[conv.data.currentRoom].lose = lose;
        }

        saveState = action !== 'look';
        if (selectedAction.hasOwnProperty('saveState')) {
          logger.info('has saveState property');
          saveState = selectedAction.saveState;
        }
        logger.info(`saveState=${saveState}`);
        if (saveState) {
          if (item2) {
            module.exports.addState(conv, item1, {
              action: action,
              item2: item2,
            });
          } else {
            module.exports.addState(conv, item1, {
              action: action,
            });
          }
        }

        logger.info(`conv.user.storage='${JSON.stringify(conv.user.storage)}`);
        const results = {prompt: selectedPrompt, questioned: questioned, collected: collected,
          win: win, lose: lose, secret: secret, failed: failed, saveState: saveState};
        logger.info(`results=${JSON.stringify(results)}`);

        return results;
      }
    }
    return {prompt: null, questioned: questioned, collected: collected, win: win,
      lose: lose, secret: secret, failed: failed, saveState: saveState};
  },

  // Utility to create a prompt based on a user action on an item.
  doAction: (conv, type, item1) => {
    logger.info(`doAction: ${conv.data.currentItem}, ${type}, ${item1}`);
    if (conv.data.currentRoom && conv.data.currentItem) {
      conv.data.lastCurrentItem = conv.data.currentItem;
      conv.data.lastItem = item1;
      conv.data.lastAction = type;
      let {prompt, questioned, collected, win, lose, secret, failed, saveState} = module.exports.handleAction(conv, conv.data.currentItem, module.exports.ROOMS[conv.data.currentRoom].stuff[conv.data.currentItem], type, item1);
      return {prompt: prompt, questioned: questioned, collected: collected, win: win, lose: lose, secret: secret, failed: failed, saveState: saveState};
    } else {
      return {prompt: `${utils.getRandomPrompt(conv, 'walls')}`, questioned: false, collected: false, win: false, lose: false, secret: false, failed: false, saveState: false};
    }
  },
};
