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
 * Utility functions.
 */

// Logging dependencies
const logger = require('winston').loggers.get('DEFAULT_LOGGER');

// Utility to determine the distance between words to do fuzzy matching
const Levenshtein = require('levenshtein');

// Load all the user prompts.
const prompts = require('./prompts').prompts;

module.exports = {
  //  Words to ignore when building a dictionary of named things in a room
  FILLER_WORDS: ['use', 'there', 'isnt', 'flip', 'move', 'climb', 'hint', 'help', 'pull', 'find', 'behind', 'have', 'make', 'take', 'look', 'wall', 'looks', 'like', 'on', 'off', 'again', 'take', 'at', 'must', 'still', 'lift', 'push', 'into', 'have', 'like', 'see', 'an', 'with', 'too', 'as', 'up', 'theres', 'want', 'arent', 'using', 'in', 'are', 'left', 'right', 'tool', 'item', 'you', 'on', 'top', 'of', 'the', 'can', 'now', 'reach', 'and', 'remove', 'youve', 'found', 'your', 'is', 'this', 'for', 'inside', 'put', 'back', 'get', 'down', 'from', 'does', 'nothing', 'to', 'a', 'small', 'thin', 'has', 'dont', 'stand', 'itll', 'door', 'might', 'break', 'if', 'do', 'that', 'try', 'force', 'open', 'but', 'it', 'doesnt', 'work', 'empty', 'cant', 'out', 'just', 'doesnt', 'scratch', 'its'],

  fuzzyMatch: (value1, value2) => {
    return (value1 && value2 && value1.length > 3 && value2.length > 3 && (new Levenshtein(value1, value2).distance <= 1));
  },

  // Utility to compensate for NLU issues for numeric input.
  // Based on Dialogflow history mismatches: https://dialogflow.com/docs/agents/history
  makeCode: (conv) => {
    let input = conv.input.raw.toLowerCase().replace(/[`x~!@#$%^&*()_|+\-=?;:'",.<>{}[]\\\/]/gi, '');
    logger.debug(`makeCode: input=${input}`);
    let code = '';
    if (input.indexOf(' ') !== -1) {
      const words = input.split(' ');
      for (let word of words) {
        switch (word) {
          case '1':
          case 'one':
          case 'won':
          case 'wan':
            code = code + '1';
            break;
          case '2':
          case 'to':
          case 'too':
          case 'two':
            code = code + '2';
            break;
          case '3':
          case 'free':
          case 'three':
            code = code + '3';
            break;
          case '4':
          case 'for':
          case 'fore':
          case 'four':
          case 'form':
          case 'war':
            code = code + '4';
            break;
          case '5':
          case 'five':
          case 'v':
          case 'far':
            code = code + '5';
            break;
          case '6':
          case 'six':
            code = code + '6';
            break;
          case '7':
          case 'seven':
            code = code + '7';
            break;
          case '8':
          case 'eight':
          case 'ate':
          case 'at':
            code = code + '8';
            break;
          case '9':
          case 'nine':
            code = code + '9';
            break;
          case '0':
          case 'o':
          case 'oh':
          case 'ohh':
          case 'zero':
            code = code + '0';
            break;
          case 'and':
            break;
          default:
            let parsed = parseInt(input.replace(/\s/g, ''));
            if (isNaN(parsed)) {
              return null;
            }
            code = code + word;
        }
      }
    } else {
      code = input.replace(/\s/g, '');
    }
    logger.info(`makeCode code=${code}`);
    return code;
  },

  // Utility to match user input with a known set of values.
  // Partial and fuzzy matches supported.
  matchValues: (conv, input, values) => {
    logger.debug(`matchValues: input=${input} values=${JSON.stringify(values)}`);
    let result = null;
    if (input.indexOf(' ') !== -1) {
      const words = input.split(' ');
      for (let word of words) {
        for (let value of values) {
          if (module.exports.fuzzyMatch(value, word)) {
            result = value;
            break;
          }
        }
        if (result) {
          break;
        }
      }
      if (!result) {
        if (words.length > 1) {
          for (let word of words) {
            for (let value of values) {
              if (word[0] === value[0]) {
                result = value;
                break;
              }
            }
            if (result) {
              break;
            }
          }
        }
      }
    } else if (values.includes(input)) {
      result = input;
    }
    return result;
  },

  // Attempt to match the user input with the dictionary of words for each room.
  matchItem: (conv, dictionaries) => {
    let raw = conv.input.raw.toLowerCase();
    let bestKey = null;
    if (conv.data.currentRoom) {
      const dictionary = dictionaries[conv.data.currentRoom];
      const dictionaryKeys = Object.keys(dictionary);
      const rawWords = raw.split(' ');
      const counts = {};
      // Count how many user input words are matched against dictionary words.
      for (const dictionaryKey of dictionaryKeys) {
        counts[dictionaryKey] = 0;
        const words = dictionary[dictionaryKey];
        for (let word of words) {
          for (let rawWord of rawWords) {
            if (rawWord === word) {
              counts[dictionaryKey] += 1;
            }
          }
        }
      }
      let max = 0;
      // Pick the best matching words.
      for (const dictionaryKey of dictionaryKeys) {
        if (counts[dictionaryKey] > max) {
          max = counts[dictionaryKey];
          bestKey = dictionaryKey;
        }
      }
    }
    return bestKey;
  },

  // Store a dictionary of words found in the descriptions of each room.
  // Used for matching user input to things located in a room.
  generateDictionary: (roomKey, rooms) => {
    const dictionary = {};
    const room = rooms[roomKey];
    // Iterate through stuff in each room and extract useful words.
    const stuffKeys = Object.keys(room.stuff);
    for (const stuffKey of stuffKeys) {
      logger.debug(`stuffKey=${stuffKey}`);
      const stuff = room.stuff[stuffKey];
      dictionary[stuffKey] = [];
      if (stuff.actions) {
        for (const action of stuff.actions) {
          if (action.description) {
            // Strip description of any SSML tags.
            let description = action.description[0].toLowerCase().replace(/<[^>]*>/g, ' ').replace(/ +(?= )/g, '').replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>{}[]\\\/]/gi, '');
            console.log(description);
            // Extract the interesting words.
            let words = description.split(' ');
            if (words.length > 1) {
              for (let word of words) {
                if (!dictionary[stuffKey].includes(word) && !module.exports.FILLER_WORDS.includes(word) && word.length > 0) {
                  dictionary[stuffKey].push(word);
                }
              }
            } else if (dictionary.length > 0) {
              if (!dictionary[stuffKey].includes(description) && !module.exports.FILLER_WORDS.includes(description) && description.length > 0) {
                dictionary[stuffKey].push(description);
              }
            }
          }
        }
      }
    }
    return dictionary;
  },

  // Generate a dictionary of words for each room.
  generateDictionaries: (rooms) => {
    const dictionaries = {};
    const roomKeys = Object.keys(rooms);
    for (let roomKey of roomKeys) {
      let dictionary = module.exports.generateDictionary(roomKey, rooms);
      console.log(JSON.stringify(dictionary));
      dictionaries[roomKey] = dictionary;
    }
    return dictionaries;
  },

  // Generate a UUID for tracking the user.
  generateUUID: () => {
    let seed = Date.now();
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      let r = (seed + Math.random() * 16) % 16 | 0;
      seed = Math.floor(seed / 16);

      return (c === 'x' ? r : r & (0x3 | 0x8)).toString(16);
    });
    return uuid;
  },

  // Utility to get a random item from an array.
  getRandomItem: (array) => {
    return array[Math.floor(Math.random() * (array.length))];
  },

  // Utility to get a random prompt without sequential repeats.
  getRandomPrompt: (conv, prompt) => {
    logger.debug(`getRandomPrompt=${prompt}`);
    let availablePrompts = prompts[prompt];
    // Select a new prompt by avoiding prompts used previously in the session.
    if (conv.data.prompts) {
      if (typeof (conv.data.prompts[prompt]) !== 'undefined') {
        availablePrompts = availablePrompts.filter((word) => word !== conv.data.prompts[prompt]);
      }
    } else {
      conv.data.prompts = {};
    }
    if (Array.isArray(availablePrompts)) {
      // Persist the selected prompt in session storage.
      if (availablePrompts.length > 0) {
        conv.data.prompts[prompt] = module.exports.getRandomItem(availablePrompts);
      } else {
        conv.data.prompts[prompt] = prompts[prompt][0];
      }
    } else {
      conv.data.prompts[prompt] = availablePrompts;
    }
    return conv.data.prompts[prompt];
  },

  // Utility to parse a string as an integer up to a limit.
  parseIntPositive: (value, limit) => {
    if (!value) {
      return 0;
    }
    value = parseInt(value, 10);
    if (value < 0) {
      value = -value;
    }
    if (limit && value > limit) {
      return limit;
    }
    return value;
  },

  // Utility to make a list of options separated with an Oxford comma.
  makeOxfordCommaList: (options, andor) => {
    let separator = andor || 'or';
    let joined = options.join(', ');
    const lastComma = joined.lastIndexOf(',');
    if (lastComma !== -1) {
      joined = `${joined.substring(0, lastComma)}, ${separator} ${joined.substring(lastComma + 1)}`;
    }
    return joined;
  },

};
