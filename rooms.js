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

const SSML_BREAK_SHORT = '<break time="700ms"/>';
const SSML_BREAK_LONG = '<break time="1s"/>';

/**
 * A JSON data structure to describe the rooms of the game. Each room has the following features:
 * - some metadata that describes each room (e.g. name, level).
 * - resources for screen devices (e.g. URLs for images).
 * - a set of rewards: users are rewarded with hints as they explore the room.
 * - a set of directions: north, south, east, west, up, down.
 * - each direction has a description and at least one item.
 * - a set of stuff: items that are in the room that the user can look at and interact with.
 * - each item supports multiple actions (e.g. look, move, use, etc.)
 * - each item has a state and can also depend on the state of other items.
 * - interacting with an item can change the item state and might reveal other items (e.g. open a drawer, find a tool).
 * - users can collect items they find and add it to their inventory.
 * - items in the inventory can be used on other items in the room (e.g. use the screwdriver on the screw).
 * - special items like safes, have a solution that the user needs to solve (e.g. a number of different turns of the dial).
 * - there are easter eggs hidden in each room, which rewards the user with a special hint.
 * - interacting with certain items will let the user escape the room (e.g. unlock a door).
 */
const ROOMS = {
  '1': {
    'name': [
      'Office',
    ],
    'tagline': `Where is the key?`,
    'level': 'Easy',
    'image': 'https://upload.wikimedia.org/wikipedia/commons/0/01/Stardoor.png',
    'imageWin': 'https://upload.wikimedia.org/wikipedia/commons/7/79/StarIconGold.png',
    'imageEasterEgg': 'https://upload.wikimedia.org/wikipedia/commons/f/f4/StarIconBronze.png',
    'imageEasterEggWin': 'https://upload.wikimedia.org/wikipedia/commons/1/12/StarIconSilver.png',
    'rewards': [
      {
        'description': [
          'The photo has clues to solve a puzzle.',
        ],
        'actions': [
          {
            'type': [
              'look',
            ],
            'items': [
              'desk',
            ],
          },
        ],
      },
      {
        'description': [
          'You can try to open items.',
        ],
        'actions': [
          {
            'type': [
              'look',
            ],
            'items': [
              'drawer',
            ],
          },
        ],
      },
      {
        'description': [
          'You can look behind items.',
        ],
        'actions': [
          {
            'type': [
              'direction',
            ],
            'values': [
              'east',
            ],
          },
        ],
      },
      {
        'description': [
          'You can use a screwdriver on items with screws.',
        ],
        'actions': [
          {
            'type': [
              'direction',
            ],
            'values': [
              'west',
            ],
          },
        ],
      },
      {
        'description': [
          'You will need something thin to fit into the pinhole.',
        ],
        'actions': [
          {
            'type': [
              'look',
            ],
            'items': [
              'box',
            ],
          },
        ],
      },
    ],
    'intro': [
      `You can see a locked door. You need to find a key to escape.<break time="500ms"/>You're facing south. You can also look north, east, and west.`,
    ],
    'introDirection': 'south',
    'actions': [
      {
        'description': [
          'You are in a small office.',
        ],
      }, // look
    ], // room actions
    'directions': {
      'north': {
        'actions': [
          {
            'description': [
              'You see a desk against the wall.',
            ],
            'items': [
              'desk',
            ],
          },
        ],
      }, // north
      'south': {
        'actions': [
          {
            'description': [
              'There\'s a wooden door.',
            ],
            'items': [
              'door',
            ],
          },
        ],
      }, // south
      'east': {
        'actions': [
          {
            'description': [
              'There\'s a large painting hanging against the wall. It looks slightly skew.',
            ],
            'items': [
              'painting',
            ],
          },
        ],
      }, // east
      'west': {
        'actions': [
          {
            'description': [
              'You see an air vent near the bottom of the wall.',
            ],
            'items': [
              'vent',
            ],
          },
        ],
      }, // west
      'down': {
        'actions': [
          {
            'description': [
              'You look down and see a small rug on the floor.',
            ],
            'items': [
              'rug',
            ],
          },
        ],
      }, // down
      'up': {
        'actions': [
          {
            'description': [
              'You look up and see a ceiling light. It\'s out of reach.',
            ],
            'items': [
              'light',
            ],
          },
        ],
      }, // up
    }, // room directions
    'stuff': {
      'desk': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'You see an oak desk with a drawer. There\'s a photo frame on top of the desk.',
            ],
            'items': [
              'drawer',
              'photo',
            ],
          }, // look
          {
            'type': [
              'move',
            ],
            'description': [
              `You try to move the desk, but it's too heavy.`,
            ],
            'saveState': false,
          }, // move
          {
            'type': [
              'use',
            ],
            'description': [
              'You try to open the desk, but you just scratch it with that tool.',
            ],
            'saveState': false,
          }, // use anything
          {
            'type': [
              'climb',
            ],
            'description': [
              `You climb on top of the desk. You can now reach the ceiling light, and you remove the light cover.<audio src="https://actions.google.com/sounds/v1/cartoon/siren_whistle.ogg"></audio>${SSML_BREAK_LONG}Magnificent! You've found the easter egg.${SSML_BREAK_SHORT}Your reward is this special hint:${SSML_BREAK_LONG}"The key for the door is inside the vent".${SSML_BREAK_LONG}You put the light cover back and get down from the desk.`,
            ],
            'items': [
              'light',
            ],
            'secret': true,
            'saveState': false,
          }, // climb
        ],
        'static': true,
      },
      'drawer': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The drawer is closed.',
            ],
          }, // look
          {
            'type': [
              'open',
            ],
            'description': [
              `As you pull the desk drawer open, you find a toothpick inside, and you pick it up.`,
            ],
            'items': [
              'toothpick',
            ],
            'collectedItems': [
              'toothpick',
            ],
          }, // open
          {
            'states': [{
              'item1': 'drawer',
              'action': 'open',
            }],
            'description': [
              'The drawer is open and there\'s nothing inside.',
            ],
          }, // state after
          {
            'type': [
              'close',
            ],
            'states': [{
              'item1': 'drawer',
              'action': 'open',
            }],
            'description': [
              'The drawer doesn\'t want to close.',
            ],
            'saveState': false,
          }, // state after
          {
            'type': [
              'use',
            ],
            'description': [
              'You try to break the drawer, but you aren\'t using the right tool.',
            ],
            'saveState': false,
          }, // use anything
          {
            'type': [
              'use',
            ],
            'description': [
              'The toothpick might break if you do that.',
            ],
            'item': 'toothpick',
            'failed': true,
            'saveState': false,
          }, // toothpick
          {
            'type': [
              'use',
            ],
            'description': [
              'You scratch the drawer.',
            ],
            'item': 'screwdriver',
            'failed': true,
            'saveState': false,
          }, // screwdriver
        ],
        'static': true,
      }, // drawer
      'photo': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The photo is a man and woman smiling and waving. Sitting in front of them are 3 children, 2 cats, and 3 dogs.',
            ],
          }, // look
          {
            'type': [
              'lift',
              'below',
              'under',
            ],
            'description': [
              'You lift the photo frame, but don\'t find anything new.',
            ],
            'saveState': false,
          }, // lift
          {
            'type': [
              'behind',
            ],
            'description': [
              'There\'s nothing behind the photo.',
            ],
            'saveState': false,
          }, // behind
          {
            'type': [
              'use',
            ],
            'description': [
              'You try to break the frame, but you aren\'t using the right tool.',
            ],
            'saveState': false,
          }, // use anything
          {
            'type': [
              'use',
            ],
            'description': [
              'The toothpick does nothing to the photo.',
            ],
            'item': 'toothpick',
            'failed': true,
            'saveState': false,
          }, // toothpick
        ],
        'static': true,
      },
      'toothpick': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The toothpick is a small, thin stick of wood.',
            ],
          }, // look
        ],
        'static': false,
      }, // toothpick
      'screwdriver': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The screwdriver has a plastic handle and a metal shaft.',
            ],
          }, // look
        ],
        'static': false,
      }, // screwdriver
      'safe': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'This safe has a dial combination lock. To open the safe, you have to make a sequence of both left and right turns. Which direction do you want to start?',
              'The safe has a dial combination lock. To open the safe, you have to make a sequence of both right and left turns. Which direction is the first turn?',
              'This safe is locked with a dial combination. To open the safe, you have to make a sequence of both left and right turns. In which direction do you want to turn first?',
            ],
            'question': true,
            'context': 'turns',
            'saveState': false,
          }, // look
          {
            'type': [
              'turns',
            ],
            'solution': ['right', 'right', 'right', 'left', 'left', 'right', 'right', 'right'], // 3-2-3
            'description': [
              `The safe swings open to reveal a screwdriver.${SSML_BREAK_SHORT}You take the screwdriver.`,
            ],
            'items': [
              'screwdriver',
            ],
            'collectedItems': [
              'screwdriver',
            ],
          },
          {
            'states': [{
              'item1': 'safe',
              'action': 'turns',
            }],
            'description': [
              'The safe is open and there\'s nothing inside.',
            ],
          }, // state after
          {
            'type': [
              'use',
            ],
            'description': [
              'You try to open the safe, but nothing happens.',
            ],
            'saveState': false,
          }, // use anything
          {
            'type': [
              'behind',
            ],
            'description': [
              'You can\'t look behind the safe.',
            ],
            'failed': true,
            'saveState': false,
          }, // behind
          {
            'type': [
              'climb',
            ],
            'description': [
              'You can\'t climb on the safe; it\'s inside the wall.',
            ],
            'failed': true,
            'saveState': false,
          }, // climb
          {
            'type': [
              'use',
            ],
            'description': [
              'The toothpick does nothing to the safe. This safe has a dial combination lock.',
            ],
            'item': 'toothpick',
            'failed': true,
            'saveState': false,
          }, // toothpick
        ],
        'static': true,
      }, // safe
      'key': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The key has serrated edges and looks like it\'s made for a door.',
            ],
          }, // look
          {
            'type': [
              'climb',
            ],
            'description': [
              'Don\'t stand on the key; it\'ll bend.',
            ],
            'saveState': false,
          }, // climb
        ],
        'static': false,
      },
      'door': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The door is locked.',
            ],
            'items': [
              'lock',
            ],
          }, // look
          {
            'type': [
              'use',
              'open',
            ],
            'item': 'key',
            'description': [
              `You try to push the key into the door lock, but it doesn't fit all the way. You take it out and notice that it's a bit rusty. You dust off the key, and try again. You twist the key hard inside the lock until it feels like it's going to break.<audio src="https://actions.google.com/sounds/v1/doors/deadbolt_lock.ogg"></audio>`,
            ],
            'win': true,
          },
          {
            'type': [
              'open',
            ],
            'description': [
              `You can't open the door. It's locked.`,
            ],
            'failed': true,
            'saveState': false,
          },
          {
            'states': [{
              'item1': 'door',
              'action': 'use',
              'item2': 'key',
            }],
            'description': [
              'The door is unlocked.',
            ],
          }, // state after
          {
            'type': [
              'use',
            ],
            'description': [
              'You try to open the door, but you are using the wrong tool.',
            ],
            'saveState': false,
          }, // use anything
          {
            'type': [
              'behind',
            ],
            'description': [
              'You can\'t look behind the door.',
            ],
            'failed': true,
            'saveState': false,
          }, // behind
          {
            'type': [
              'climb',
            ],
            'description': [
              'You can\'t climb on the door; it\'s flush with the wall.',
            ],
            'failed': true,
            'saveState': false,
          }, // climb
          {
            'type': [
              'use',
            ],
            'description': [
              'The toothpick might break if you do that.',
            ],
            'item': 'toothpick',
            'failed': true,
            'saveState': false,
          }, // toothpick
        ],
        'static': true,
      },
      'lock': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The door is locked.',
            ],
          }, // look
          {
            'type': [
              'use',
              'open',
            ],
            'item': 'key',
            'description': [
              `You try to push the key into the door lock, but it doesn't fit all the way. You take it out and notice that it's a bit rusty. You dust off the key, and try again. You twist the key hard inside the lock until it feels like it's going to break.<audio src="https://actions.google.com/sounds/v1/doors/deadbolt_lock.ogg"></audio>`,
            ],
            'win': true,
          },
          {
            'type': [
              'use',
            ],
            'description': [
              'The toothpick might break if you do that.',
            ],
            'item': 'toothpick',
            'failed': true,
            'saveState': false,
          }, // toothpick
        ],
        'static': true,
      }, // lock
      'rug': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The rug looks like it\'s brand new.',
            ],
          }, // look
          {
            'type': [
              'lift',
              'move',
              'open',
              'under',
              'below',
            ],
            'description': [
              `You lift the rug and see the floorboards.`,
            ],
            'items': [
              'floorboards',
            ],
          }, // lift
          {
            'states': [{
              'item1': 'rug',
              'action': 'lift,open,move,under,below',
            }],
            'description': [
              'The rug is folded over and you see floorboards underneath.',
            ],
          }, // state after
          {
            'type': [
              'climb',
            ],
            'description': [
              'You get on the rug.',
            ],
            'saveState': false,
          }, // climb
        ],
        'static': true,
      },
      'vent': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'You look at the vent and see that it\'s screwed to the wall.',
            ],
          }, // look
          {
            'type': [
              'use',
            ],
            'item': 'screwdriver',
            'description': [
              `Using the screwdriver, you unscrew the vent from the wall. As you look inside the air duct, you notice a small wooden box.${SSML_BREAK_SHORT}You take the box.`,
            ],
            'items': [
              'box',
              'air duct',
            ],
            'collectedItems': [
              'box',
            ],
          }, // use screwdriver
          {
            'states': [{
              'item1': 'vent',
              'action': 'use',
              'item2': 'screwdriver',
            }],
            'description': [
              'The vent is unscrewed from the wall.',
            ],
          }, // state after
          {
            'type': [
              'use',
            ],
            'description': [
              'You try to force the vent open, but it doesn\'t budge.',
            ],
            'saveState': false,
          }, // use anything
          {
            'type': [
              'behind',
            ],
            'description': [
              'You can\'t look behind the vent.',
            ],
            'failed': true,
            'saveState': false,
          }, // behind
          {
            'type': [
              'climb',
            ],
            'description': [
              'You can\'t get on top of the vent; it\'s flush with the wall.',
            ],
            'failed': true,
            'saveState': false,
          }, // climb
          {
            'type': [
              'use',
            ],
            'description': [
              'The toothpick might break if you do that.',
            ],
            'item': 'toothpick',
            'failed': true,
            'saveState': false,
          }, // toothpick
        ],
        'static': true,
      }, // vent
      'box': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'As you look at the box, you can\'t find a way to open it, and you realize it must have a hidden compartment. You carefully examine it, and find a small pinhole on the side.',
            ],
            'items': [
              'pinhole',
            ],
            'saveState': false,
          }, // look
          {
            'type': [
              'open',
            ],
            'description': [
              'You can\'t find a way to open the wooden box. You carefully examine it, and find a small pinhole on the side.',
            ],
            'items': [
              'pinhole',
            ],
            'failed': true,
            'saveState': false,
          }, // look
          {
            'type': [
              'use',
            ],
            'item': 'toothpick',
            'description': [
              `Using the toothpick, you carefully push it into the pinhole.${SSML_BREAK_SHORT}The lid of the box pops open, to reveal a key inside. You take the key.`,
            ],
            'items': [
              'key',
            ],
            'collectedItems': [
              'key',
            ],
          }, // use toothpick
          {
            'type': [
              'use',
            ],
            'item': 'screwdriver',
            'description': [
              'Using the screwdriver, you try to push it into the pinhole, but it doesn\'t fit.',
            ],
            'saveState': false,
          }, // use toothpick
          {
            'states': [{
              'item1': 'box',
              'action': 'use,look,open',
              'item2': 'toothpick',
            }],
            'description': [
              'The box is open and there\'s nothing inside.',
            ],
          }, // state after
          {
            'states': [{
              'item1': 'pinhole',
              'action': 'use,look,open',
              'item2': 'toothpick',
            }],
            'description': [
              'The box is open and there\'s nothing inside.',
            ],
          }, // state after
          {
            'type': [
              'use',
            ],
            'description': [
              'You try to force the box open, but it doesn\'t work.',
            ],
            'saveState': false,
          }, // use anything
        ],
        'static': false,
      }, // box
      'air duct': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The air duct is empty.',
            ],
          }, // look
        ],
        'static': true,
      }, // air duct
      'floorboards': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The floorboards are dusty.',
            ],
          }, // look
          {
            'type': [
              'wipe',
            ],
            'description': [
              'The floorboards are still dusty.',
            ],
            'saveState': false,
          }, // wipe
          {
            'type': [
              'lift',
              'below',
              'under',
            ],
            'description': [
              'You can\'t lift the floorboards.',
            ],
            'failed': true,
            'saveState': false,
          }, // lift
          {
            'type': [
              'use',
            ],
            'description': [
              'The toothpick might break if you do that.',
            ],
            'item': 'toothpick',
            'failed': true,
            'saveState': false,
          }, // toothpick
          {
            'type': [
              'use',
            ],
            'description': [
              'You scratch the floorboards.',
            ],
            'item': 'screwdriver',
            'failed': true,
            'saveState': false,
          }, // toothpick
        ],
        'static': true,
      }, // floorboards
      'floor': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The floor is dusty.',
            ],
          }, // look
          {
            'type': [
              'wipe',
            ],
            'description': [
              'The floor is still dusty.',
            ],
            'saveState': false,
          }, // wipe
          {
            'type': [
              'lift',
              'below',
              'under',
            ],
            'description': [
              'You can\'t lift the floor.',
            ],
            'failed': true,
            'saveState': false,
          }, // lift
        ],
        'static': true,
      }, // floor
      'ceiling': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The ceiling light is out of reach.',
            ],
          }, // look
        ],
        'static': true,
      }, // ceiling
      'wall': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The wall is just a wall.',
            ],
          }, // look
        ],
        'static': true,
      }, // wall
      'light': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The light is out of reach.',
            ],
          }, // look
        ],
        'static': true,
      }, // light
      'pinhole': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The pinhole is too small to see inside.',
            ],
          }, // look
          {
            'type': [
              'use',
            ],
            'item': 'toothpick',
            'description': [
              `Using the toothpick, you carefully push it into the pinhole. The lid of the box pops open, to reveal a key inside. You take the key.`,
            ],
            'items': [
              'key',
            ],
            'collectedItems': [
              'key',
            ],
          }, // use toothpick
          {
            'type': [
              'use',
            ],
            'item': 'screwdriver',
            'description': [
              'Using the screwdriver, you try to push it into the pinhole, but it doesn\'t fit.',
            ],
            'saveState': false,
          }, // use toothpick
          {
            'states': [{
              'item1': 'pinhole',
              'action': 'use',
              'item2': 'toothpick',
            }],
            'description': [
              'The box is open and there\'s nothing inside.',
            ],
          }, // state after
          {
            'states': [{
              'item1': 'box',
              'action': 'use',
              'item2': 'toothpick',
            }],
            'description': [
              'The box is open and there\'s nothing inside.',
            ],
          }, // state after
          {
            'type': [
              'use',
            ],
            'description': [
              'You try to force the pinhole open, but it doesn\'t work.',
            ],
            'saveState': false,
          }, // use anything
        ],
        'static': true,
      }, // pinhole
      'painting': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'It\'s a painting of dogs playing poker.',
            ],
          }, // look
          {
            'type': [
              'move',
              'straighten',
              'lift',
              'fix',
            ],
            'description': [
              'As you adjust the painting, you notice a safe hidden behind it.',
            ],
            'items': [
              'safe',
            ],
          }, // use move
          {
            'type': [
              'behind',
            ],
            'description': [
              'As you look behind the painting, you discover a hidden safe.',
            ],
            'items': [
              'safe',
            ],
          }, // use move
          {
            'type': [
              'climb',
            ],
            'description': [
              'You can\'t get on top of the painting.',
            ],
            'items': [
              'safe',
            ],
            'failed': true,
            'saveState': false,
          }, // use move
          {
            'states': [{
              'item1': 'painting',
              'action': 'move,straighten,behind,lift',
            }],
            'description': [
              'The painting is moved aside and you can see a safe.',
            ],
          }, // state after
          {
            'type': [
              'use',
            ],
            'description': [
              'You scratch the painting.',
            ],
            'saveState': false,
          }, // use anything
          {
            'type': [
              'use',
            ],
            'description': [
              'The toothpick does nothing to the painting.',
            ],
            'item': 'toothpick',
            'failed': true,
            'saveState': false,
          }, // toothpick
        ],
        'static': true,
      }, // painting
    }, // room stuff
  }, // room 0
  // ////////////////////////////////////////////////////////////////////////////
  '2': {
    'name': [
      'Bedroom',
    ],
    'tagline': 'Where is the exit?',
    'level': 'Hard',
    'image': 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Bed_icon.png',
    'imageWin': 'https://upload.wikimedia.org/wikipedia/commons/7/79/StarIconGold.png',
    'imageEasterEgg': 'https://upload.wikimedia.org/wikipedia/commons/f/f4/StarIconBronze.png',
    'imageEasterEggWin': 'https://upload.wikimedia.org/wikipedia/commons/1/12/StarIconSilver.png',
    'rewards': [
      {
        'description': [
          'An item you need is hidden under the bed.',
        ],
        'actions': [
          {
            'type': [
              'look',
            ],
            'items': [
              'bed',
            ],
          },
        ],
      },
      {
        'description': [
          'The exit is under the rug.',
        ],
        'actions': [
          {
            'type': [
              'look',
            ],
            'items': [
              'rug',
            ],
          },
        ],
      },
      {
        'description': [
          'The clue for the suitcase combination lock is somewhere east.',
        ],
        'actions': [
          {
            'type': [
              'direction',
            ],
            'values': [
              'south',
            ],
          },
        ],
      },
      {
        'description': [
          'An item you need is hidden underneath the pillow.',
        ],
        'actions': [
          {
            'type': [
              'look',
            ],
            'items': [
              'flashlight',
            ],
          },
        ],
      },
      {
        'description': [
          'You might want to look down.',
        ],
        'actions': [
          {
            'type': [
              'look',
            ],
            'items': [
              'crowbar',
            ],
          },
        ],
      },
    ],
    'actions': [
      {
        'description': [
          'You are in a bedroom.',
        ],
      }, // look
    ], // room actions
    'directions': {
      'north': {
        'actions': [
          {
            'description': [
              'You see a bed against the wall and a nightstand next to it.',
            ],
            'items': [
              'bed',
              'nightstand',
            ],
          },
        ],
      }, // north
      'south': {
        'actions': [
          {
            'description': [
              'There\'s a suitcase leaning against the wall.',
            ],
            'items': [
              'suitcase',
            ],
          },
        ],
      }, // south
      'east': {
        'actions': [
          {
            'description': [
              'There\'s a large poster hanging on the wall.',
            ],
            'items': [
              'poster',
            ],
          },
        ],
      }, // east
      'west': {
        'actions': [
          {
            'description': [
              'You see a large bookcase.',
            ],
            'items': [
              'bookcase',
              'shelves',
            ],
          },
        ],
      }, // west
      'down': {
        'actions': [
          {
            'description': [
              'You look down and see a large rug on the floor.',
            ],
            'items': [
              'rug',
            ],
          },
          {
            'states': [{
              'item1': 'rug',
              'action': 'lift,open,move,under,below',
            }],
            'description': [
              'You look down and see a rug folded over with a trapdoor underneath.',
            ],
          }, // state after
        ],
      }, // down
      'up': {
        'actions': [
          {
            'description': [
              'You look up and see a ceiling light. It\'s out of reach.',
            ],
            'items': [
              'light',
            ],
          },
        ],
      }, // up
    }, // room directions
    'stuff': {
      'nightstand': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'You see an nightstand with a drawer. There\'s a bedlamp on top of the nightstand.',
            ],
            'items': [
              'nightstand',
              'drawer',
              'bedlamp',
            ],
          }, // look
          {
            'type': [
              'move',
            ],
            'description': [
              `You move the nightstand, but don't find anything new, and put it back again.`,
            ],
            'saveState': false,
          }, // move
          {
            'type': [
              'use',
            ],
            'description': [
              'You just scratch the desk.',
            ],
            'saveState': false,
          }, // use anything
          {
            'type': [
              'climb',
            ],
            'description': [
              `You climb on top of the nightstand, but can't reach anything, and get down again.`,
            ],
            'saveState': false,
          }, // climb
          {
            'type': [
              'use',
            ],
            'description': [
              'The nightstand doesn\'t have a lock.',
            ],
            'item': 'key',
            'failed': true,
            'saveState': false,
          }, // screwdriver
        ],
        'static': true,
      }, // nightstand
      'bed': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'You see a queen sized bed with a pillow on top.',
            ],
            'items': [
              'pillow',
              'mattress',
            ],
          }, // look
          {
            'type': [
              'look',
            ],
            'states': [{
              'item1': 'bed',
              'action': 'use,below',
              'item2': 'flashlight',
            }],
            'description': [
              'You see a queen sized bed with a pillow on top.',
            ],
            'items': [
              'pillow',
              'mattress',
            ],
          }, // look
          {
            'type': [
              'move',
            ],
            'description': [
              `You try to move the bed, but it's too heavy.`,
            ],
            'saveState': false,
          }, // move
          {
            'type': [
              'use',
            ],
            'description': [
              'You just scratch the bed.',
            ],
            'saveState': false,
          }, // use anything
          {
            'type': [
              'climb',
            ],
            'description': [
              `You climb on top of the bed. You can't reach anything, and get down again.`,
            ],
            'saveState': false,
          }, // climb
          {
            'type': [
              'use',
            ],
            'item': 'nightstand',
            'description': [
              `You put the nightstand on the bed, but realize it's not stable enough to take your weight, so you put it down again.`,
            ],
            'saveState': false,
          },
          {
            'type': [
              'use',
              'below',
            ],
            'item': 'flashlight',
            'states': [{
              'item1': 'flashlight',
              'action': 'use',
              'item2': 'battery',
            }],
            'description': [
              `You shine the flashlight underneath the bed and discover a crowbar. You take the crowbar.`,
            ],
            'items': [
              'crowbar',
            ],
            'collectedItems': [
              'crowbar',
            ],
            'saveState': true,
          },
          {
            'type': [
              'use',
            ],
            'item': 'flashlight',
            'states': [{
              'item1': 'bed',
              'action': 'use,below',
              'item2': 'flashlight',
            }],
            'description': [
              `There is nothing underneath the bed.`,
            ],
            'saveState': false,
          },
          {
            'type': [
              'use',
            ],
            'item': 'flashlight',
            'description': [
              `Since the flashlight doesn't have a battery, it's too dark to see anything.`,
            ],
            'saveState': false,
          },
          {
            'type': [
              'below',
            ],
            'description': [
              `You look underneath the bed, but it's too dark to see anything.`,
            ],
            'saveState': false,
          },
          {
            'type': [
              'lift',
            ],
            'description': [
              `You can't lift the bed since it's too heavy.`,
            ],
            'failed': true,
            'saveState': false,
          },
        ],
        'static': true,
      }, // bed
      'crowbar': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The crowbar is heavy and has a hook at the end.',
            ],
          }, // look
        ],
        'static': false,
      }, // crowbar
      'drawer': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The drawer is locked.',
            ],
          }, // look
          {
            'type': [
              'open',
            ],
            'description': [
              'You can\'t open the drawer, since it\'s locked.',
            ],
            'failed': true,
            'saveState': false,
          }, // look
          {
            'type': [
              'open',
              'use',
            ],
            'item': 'key',
            'description': [
              `You put the key in the drawer lock, and turn. You pull the drawer open. Inside, you find a flashlight and you notice it doesn't have a battery. You take the flashlight.`,
            ],
            'items': [
              'flashlight',
            ],
            'collectedItems': [
              'flashlight',
            ],
          }, // open
          {
            'states': [{
              'item1': 'drawer',
              'action': 'open,use',
              'item2': 'key',
            }],
            'description': [
              'The drawer is open and there\'s nothing inside.',
            ],
          }, // state after
          {
            'type': [
              'close',
            ],
            'states': [{
              'item1': 'drawer',
              'action': 'open,use',
              'item2': 'key',
            }],
            'description': [
              'The drawer doesn\'t want to close.',
            ],
            'saveState': false,
          }, // state after
          {
            'type': [
              'use',
              'open',
            ],
            'description': [
              'You try to break the drawer, but it only scratches the wood.',
            ],
            'saveState': false,
          }, // use anything
        ],
        'static': true,
      },
      'bedlamp': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The bedlamp is switched off.',
            ],
          }, // look
          {
            'type': [
              'on',
            ],
            'description': [
              `You turn on the bedlamp. It shines with an indigo color.`,
            ],
          }, // on
          {
            'type': [
              'off',
            ],
            'description': [
              'The bedlamp is switched off.',
            ],
          }, // on
          {
            'type': [
              'lift',
              'under',
              'below',
            ],
            'description': [
              'You lift the bedlamp, but don\'t find anything new.',
            ],
            'saveState': false,
          }, // lift
          {
            'type': [
              'behind',
            ],
            'description': [
              'You look behind the bedlamp, but don\'t find anything new.',
            ],
            'saveState': false,
          }, // behind
          {
            'states': [{
              'item1': 'bedlamp',
              'action': 'on',
            }],
            'description': [
              'The bedlamp shines with an indigo color.',
            ],
          }, // state after
          {
            'states': [{
              'item1': 'bedlamp',
              'action': 'off',
            }],
            'description': [
              'The bedlamp is switched off.',
            ],
          }, // state after
          {
            'type': [
              'use',
            ],
            'description': [
              'You try to break the bedlamp, but you aren\'t using the right tool.',
            ],
            'saveState': false,
          }, // use anything
        ],
        'static': true,
      }, // light
      'pillow': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The pillow is large and soft.',
            ],
          }, // look
          {
            'type': [
              'open',
            ],
            'description': [
              'You can\'t open the pillow.',
            ],
            'failed': true,
            'saveState': false,
          }, // look
          {
            'type': [
              'lift',
              'under',
              'below',
              'move',
            ],
            'description': [
              'You look underneath the pillow and find a book. You take the book.',
            ],
            'items': [
              'book',
            ],
            'collectedItems': [
              'book',
            ],
          }, // lift
          {
            'type': [
              'lift',
              'under',
              'below',
              'look',
              'move',
            ],
            'states': [{
              'item1': 'pillow',
              'action': 'under,lift,below,move',
            }],
            'description': [
              'There\'s nothing underneath the pillow.',
            ],
          }, // lift
        ],
        'static': false,
      }, // toothpick
      'mattress': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              `The mattress is on the bed.`,
            ],
          }, // look
        ],
      }, // mattress
      'book': {
        'actions': [
          {
            'type': [
              'look',
              'open',
              'read',
            ],
            'description': [
              `As you page through the book, you discover a hidden storage compartment cut out of the pages. Inside the compartment is a battery. You take the battery.`,
            ],
            'items': [
              'battery',
            ],
            'collectedItems': [
              'battery',
            ],
            'saveState': true,
          }, // look
          {
            'states': [{
              'item1': 'book',
              'action': 'look,open,read',
            }],
            'type': [
              'look',
              'open',
              'read',
            ],
            'description': [
              `The hidden storage compartment in the book is empty.`,
            ],
          },
        ],
        'static': false,
      }, // book
      'battery': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              `Its a AAA battery.`,
            ],
          }, // look
        ],
      }, // battery
      'flashlight': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              `The flashlight doesn't have a battery.`,
            ],
          }, // look
          {
            'type': [
              'use',
            ],
            'item': 'battery',
            'description': [
              `You put the battery inside the flashlight, and turn it on. The flashlight shines a bright light.`,
            ],
          }, // use
          {
            'states': [{
              'item1': 'flashlight',
              'action': 'use',
              'item2': 'battery',
            }],
            'type': [
              'look',
            ],
            'description': [
              `The flashlight shines a bright light.`,
            ],
          },
        ],
        'static': false,
      }, // flashlight
      'bookcase': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              `The bookcase has several shelves of books. Each shelf is painted a different color.`,
            ],
            'items': [
              'shelves',
            ],
          }, // look
          {
            'type': [
              'use',
            ],
            'item': 'book',
            'description': [
              'You have to pick the right colored shelf. What\'s the color?',
              'You have to pick a colored shelf. Which color?',
              'You have to pick the right colored shelf. Which color?',
            ],
            'question': true,
            'context': 'color',
            'saveState': false,
          }, // user
          {
            'type': [
              'color',
            ],
            'solution': ['indigo'],
            'description': [
              `As you place the book on that shelf, you notice words on the book binders spell out a message.<audio src="https://actions.google.com/sounds/v1/cartoon/siren_whistle.ogg"></audio>${SSML_BREAK_LONG}Magnificent! You've found the easter egg. The message is a special hint:${SSML_BREAK_LONG}"The crowbar for the trapdoor is hidden under the bed, but remember to use the flashlight."`,
            ],
            'removedItems': [
              'book',
            ],
            'secret': true,
          }, // code
          {
            'type': [
              'climb',
            ],
            'description': [
              'You get on top of the bookcase, but don\'t find anything new, and get down again.',
            ],
            'failed': true,
            'saveState': false,
          }, // climb
          {
            'states': [{
              'item1': 'bookcase',
              'action': 'color',
            }],
            'description': [
              'The bookcase has several shelves of books.',
            ],
          }, // state after
        ],
        'static': true,
      }, // bookcase
      'suitcase': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'This suitcase is secured with a 4 digit combination lock. Which digits do you want to enter?',
              'This suitcase has a 4 digit combination lock. Which digits do you want to use?',
              'This suitcase is secured with a 4 digit combination lock. Which digits do you want to try?',
            ],
            'question': true,
            'context': 'code',
            'saveState': false,
          }, // look
          {
            'type': [
              'code',
            ],
            'solution': ['1', '9', '6', '4'],
            'description': [
              `That worked! You open the suitcase and find a key.${SSML_BREAK_SHORT}You take the key.`,
            ],
            'audio': [
              'https://actions.google.com/sounds/v1/doors/deadbolt_lock.ogg',
            ],
            'items': [
              'key',
            ],
            'collectedItems': [
              'key',
            ],
          },
          {
            'states': [{
              'item1': 'suitcase',
              'action': 'code',
            }],
            'description': [
              'The suitcase is open and there\'s nothing inside.',
            ],
          }, // state after
          {
            'type': [
              'use',
            ],
            'description': [
              'You try to open the suitcase, but nothing happens.',
            ],
            'saveState': false,
          }, // use anything
          {
            'type': [
              'behind',
            ],
            'description': [
              'There\'s nothing behind the suitcase.',
            ],
            'saveState': false,
          }, // behind
          {
            'type': [
              'climb',
            ],
            'description': [
              'You realize the suitcase can\'t take your weight.',
            ],
            'saveState': false,
          }, // climb
        ],
        'static': true,
      }, // suitcase
      'key': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The key has serrated edges and looks like it\'s made for a door.',
            ],
          }, // look
          {
            'type': [
              'climb',
            ],
            'description': [
              'Don\'t stand on the key; it\'ll bend.',
            ],
            'saveState': false,
          }, // climb
        ],
        'static': false,
      },
      'shelves': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'Each shelf is painted a different color.',
            ],
          }, // look
          {
            'type': [
              'use',
              'put',
            ],
            'item': 'book',
            'description': [
              'You have to pick the right colored shelf. What\'s the color?',
              'You have to pick a colored shelf. Which color?',
              'You have to pick the right colored shelf. Which color?',
            ],
            'question': true,
            'context': 'color',
            'saveState': false,
          }, // user
          {
            'type': [
              'color',
            ],
            'solution': ['indigo'],
            'description': [
              `As you place the book on that shelf, you notice words on the book binders spell out a message.<audio src="https://actions.google.com/sounds/v1/cartoon/siren_whistle.ogg"></audio>${SSML_BREAK_LONG}Magnificent! You've found the easter egg. Your reward is this special hint:${SSML_BREAK_LONG}"The crowbar for the trapdoor is hidden under the bed, but remember to use the flashlight."`,
            ],
            'removedItems': [
              'book',
            ],
            'secret': true,
          }, // code
          {
            'states': [{
              'item1': 'shelves',
              'action': 'color',
            }],
            'description': [
              'The bookcase has several shelves of books.',
            ],
          }, // state after
          {
            'type': [
              'use',
            ],
            'item': 'flashlight',
            'description': [
              `The flashlight shines on shelves. You can see it's made of wood.`,
            ],
            'saveState': false,
          },
        ],
        'static': true,
      },
      'trapdoor': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The trapdoor is flush with the floor and you can\'t open it with your hands. There\'s a small opening on the side.',
            ],
            'items': [
              'opening',
            ],
            'saveState': false,
          }, // look
          {
            'type': [
              'lift',
            ],
            'description': [
              'The trapdoor is flush with the floor and you can\'t open it with your hands. There\'s a small opening on the side.',
            ],
            'items': [
              'opening',
            ],
            'failed': true,
            'saveState': false,
          }, // look
          {
            'type': [
              'use',
              'open',
            ],
            'item': 'crowbar',
            'description': [
              `You leverage the crowbar on the edge of the trapdoor, and you push hard. As the trapdoor swings open, it reveals a staircase that leads down into darkness.`,
            ],
            'items': [
              'stairs',
            ],
            'saveState': true,
          },
          {
            'type': [
              'use',
            ],
            'states': [{
              'item1': 'trapdoor',
              'action': 'use,open',
              'item2': 'crowbar',
            }],
            'item': 'flashlight',
            'description': [
              `The flashlight reveals a winding staircase. You slowly make your way down.`,
            ],
            'win': true,
          },
          {
            'states': [{
              'item1': 'trapdoor',
              'action': 'use,open',
              'item2': 'crowbar',
            }],
            'description': [
              'The trapdoor is open and reveals a staircase that leads down into darkness.',
            ],
            'items': [
              'stairs',
            ],
          }, // state after
          {
            'type': [
              'use',
              'open',
            ],
            'description': [
              'You try to open the trapdoor, but you aren\'t using the right tool.',
            ],
            'failed': true,
            'saveState': false,
          }, // use anything
          {
            'type': [
              'behind',
            ],
            'description': [
              'You can\'t look behind the trapdoor.',
            ],
            'failed': true,
            'saveState': false,
          }, // behind
          {
            'type': [
              'climb',
            ],
            'description': [
              'You climb on top of the trapdoor and get down again.',
            ],
            'saveState': false,
          }, // climb
          {
            'type': [
              'use',
            ],
            'item': 'key',
            'description': [
              `The trapdoor doesn't have a lock.`,
            ],
            'failed': true,
            'saveState': false,
          },
          {
            'type': [
              'use',
            ],
            'item': 'flashlight',
            'description': [
              `The flashlight shines on trapdoor. You can see it's made of wood.`,
            ],
            'saveState': false,
          },
        ],
        'static': true,
      }, // trapdoor
      'opening': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The trapdoor has a small opening on the side.',
            ],
            'saveState': false,
          }, // look
          {
            'type': [
              'lift',
            ],
            'description': [
              'The trapdoor is flush with the floor and you can\'t open it with your hands.',
            ],
            'failed': true,
            'saveState': false,
          }, // look
          {
            'type': [
              'use',
              'open',
            ],
            'item': 'crowbar',
            'description': [
              `You leverage the crowbar on the opening, and you push hard. As the trapdoor swings open, it reveals a staircase that leads down into darkness.`,
            ],
            'items': [
              'stairs',
            ],
            'saveState': true,
          },
          {
            'type': [
              'use',
            ],
            'states': [{
              'item1': 'trapdoor',
              'action': 'use,open',
              'item2': 'crowbar',
            }],
            'item': 'flashlight',
            'description': [
              `The flashlight reveals a winding staircase. You slowly make your way down.`,
            ],
            'win': true,
          },
          {
            'states': [{
              'item1': 'trapdoor',
              'action': 'use,open',
              'item2': 'crowbar',
            }],
            'description': [
              'The trapdoor is open and reveals a staircase that leads down into darkness.',
            ],
            'items': [
              'stairs',
            ],
          }, // state after
          {
            'type': [
              'use',
              'open',
            ],
            'description': [
              'You try to open the trapdoor, but you aren\'t using the right tool.',
            ],
            'failed': true,
            'saveState': false,
          }, // use anything
          {
            'type': [
              'behind',
            ],
            'description': [
              'You can\'t look behind the trapdoor.',
            ],
            'failed': true,
            'saveState': false,
          }, // behind
          {
            'type': [
              'climb',
            ],
            'description': [
              'You climb on top of the trapdoor and get down again.',
            ],
            'saveState': false,
          }, // climb
        ],
        'static': true,
      }, // opening
      'stairs': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The staircase leads down into darkness.',
            ],
          }, // look
          {
            'type': [
              'climb down',
              'take',
              'use item',
            ],
            'description': [
              `You slowly make your way down the dark staircase. And tumble down the stairs.`,
            ],
            'lose': true,
            'saveState': false,
          },
          {
            'type': [
              'use',
            ],
            'item': 'flashlight',
            'description': [
              `The flashlight reveals a winding staircase. You slowly make your way down.`,
            ],
            'win': true,
          },
        ],
        'static': true,
      }, // stairs
      'rug': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The rug looks old and dusty.',
            ],
          }, // look
          {
            'type': [
              'lift',
              'move',
              'open',
              'under',
              'below',
            ],
            'description': [
              `You lift the rug and discover a trapdoor.`,
            ],
            'items': [
              'trapdoor',
            ],
          }, // lift
          {
            'states': [{
              'item1': 'rug',
              'action': 'lift,open,move,under,below',
            }],
            'description': [
              'The rug is folded over and you see a trapdoor underneath.',
            ],
          }, // state after
          {
            'type': [
              'climb',
            ],
            'description': [
              'You get on the rug.',
            ],
            'saveState': false,
          }, // climb
        ],
        'static': true,
      }, // rug
      'floor': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The floor is dusty.',
            ],
          }, // look
          {
            'type': [
              'wipe',
            ],
            'description': [
              'The floor is still dusty.',
            ],
            'saveState': false,
          }, // wipe
          {
            'type': [
              'lift',
            ],
            'description': [
              'You can\'t lift the floor.',
            ],
            'failed': true,
            'saveState': false,
          }, // lift
        ],
        'static': true,
      }, // floor
      'ceiling': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The ceiling light is out of reach.',
            ],
          }, // look
        ],
        'static': true,
      }, // ceiling
      'wall': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The wall is just a wall.',
            ],
          }, // look
        ],
        'static': true,
      }, // wall
      'light': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The light is out of reach.',
            ],
          }, // look
        ],
        'static': true,
      }, // light
      'poster': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'It\'s a poster of the 1964, New York World\'s Fair.',
            ],
          }, // look
          {
            'type': [
              'move',
              'straighten',
              'lift',
            ],
            'description': [
              'Only the wall is behind the poster.',
            ],
            'saveState': false,
          }, // use move
          {
            'type': [
              'behind',
            ],
            'description': [
              'As you look behind the poster, you only see the wall.',
            ],
            'saveState': false,
          }, // use move
          {
            'states': [{
              'item1': 'poster',
              'action': 'move,straighten,behind,lift',
            }],
            'description': [
              'It\'s a poster of the 1964 New York World\'s Fair.',
            ],
            'saveState': false,
          }, // state after
          {
            'type': [
              'use',
            ],
            'description': [
              'You scratch the poster.',
            ],
            'saveState': false,
          }, // use anything
          {
            'type': [
              'climb',
            ],
            'description': [
              'You can\'t get on top of the poster.',
            ],
            'failed': true,
            'saveState': false,
          }, // climb
        ],
        'static': true,
      }, // poster
    }, // room stuff
  },
  // ////////////////////////////////////////////////////////////////////////////
  '3': {
    'name': [
      'Garage',
    ],
    'tagline': `Why isn't the switch working?`,
    'level': 'Super hard',
    'image': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Icon_tools_red.svg/200px-Icon_tools_red.svg.png',
    'imageWin': 'https://upload.wikimedia.org/wikipedia/commons/7/79/StarIconGold.png',
    'imageEasterEgg': 'https://upload.wikimedia.org/wikipedia/commons/f/f4/StarIconBronze.png',
    'imageEasterEggWin': 'https://upload.wikimedia.org/wikipedia/commons/1/12/StarIconSilver.png',
    'rewards': [
      {
        'description': [
          'You need to pick up items to put them in your inventory.',
        ],
        'actions': [
          {
            'type': [
              'look',
            ],
            'items': [
              'bench',
            ],
          },
        ],
      },
      {
        'description': [
          'You can use electrical tape to fix the wires.',
        ],
        'actions': [
          {
            'type': [
              'look',
            ],
            'items': [
              'wires',
            ],
          },
        ],
      },
      {
        'description': [
          'You can look behind items you find.',
        ],
        'actions': [
          {
            'type': [
              'direction',
            ],
            'values': [
              'west',
            ],
          },
        ],
      },
      {
        'description': [
          'You can use a screwdriver on items that have screws.',
        ],
        'actions': [
          {
            'type': [
              'look',
            ],
            'items': [
              'switch',
            ],
          },
        ],
      },
    ],
    'actions': [
      {
        'description': [
          'You are in a garage.',
        ],
      }, // look
    ], // room actions
    'directions': {
      'north': {
        'actions': [
          {
            'description': [
              'You see a bench against the wall.',
            ],
            'items': [
              'bench',
            ],
          },
          {
            'states': [{
              'item1': 'bench',
              'action': 'move',
            }],
            'description': [
              'The bench is underneath the motor.',
            ],
          }, // state after
        ],
      }, // north
      'south': {
        'actions': [
          {
            'description': [
              'There\'s a garage door that spans the entire wall.',
            ],
            'items': [
              'garage door',
            ],
          },
        ],
      }, // south
      'west': {
        'actions': [
          {
            'description': [
              'There\'s a clock, and a poster hanging on the wall.',
            ],
            'items': [
              'clock',
              'poster',
            ],
          },
        ],
      }, // west
      'east': {
        'actions': [
          {
            'description': [
              'You see a switch, and a stack of old paint cans.',
            ],
            'items': [
              'switch',
              'paint cans',
            ],
          },
        ],
      }, // east
      'down': {
        'actions': [
          {
            'description': [
              'You look down and see a concrete floor.',
            ],
          },
        ],
      }, // down
      'up': {
        'actions': [
          {
            'description': [
              'You look up and see a garage door motor attached to the ceiling. A track runs from the motor to the garage door.',
            ],
            'items': [
              'motor',
              'track',
              'garage door',
            ],
          },
        ],
      }, // up
    }, // room directions
    'stuff': {
      'paint cans': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'There are 3 indigo, 1 lime, 4 ebony, and 2 ruby paint cans.',
            ],
          }, // look
          {
            'type': [
              'move',
              'straighten',
            ],
            'description': [
              'The wall is behind the paint cans.',
            ],
            'saveState': false,
          }, // use move
          {
            'type': [
              'lift',
              'below',
              'under',
            ],
            'description': [
              'There is nothing under the paint cans.',
            ],
            'saveState': false,
          }, // use move
          {
            'type': [
              'behind',
            ],
            'description': [
              'As you look behind the paint cans, you only see the wall.',
            ],
            'saveState': false,
          }, // use move
          {
            'states': [{
              'item1': 'paint cans',
              'action': 'move,straighten,behind',
            }],
            'description': [
              'There are 3 indigo, 2 lime, and 3 ruby paint cans.',
            ],
            'saveState': false,
          }, // state after
          {
            'type': [
              'use',
            ],
            'description': [
              'You scratch the paint cans.',
            ],
            'saveState': false,
          }, // use anything
          {
            'type': [
              'climb',
            ],
            'description': [
              'You get on top of the paint cans, but the garage door motor is out of reach. You get down again.',
            ],
            'items': [
              'motor',
            ],
            'saveState': false,
          }, // use anything
        ],
        'static': true,
        'multiple': true,
      }, // poster
      'clock': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The clock isn\'t ticking. It stopped at quarter past one.',
            ],
          }, // look
          {
            'type': [
              'move',
              'straighten',
              'lift',
            ],
            'description': [
              'As you adjust the clock, you notice a safe hidden behind it.',
            ],
            'items': [
              'safe',
            ],
          }, // use move
          {
            'type': [
              'behind',
            ],
            'description': [
              'As you look behind the clock, you discover a hidden safe.',
            ],
            'items': [
              'safe',
            ],
          }, // use move
          {
            'states': [{
              'item1': 'clock',
              'action': 'move,straighten,behind,lift',
            }],
            'description': [
              'The clock is moved aside and you can see a safe. The clock stopped at quarter past one.',
            ],
          }, // state after
          {
            'type': [
              'use',
            ],
            'description': [
              'You scratch the clock.',
            ],
            'saveState': false,
          }, // use anything
          {
            'type': [
              'climb',
            ],
            'description': [
              'You can\'t climb on top of the clock.',
            ],
            'failed': true,
            'saveState': false,
          }, // climb
        ],
        'static': true,
      }, // clock
      'safe': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'This safe has a dial combination lock. To open the safe, you have to make a sequence of both left and right turns. Which direction do you want to start?',
              'The safe has a dial combination lock. To open the safe, you have to make a sequence of both right and left turns. Which direction is the first turn?',
              'This safe is locked with a dial combination. To open the safe, you have to make a sequence of both left and right turns. In which direction do you want to turn first?',
            ],
            'question': true,
            'context': 'turns',
            'saveState': false,
          }, // look
          {
            'type': [
              'turns',
            ],
            'solution': ['left', 'left', 'left', 'left', 'right', 'right', 'right', 'left', 'left', 'left', 'left'], // 4-3-4
            'description': [
              `The safe swings open. Magnificent! You've found the easter egg. Your reward is this special hint:${SSML_BREAK_LONG}"Once you have connected the switch wires with tape, fix the motor to open the door."`,
            ],
            'secret': true,
          },
          {
            'states': [{
              'item1': 'safe',
              'action': 'turns',
            }],
            'description': [
              'The safe is open and there\'s nothing inside.',
            ],
          }, // state after
          {
            'type': [
              'use',
            ],
            'description': [
              'You try to open the safe, but nothing happens.',
            ],
            'saveState': false,
          }, // use anything
          {
            'type': [
              'behind',
            ],
            'description': [
              'You can\'t look behind the safe.',
            ],
            'failed': true,
            'saveState': false,
          }, // behind
          {
            'type': [
              'climb',
            ],
            'description': [
              'You can\'t climb on the safe; it\'s inside the wall.',
            ],
            'failed': true,
            'saveState': false,
          }, // climb
        ],
        'static': true,
      }, // safe
      'garage door': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              `The electric garage door is closed.`,
            ],
          }, // look
          {
            'type': [
              'open',
              'use',
            ],
            'description': [
              `The electric garage door doesn't budge.`,
            ],
            'failed': true,
            'saveState': false,
          }, // look
          {
            'type': [
              'behind',
            ],
            'description': [
              'You can\'t see behind the garage door.',
            ],
            'failed': true,
            'saveState': false,
          }, // behind
          {
            'type': [
              'use',
            ],
            'item': 'tape',
            'description': [
              `Electrical tape won't do much to the garage door.`,
            ],
            'failed': true,
            'saveState': false,
          },
        ],
        'static': true,
      }, // garage door
      'poster': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The poster is an advertisement of a sports car.',
            ],
          }, // look
          {
            'type': [
              'move',
              'straighten',
              'lift',
            ],
            'description': [
              'Only the wall is behind the poster.',
            ],
            'saveState': false,
          }, // use move
          {
            'type': [
              'behind',
            ],
            'description': [
              'As you look behind the poster, you see the number <say-as interpret-as="cardinal">434</say-as> printed on the back.',
            ],
            'saveState': false,
          }, // use move
          {
            'states': [{
              'item1': 'poster',
              'action': 'move,straighten,behind,lift',
            }],
            'description': [
              'The poster is an advertisement of a sports car.',
            ],
            'saveState': false,
          }, // state after
          {
            'type': [
              'use',
            ],
            'description': [
              'You scratch the poster.',
            ],
            'saveState': false,
          }, // use anything
          {
            'type': [
              'climb',
            ],
            'description': [
              `You can't get on top of the poster.`,
            ],
            'failed': true,
            'saveState': false,
          }, // use anything
        ],
        'static': true,
      }, // poster
      'advertisement': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'It\'s an advertisement of a sports car.',
            ],
            'items': [
              'poster',
            ],
          }, // look
        ],
        'static': false,
      }, // advertisement
      'car': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'It\'s an advertisement of a sports car.',
            ],
            'items': [
              'poster',
            ],
          }, // look
        ],
        'static': false,
      }, // car
      'bench': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'There\'s a toolbox, and a roll of electrical tape on top of the bench.',
            ],
            'items': [
              'toolbox',
              'tape',
            ],
          }, // look
          {
            'type': [
              'move',
            ],
            'description': [
              `You move the bench underneath the motor. You get on top of the bench and inspect the motor. One of the nuts is loose.`,
            ],
            'items': [
              'nut',
              'motor',
            ],
          }, // move
          {
            'type': [
              'move',
            ],
            'states': [{
              'item1': 'tape',
              'action': 'take',
            }],
            'description': [
              `You move the bench underneath the motor. You get on top of the bench and inspect the motor. One of the nuts is loose.`,
            ],
            'items': [
              'nut',
              'motor',
            ],
          }, // move
          {
            'type': [
              'look',
            ],
            'states': [{
              'item1': 'tape',
              'action': 'take',
            }],
            'description': [
              'There\'s a toolbox on top of the bench.',
            ],
          }, // look
          {
            'type': [
              'climb',
            ],
            'description': [
              'You get on top of the bench, but don\'t find anything new and get down again.',
            ],
            'saveState': false,
          }, // climb
          {
            'states': [{
              'item1': 'bench',
              'action': 'move',
            }],
            'description': [
              'The bench is underneath the motor.',
            ],
          }, // state after
          {
            'type': [
              'climb',
            ],
            'states': [{
              'item1': 'bench',
              'action': 'move',
            }],
            'description': [
              'You get on top of the bench and inspect the motor. One of the nuts is loose.',
            ],
            'items': [
              'nut',
            ],
            'saveState': false,
          }, // state after
        ],
        'static': true,
      }, // bench
      'motor': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The garage door motor is attached to the ceiling.',
            ],
            'items': [
              'garage door',
            ],
          }, // look
          {
            'type': [
              'fix',
            ],
            'states': [{
              'item1': 'bench',
              'action': 'move',
            }],
            'description': [
              'You try to fix the motor, but you are using the wrong tool.',
            ],
            'failed': true,
            'saveState': false,
          }, // look
          {
            'type': [
              'look',
            ],
            'states': [{
              'item1': 'motor',
              'action': 'use',
              'item2': 'wrench',
            }],
            'description': [
              'The garage door motor is attached to the ceiling.',
            ],
            'failed': true,
            'saveState': false,
          }, // look
          {
            'type': [
              'look',
            ],
            'states': [{
              'item1': 'nut',
              'action': 'use',
              'item2': 'wrench',
            }],
            'description': [
              'The garage door motor is attached to the ceiling.',
            ],
            'failed': true,
            'saveState': false,
          }, // look
          {
            'type': [
              'use',
            ],
            'states': [{
              'item1': 'bench',
              'action': 'move',
            }],
            'item': 'screwdriver',
            'description': [
              'You try to fix the motor, but you are using the wrong tool.',
            ],
            'failed': true,
            'saveState': false,
          }, // look
          {
            'type': [
              'use',
            ],
            'states': [{
              'item1': 'bench',
              'action': 'move',
            }],
            'item': 'wrench',
            'description': [
              `You use the wrench to tighten the nut on the motor.`,
            ],
            'items': [
              'nut',
            ],
          }, // use
          {
            'type': [
              'use',
            ],
            'item': 'wrench',
            'description': [
              'The garage door motor is out of reach.',
            ],
            'failed': true,
            'saveState': false,
          }, // use
          {
            'type': [
              'use',
            ],
            'item': 'screwdriver',
            'description': [
              'The garage door motor is out of reach.',
            ],
            'failed': true,
            'saveState': false,
          }, // use
          {
            'type': [
              'use',
            ],
            'item': 'tape',
            'description': [
              'The garage door motor is out of reach.',
            ],
            'failed': true,
            'saveState': false,
          }, // use
          {
            'type': [
              'fix',
              'touch',
            ],
            'description': [
              'The garage door motor is out of reach.',
            ],
            'items': [
              'garage door',
            ],
            'failed': true,
            'saveState': false,
          }, // look
          {
            'type': [
              'use',
            ],
            'item': 'tape',
            'description': [
              `You need a different tool to do that.`,
            ],
            'failed': true,
            'saveState': false,
          },
        ],
        'static': false,
      }, // motor
      'track': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'A track runs from the garage door motor to the door.',
            ],
            'items': [
              'motor',
              'garage door',
            ],
          }, // look
        ],
        'static': false,
      }, // track
      'nut': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The nut is loose.',
            ],
          }, // look
          {
            'type': [
              'look',
            ],
            'states': [{
              'item1': 'nut',
              'action': 'use',
              'item2': 'wrench',
            }],
            'description': [
              'The nut is tight against the motor.',
            ],
            'failed': true,
            'saveState': false,
          }, // look
          {
            'type': [
              'look',
            ],
            'states': [{
              'item1': 'motor',
              'action': 'use',
              'item2': 'wrench',
            }],
            'description': [
              'The nut is tight against the motor.',
            ],
            'failed': true,
            'saveState': false,
          }, // look
          {
            'type': [
              'use',
            ],
            'states': [{
              'item1': 'bench',
              'action': 'move',
            }],
            'item': 'wrench',
            'description': [
              `You use the wrench to tighten the nut.`,
            ],
          }, // use
          {
            'type': [
              'fix',
            ],
            'states': [{
              'item1': 'bench',
              'action': 'move',
            }],
            'description': [
              'You try to fix the nut, but you are using the wrong tool.',
            ],
            'failed': true,
            'saveState': false,
          }, // look
          {
            'type': [
              'use',
            ],
            'states': [{
              'item1': 'bench',
              'action': 'move',
            }],
            'item': 'screwdriver',
            'description': [
              'You try to fix the nut, but you are using the wrong tool.',
            ],
            'failed': true,
            'saveState': false,
          }, // look
          {
            'states': [{
              'item1': 'nut',
              'action': 'use',
              'item2': 'wrench',
            }],
            'description': [
              'The nut is tight against the motor.',
            ],
          }, // state after
        ],
        'static': true,
      }, // nut
      'toolbox': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'This toolbox is secured with a 4 digit combination lock. Which digits do you want to enter?',
              'This toolbox has a 4 digit combination lock. Which digits do you want to use?',
              'This toolbox is secured with a 4 digit combination lock. Which digits do you want to try?',
            ],
            'question': true,
            'context': 'code',
            'saveState': false,
          }, // look
          {
            'type': [
              'code',
            ],
            'solution': ['1', '3', '1', '5'],
            'description': [
              `That worked! You open the toolbox and find a screwdriver and a wrench.${SSML_BREAK_SHORT}You pick up both.`,
            ],
            'audio': [
              'https://actions.google.com/sounds/v1/doors/deadbolt_lock.ogg',
            ],
            'items': [
              'screwdriver',
              'wrench',
            ],
            'collectedItems': [
              'screwdriver',
              'wrench',
            ],
          },
          {
            'states': [{
              'item1': 'toolbox',
              'action': 'code',
            }],
            'description': [
              'The toolbox is open and there\'s nothing inside.',
            ],
          }, // state after
          {
            'type': [
              'use',
            ],
            'description': [
              'You try to open the toolbox, but nothing happens.',
            ],
            'saveState': false,
          }, // use anything
          {
            'type': [
              'behind',
            ],
            'description': [
              'There\'s nothing behind the toolbox.',
            ],
            'saveState': false,
          }, // behind
          {
            'type': [
              'climb',
            ],
            'description': [
              'You realize the toolbox can\'t take your weight.',
            ],
            'failed': true,
            'saveState': false,
          }, // climb
        ],
        'static': true,
      }, // toolbox
      'screwdriver': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The screwdriver has a plastic handle and a metal shaft.',
            ],
          }, // look
        ],
        'static': false,
      }, // screwdriver
      'wrench': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The ratcheting wrench is made of metal.',
            ],
          }, // look
        ],
        'static': false,
      }, // wrench
      'tape': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The electrical tape is made of vinyl.',
            ],
          }, // look
        ],
        'static': false,
      }, // tape
      'switch': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The switch plate is screwed to the wall.',
            ],
          }, // look
          {
            'type': [
              'use',
            ],
            'item': 'screwdriver',
            'description': [
              `Using the screwdriver, you remove the switch plate from the wall. As you look inside the electrical box, you notice that the wires are disconnected.`,
            ],
            'items': [
              'wires',
              'electrical box',
            ],
          }, // use screwdriver
          {
            'type': [
              'on',
            ],
            'states': [{
              'item1': 'wires',
              'action': 'colors',
            },
              {
                'item1': 'nut',
                'action': 'use',
                'item2': 'wrench',
              }],
            'description': [
              `You flip the switch and the garage door starts to open. The motor has failed again.${SSML_BREAK_LONG}You notice there is just enough room below the door to squeeze through. You get down on the floor and start to crawl.`,
            ],
            'win': true,
          }, // state after
          {
            'type': [
              'on',
            ],
            'states': [{
              'item1': 'wires',
              'action': 'colors',
            },
              {
                'item1': 'motor',
                'action': 'use',
                'item2': 'wrench',
              }],
            'description': [
              `You flip the switch and the garage door starts to open. The motor has failed again.${SSML_BREAK_LONG}You notice there is just enough room below the door to squeeze through. You get down on the floor and start to crawl.`,
            ],
            'win': true,
          }, // state after
          {
            'type': [
              'look',
            ],
            'states': [{
              'item1': 'switch',
              'action': 'use',
              'item2': 'screwdriver',
            }],
            'description': [
              'The switch plate is removed and wires are visible.',
            ],
          }, // state after
          {
            'type': [
              'use',
            ],
            'description': [
              'You try to force the switch plate open, but it doesn\'t budge.',
            ],
            'saveState': false,
          }, // use anything
          {
            'type': [
              'behind',
            ],
            'description': [
              'You can\'t look behind the switch.',
            ],
            'failed': true,
            'saveState': false,
          }, // behind
          {
            'type': [
              'climb',
            ],
            'description': [
              'You can\'t get on top of the switch; it\'s inside the wall.',
            ],
            'failed': true,
            'saveState': false,
          }, // climb
          {
            'type': [
              'on',
            ],
            'description': [
              `You flip the switch, but nothing happens.`,
            ],
            'saveState': false,
          }, // on
          {
            'type': [
              'on',
            ],
            'states': [{
              'item1': 'wires',
              'action': 'colors',
            }],
            'description': [
              `You flip the switch. A sound is coming from above. Something isn't right with the garage motor.`,
            ],
            'saveState': false,
          }, // on
          {
            'type': [
              'on',
            ],
            'states': [{
              'item1': 'switch',
              'action': 'use',
              'item2': 'screwdriver',
            }],
            'description': [
              `You flip the switch, but nothing happens.`,
            ],
          }, // state after
        ],
        'static': true,
      }, // switch
      'wires': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The wires are disconnected.',
            ],
          }, // look
          {
            'type': [
              'use',
            ],
            'description': [
              'You use the electrical tape to connect the wires. Each wire has a color: blue, green, black, and red. In what order would you like to connect them?',
              'You use the tape to fix the wires. The wires are red, black, green, and blue. In what order would you like to connect them?',
              'You use the tape on the wires. The wires are green, red, black, and blue. In what order would you like to fix them?',
            ],
            'item': 'tape',
            'question': true,
            'context': 'colors',
            'saveState': false,
          }, // look
          {
            'type': [
              'use',
            ],
            'states': [{
              'item1': 'nut',
              'action': 'use',
              'item2': 'wrench',
            }],
            'description': [
              'You use the electrical tape to connect the wires. Each wire has a color: blue, green, black, and red. In what order would you like to connect them?',
              'You use the tape to fix the wires. The wires are red, black, green, and blue. In what order would you like to connect them?',
              'You use the tape on the wires. The wires are green, red, black, and blue. In what order would you like to fix them?',
            ],
            'item': 'tape',
            'question': true,
            'context': 'colors',
            'saveState': false,
          }, // look
          {
            'type': [
              'colors',
            ],
            'states': [{
              'item1': 'nut',
              'action': 'use',
              'item2': 'wrench',
            }],
            'solution': ['green', 'red', 'blue', 'black'],
            'description': [
              `All 4 wires are now connected. You flip the switch. The motor has failed again.${SSML_BREAK_LONG}You notice there is just enough room below the door to squeeze through. You get down on the floor and start to crawl.`,
            ],
            'win': true,
          },
          {
            'type': [
              'colors',
            ],
            'states': [{
              'item1': 'motor',
              'action': 'use',
              'item2': 'wrench',
            }],
            'solution': ['green', 'red', 'blue', 'black'],
            'description': [
              `All 4 wires are now connected. You flip the switch. The motor has failed again.${SSML_BREAK_LONG}You notice there is just enough room below the door to squeeze through. You get down on the floor and start to crawl.`,
            ],
            'win': true,
          },
          {
            'type': [
              'colors',
            ],
            'solution': ['green', 'red', 'blue', 'black'],
            'description': [
              `All 4 wires are now connected. You flip the switch. A sound is coming from above. Something isn't right with the garage motor.`,
            ],
            'audio': [
              'https://actions.google.com/sounds/v1/household/kitchen_noises.ogg',
            ],
            'items': [
              'motor',
            ],
          },
          {
            'states': [{
              'item1': 'wires',
              'action': 'colors',
            }],
            'description': [
              'The wires are connected.',
            ],
          }, // state after
          {
            'type': [
              'use',
            ],
            'description': [
              'You try fix the wires, but you are using the wrong item.',
            ],
            'saveState': false,
          }, // use anything
          {
            'type': [
              'behind',
            ],
            'description': [
              'The wall is behind the wires.',
            ],
            'saveState': false,
          }, // behind
          {
            'type': [
              'climb',
            ],
            'description': [
              'You can\'t climb on the wires.',
            ],
            'failed': true,
            'saveState': false,
          }, // climb
        ],
        'static': true,
      }, // wires
      'electrical box': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'As you look inside the electrical box, you notice that the wires are disconnected.',
            ],
          }, // look
        ],
        'static': true,
      }, // electrical box
      'floor': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The concrete floor is dusty.',
            ],
          }, // look
          {
            'type': [
              'wipe',
            ],
            'description': [
              'The floor is still dusty.',
            ],
            'saveState': false,
          }, // wipe
          {
            'type': [
              'lift',
            ],
            'description': [
              'You can\'t lift the floor.',
            ],
            'failed': true,
            'saveState': false,
          }, // lift
        ],
        'static': true,
      }, // floor
      'ceiling': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The garage door motor is attached to the ceiling.',
            ],
            'items': [
              'motor',
            ],
          }, // look
        ],
        'static': true,
      }, // ceiling
      'wall': {
        'actions': [
          {
            'type': [
              'look',
            ],
            'description': [
              'The wall is just a wall.',
            ],
          }, // look
        ],
        'static': true,
      }, // wall
    }, // room stuff
  },
};

exports.ROOMS = ROOMS;
