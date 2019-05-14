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

/**
 * All the prompts used in the game (English only). Each prompts has a key
 * and multiple alternative variations that are selected by the fulfillment logic
 * to ensure that prompts are not repeated in sequence.
 */
const prompts = {
  'welcome': [
    `Welcome to Magnificent Escape.`,
  ],
  'welcome_back': [
    `Welcome back to Magnificent Escape.`,
  ],
  'intro': [
    `In this game, you have to escape a room. Follow the clues, and use items to find a way out.`,
  ],
  'lobby': [
    `At the moment you're in the lobby.`,
    `You're in the lobby.`,
  ],
  'lobby_return': [
    `You're back in the lobby.`,
  ],
  'lobby_pick': [
    `There are 3 rooms:`,
  ],
  'lobby_easy': [
    `You can try the %s, or the %s, or you can start with the easiest room, the %s.`,
  ],
  'lobby_hint': [
    `By the way, you can go back to the lobby at any time.`,
  ],
  'rooms': [
    `%s.`,
  ],
  'which_room': [
    `Which would you like?`,
    `Which one would you like?`,
    `Which room would you like?`,
  ],
  'teleport': [
    `You teleport into the %s.`,
  ],
  'invalid_room': [
    `Sorry, I didn't understand that. That doesn't sound like one of the rooms.`,
    `Sorry, I didn't get that. That doesn't sound like the name of a room.`,
    `Sorry, I didn't understand that. That doesn't sound like a room.`,
  ],
  'look_around': [
    `Start by taking a good look around.`,
  ],
  'walls': [
    `The room has 4 walls. North, south, east, and west. You can also look up or down.`,
  ],
  'orientation': [
    `You can look left, right, front, or back.`,
    `You can look right, left, front, or back.`,
  ],
  'which_direction': [
    `Which direction do you want to look?`,
  ],
  'inventory': [
    `At any time, you can look at your inventory of items.`,
  ],
  'inventory_item': [
    `The %s is in you inventory.`,
  ],
  'confirmation': [
    'Sure.',
    'OK.',
    'Alright.',
    'Okay.',
  ],
  'confirmation_encouragement': [
    'You got it.',
    'Nice move.',
    'Nice work.',
    'You did it.',
    `Good job.`,
    `Great job.`,
    `Way to go.`,
  ],
  'done': [
    'Done.',
    'Got it.',
    'OK.',
    'Alright.',
  ],
  'quit_easter_egg': [
    'Sure, but you were so close to finding the easter egg.',
    'OK. And you were so close to finding the easter egg.',
    `Okay, but you were so close to finding the easter egg.`,
  ],
  'quit': [
    'OK. Bye for now. Hope to see you soon.',
    'OK. Come back soon.',
    `Okay, let's try that again later.`,
  ],
  'quit_first': [
    `OK. Pick up right here next time. Hope to see you soon.`,
    `OK. Pick up right here next time. Come back soon.`,
    `Okay, pick up right here next time. See you soon.`,
  ],
  'quit_encourage': [
    `OK. And you were doing so good. Hope to see you soon.`,
    `OK, but you were so close. Come back soon.`,
    `Okay, but you were getting so close. See you soon.`,
  ],
  'quit_talk': [
    'OK. To play again, just say "talk to magnificent escape". Hope to see you soon.',
  ],
  'no_input1': [
    `I didn't catch that. Just say if you need more time.`,
    `If you said something, I didn't catch it. Just say if you need more time.`,
  ],
  'no_input1_direction': [
    `Which direction?`,
  ],
  'no_input1_direction_more': [
    `I didn't catch which direction. Just say if you need more time.`,
  ],
  'no_input1_turns': [
    `What's the next turn?`,
    `What's your next turn?`,
    `The next turn?`,
    `Your next turn?`,
  ],
  'no_input1_turns_more': [
    `I didn't catch the next turn. Just say if you need more time.`,
    `I didn't catch the next turn. Just say if you need time.`,
    `I need the next turn. Just say if you need more time.`,
  ],
  'no_input1_color': [
    `Which color?`,
  ],
  'no_input1_color_more': [
    `I didn't catch which color. Just say if you need more time.`,
  ],
  'no_input1_colors': [
    `Which colors?`,
  ],
  'no_input1_colors_more': [
    `I didn't catch which colors. Just say if you need more time.`,
  ],
  'no_input1_code': [
    `Which code?`,
  ],
  'no_input1_code_more': [
    `I didn't catch which code. Just say if you need more time.`,
  ],
  'no_input1_confirm': [
    `Is your timer settings right?`,
  ],
  'no_input1_lobby': [
    `I didn't catch the room name.`,
  ],
  'no_input2': [
    `I didn't catch that. Could you repeat that?`,
    `If you're still there, say that again.`,
    `If you just said something, I could't hear you. You might want to speak up a bit.`,
  ],
  'no_input2_direction': [
    `I'm still not sure which direction. You can say, for instance, "north", or "east".`,
    `I'm still not sure which direction. You can say, for instance, "south", or "west".`,
  ],
  'no_input2_direction_more': [
    `I'm still not sure which direction. By the way, just say if you need more time.`,
  ],
  'no_input2_turns': [
    `I'm still not sure what's the next turn. You can say, for instance, "left", or "right".`,
    `I'm still not sure what's the next turn. You can say, "right", or "left".`,
  ],
  'no_input2_turns_more': [
    `I'm still not sure what's the next turn. By the way, just say if you need more time.`,
  ],
  'no_input2_color': [
    `I'm still not sure which color. You can say, for instance, "red", or "blue".`,
    `I'm still not sure which color. You can say, for instance, "green", or "red".`,
  ],
  'no_input2_color_more': [
    `I'm still not sure which color. By the way, just say if you need more time.`,
  ],
  'no_input2_colors': [
    `I'm still not sure which colors. You can say, for instance, "red", or "blue".`,
    `I'm still not sure which colors. You can say, for instance, "green", or "red".`,
  ],
  'no_input2_colors_more': [
    `I'm still not sure which colors. By the way, just say if you need more time.`,
  ],
  'no_input2_code': [
    `I'm still not sure which code. You can say, for instance, "1, 2, 3, 4", or "5, 4, 3, 2".`,
    `I'm still not sure which code. You can say, for instance, "1, 2, 3, 4", or "4, 3, 2, 1".`,
  ],
  'no_input2_code_more': [
    `I'm still not sure which code. By the way, just say if you need more time.`,
  ],
  'no_input2_confirm': [
    `I'm still not sure if you agree with the settings. You can say, "yes" or "no".`,
  ],
  'no_input2_lobby': [
    `I'm still not sure which room.`,
  ],
  'no_input3': [
    `Okay, let's try that again later.`,
    'We can stop here. See you soon.',
    `OK, you can try again when you're ready.`,
  ],
  'fallback1': [
    `Sorry, I didn't get that. You can look around or use items. What do you want to do?`,
    `Sorry, I didn't understand that. You can look around or use items. What are you trying to do?`,
    `Sorry, I didn't get that. You can look in various directions, and look at items. What do you want to do?`,
    `Sorry, I didn't understand that. You can look at items and add them to your inventory. What are you trying to do?`,
    `Sorry, I didn't get that. You can add items to you inventory and then use them to solve puzzles. What do you want to do?`,
    `Sorry, I didn't understand that. You can use items you find, to solve puzzles. What do you want to do?`,
    `Sorry, I didn't get that. The room is filled with clues. What do you want to do?`,
    `Sorry, I didn't understand that. Look in every direction, and look at every item. What do you want to do?`,
    `Sorry, I didn't get that. Try using items you've found, on other things in the room. What are you trying to do?`,
  ],
  'fallback1_item': [
    `I'm not sure what you're trying to do with the %s. Maybe try looking at something else?`,
    `I'm not sure what you want to do with the %s. Want to try looking at something else?`,
  ],
  'fallback1_stuck': [
    `Looks like we are talking past each other. You can look in different directions or look at items you've found. You can also use items on other things in the room. What do you want to try now?`,
    `Looks like we are talking past one another. You can look in different directions or look at items you've found. You can also use an item on other things in the room. What do you want to do now?`,
  ],
  'fallback1_look': [
    `You can look in various directions, and look at items. What do you want to do?`,
    `Look in every direction, and look at every item. What do you want to do?`,
  ],
  'fallback1_use': [
    `You can use items you find, to solve puzzles. What do you want to do?`,
    `Try using items you've found, on other things in the room. What are you trying to do?`,
  ],
  'fallback1_question': [
    `What do you want to do?`,
    `What are you trying to do?`,
  ],
  'fallback1_direction': [
    `Sorry, which direction?`,
  ],
  'fallback1_color': [
    `Sorry, which color?`,
  ],
  'fallback1_colors': [
    `Sorry, which colors?`,
  ],
  'fallback1_code': [
    `Sorry, which code?`,
  ],
  'fallback1_turns': [
    `Sorry, which turn next?`,
    `Sorry, what's the next turn?`,
    `Sorry, the next turn?`,
    `Sorry, your next turn?`,
  ],
  'fallback1_turns_too_many': [
    `Sorry, only one turn at a time. Which turn next?`,
    `Sorry, only one turn at a time. What's the next turn?`,
    `Sorry, only one turn at a time. The next turn?`,
    `Sorry, only one turn at a time. Your next turn?`,
  ],
  'fallback1_confirm': [
    `Sorry, is the settings right?`,
  ],
  'fallback1_sorry': [
    `Sorry, I didn't understand that.`,
    `Sorry, I didn't get that.`,
  ],
  'fallback1_sorry_item': [
    `Sorry, I didn't understand what you're trying to do with the %s.`,
    `Sorry, I didn't get what you want to do with the %s.`,
  ],
  'fallback1_still_sorry': [
    `Sorry, I still didn't understand that.`,
    `Sorry, I still didn't get that.`,
  ],
  'fallback1_still_sorry_item': [
    `Sorry, I still didn't understand what you're trying to do with the %s.`,
    `Sorry, I still didn't get what you want to do with the %s.`,
  ],
  'fallback1_and': [
    `<prosody rate="medium">Hmmm,</prosody><break time="500ms"/>it's better to do one command at a time. Could you try again?`,
    `<prosody rate="medium">Uhm,</prosody><break time="500ms"/>it's better one command at a time. Try again?`,
  ],
  'fallback2': [
    `Sorry, what was that?`,
    `Sorry, say that again?`,
  ],
  'fallback2_question': [
    `What was that?`,
    `Say that again?`,
  ],
  'fallback2_direction': [
    `I still didn't get that. Which direction?`,
    `I still didn't understand that. Which direction?`,
  ],
  'fallback2_color': [
    `I still didn't get that. Which color?`,
    `I still didn't understand that. Which color?`,
  ],
  'fallback2_colors': [
    `I still didn't get that. Which colors?`,
    `I still didn't understand that. Which colors?`,
  ],
  'fallback2_code': [
    `I still didn't get that. Which code?`,
    `I still didn't understand that. Which code?`,
  ],
  'fallback2_turns': [
    `I still didn't get that. What's the next turn?`,
    `I still didn't understand that. What's the next turn?`,
  ],
  'fallback2_confirm': [
    `I still didn't get that. Is your timer settings right?`,
    `I still didn't understand that. Is your timer settings right?`,
  ],
  'fallback2_lobby': [
    `I still didn't get that.`,
    `I still didn't understand that.`,
  ],
  'fallback3': [
    `Hmmm. Since I'm still having trouble, I'll stop here.`,
    `Since I'm still having trouble, I'll stop here. Try again later.`,
    `Since I'm still having trouble, I'll stop here. Bye for now.`,
  ],
  'lobby_help': [
    `You could start with something easy, like the office.`,
  ],
  'help': [
    `You can look in various directions, and look at items. You can say, for instance, "look north", or you can look at an item you've found. So, what do you want to do next?`,
    `You can look at items and add them to your inventory. Also, you can use items on other things in the room. So, what's next?`,
    `You can look at items and add them to your inventory. Also, you can use the items to solve puzzles. So, what's next?`,
    `You can add items to you inventory and then use them to solve puzzles. So, what do you want to do next?`,
    `You can use items you find, to solve puzzles. Also, just ask for more time if you aren't ready. So, what's next?`,
    `The room is filled with clues. You also can say "exit" at any time if you want to end this Action and talk to the Assistant. So, what's next?`,
  ],
  'help_direction': [
    `The room has 4 walls. Look north, south, east, or west. You can also look up or down.`,
  ],
  'help_tool': [
    `You can look at items and add them to your inventory. Also, you can use the items to solve puzzles. So, what's next?`,
    `You can add items to you inventory and then use them to solve puzzles. So, what do you want to do next?`,
    `You can use items on other things in the room. So, what do you want to do next?`,
  ],
  'help_hint': [
    'By the way, at any time, you can ask for a hint.',
  ],
  'help_item': [
    `By the way, you can look at any item you've found.`,
  ],
  'help_use': [
    'By the way, you can use items you find to solve puzzles.',
  ],
  'help_more_time': [
    `By the way, if you're not ready, you can ask for more time.`,
  ],
  'help_inventory': [
    `By the way, at any time, you can check your inventory for items you've picked up.`,
  ],
  'help_look_count': [
    `By the way, you can also open, move, and lift items.`,
  ],
  'by_the_way': [
    `By the way, %s`,
  ],
  'hint': [
    `Look in every direction, and look at every item.`,
    `Try using items you've found, on other things in the room.`,
    `Pick up items you find in the room.`,
    `Check your inventory for items you've found. You can say, for instance, "what's in my inventory".`,
    `Search for tools, and pick them up.`,
  ],
  'hint_direction': [
    `Try looking %s.`,
    `You might want to try looking %s.`,
  ],
  'hint_item': [
    `Try looking at the %s.`,
    `You might want to try looking at the %s.`,
  ],
  'hint_action': [
    `Try doing something with the %s.`,
    `Try using the %s.`,
    `You might want to try using the %s.`,
  ],
  'hint_action_item': [
    `You can use another item on the %s.`,
    `Try using another item on the %s.`,
    `You might want to try using another item on the %s.`,
  ],
  'hint_inventory': [
    `Pick up items you find in the room. They are added to your inventory.`,
    `Take the items you find in the room. They are added to your inventory.`,
  ],
  'hint_colors': [
    `You might want to look for hints in the room that helps you pick the right order of the colors.`,
    `You might find hints in the room to help you pick the right order of the colors.`,
  ],
  'hint_colors_next': [
    `So, which 4 colors do you want to try?`,
  ],
  'hint_color': [
    `You might want to look for hints in the room that helps you pick the right color.`,
    `You might find hints in the room to help you pick the right color.`,
  ],
  'hint_color_next': [
    `So, which color do you want to try?`,
  ],
  'hint_code': [
    `You might want to look for hints in the room that helps you pick the right order of the digits.`,
    `You might find hints in the room to help you pick the right order of the digits.`,
  ],
  'hint_code_next': [
    `So, which 4 digits do you want to enter?`,
  ],
  'hint_directions': [
    `You might want to look for hints in the room that helps you pick the right order in which to turn.`,
    `You might find hints in the room to help you pick the right order in which to turn.`,
  ],
  'hint_directions_next': [
    `So, which 4 directions do you want to try?`,
  ],
  'hint_turns': [
    `You might want to look for a hint in the room that helps you with the sequence of turns.`,
    `The room has a hint to help you pick the right sequence of turns.`,
  ],
  'hint_turns_next': [
    `So, in which direction do you want to turn?`,
  ],
  'hint_limit1': [
    `You don't have any hints yet. Try exploring the room to earn hints.`,
    `You don't have any hints yet. Look around the room to earn hints.`,
  ],
  'hint_limit': [
    `You've used up all your hints. Look around the room to earn more hints.`,
    `You've used up your hints. Try exploring the room to earn hints.`,
  ],
  'whatdo_static': [
    `You can examine items and also look above, below, or inside them.`,
  ],
  'whatdo_item': [
    `You can pick up items and add them to your inventory. These can then be used on other things you find in the room.`,
  ],
  'walkthrough': [
    `There isn't a walkthrough, but you can ask for hints.`,
  ],
  'repeat': [
    'Here it is again: ',
    'Let me repeat that: ',
    'Let me say that again: ',
  ],
  'error': [
    'Oops! Something went wrong. Please try again later.',
  ],
  'end': [
    'Hope to see you soon.',
    'Come back soon.',
    `Let's do that again soon.`,
  ],
  'congrats': [
    `You're done!`,
    `You did it!`,
    `There. You did it!`,
  ],
  'press_play': [
    `Press the play button in the player to start.`,
  ],
  'again': [
    `Let's try again.`,
    `Let's try that again.`,
    `Let's do it again.`,
    `Let's do that again.`,
  ],
  'assistant_handoff': [
    `Looks like you want to talk to the Assistant. Let's end it here and you can try asking the Assistant again.`,
    `It sounds like you want to talk to the Assistant. Let's end it here and you can try asking the Assistant again.`,
  ],
  'rate': [
    `You can review Magnificent Escape in the Actions directory.`,
  ],
  'media_error': [
    `Oops! Your timer is too long. Try something shorter.`,
  ],
  'options': [
    'You can say: ',
    'You can pick from: ',
  ],
  'found_item': [
    `You've already found the %s in this room.`,
  ],
  'not_found_item': [
    `You haven't found the %s.`,
  ],
  'not_found_direction': [
    `That isn't a valid direction.`,
    `That isn't a direction.`,
  ],
  'not_support_direction': [
    `There isn't anything in that direction.`,
    `There's nothing in that direction.`,
  ],
  'dropped_contents': [
    `You also previously dropped %s on the floor.`,
    `The floor has %s that you dropped.`,
  ],
  'inventory_contents': [
    `Right now you have %s in your inventory.`,
    `Your inventory has %s.`,
  ],
  'no_inventory': [
    `There are no items in your inventory. As you explore the room, you find items. They are handy later on.`,
    `Your inventory is empty. As you explore the room, you find items. They are useful later on.`,
  ],
  'item_not_inventory': [
    `The %s isn't in your inventory.`,
  ],
  'items_instructions': [
    `You can use items from your inventory on other objects in the room.`,
    `Try using items in your inventory.`,
    `Try using items from your inventory.`,
    `You might want to try using items from your inventory.`,
  ],
  'inventory_instructions': [
    `You can pick up items you find in the room.`,
    `You can take items you find in the room.`,
  ],
  'inventory_added': [
    `The %s has been added to your inventory.`,
  ],
  'dropped_added': [
    `You reach down and pick up the %s from the floor, and add it to your inventory.`,
  ],
  'inventory_removed': [
    `You remove the %s from your inventory and drop it on the floor.`,
  ],
  'inventory_duplicate': [
    `The %s is already in your inventory.`,
  ],
  // ['Open', 'Lift', 'Turn', 'Move', 'Fix', 'Listen']
  'action_not_supported': [
    `<prosody rate="medium">Uhm,</prosody><break time="500ms"/>that didn't work.`,
    `<prosody rate="medium">Hmmm,</prosody><break time="500ms"/>that didn't work.`,
    `<prosody rate="medium">Mmm,</prosody><break time="500ms"/>that didn't work.`,
    `<prosody rate="medium">Mmm,</prosody><break time="500ms"/>that didn't do much.`,
    `<prosody rate="medium">Uhm,</prosody><break time="500ms"/>that didn't do much.`,
    `<prosody rate="medium">Hmmm,</prosody><break time="500ms"/>that didn't do much.`,
  ],
  'action_encouragement': [
    `But it was worth a try.`,
    `Good try though.`,
    `I can see why you'd guess that.`,
    `Good guess though.`,
    `No luck that time.`,
    `Better luck next time.`,
    `But hang in there.`,
  ],
  // 'Open', 'Lift', 'Turn', 'Move', 'Fix'
  'open_not_supported': [
    `<prosody rate="medium">Mmm,</prosody><break time="500ms"/>the %s can't be opened.`,
  ],
  'open_not_supported_safe': [
    `<prosody rate="medium">Mmm,</prosody><break time="500ms"/>the %s doesn't budge.`,
  ],
  'open_not_supported_suitcase': [
    `<prosody rate="medium">Mmm,</prosody><break time="500ms"/>the %s doesn't budge.`,
  ],
  'open_not_supported_toolbox': [
    `<prosody rate="medium">Mmm,</prosody><break time="500ms"/>the %s doesn't budge.`,
  ],
  'cannot_action': [
    `<prosody rate="medium">Mmm,</prosody><break time="500ms"/>you can't %s the %s.`,
  ],
  'lift_not_supported': [
    `You lift the %s, but don't find anything useful, and put it down again.`,
  ],
  'take_down_not_supported': [
    `<prosody rate="medium">Hmmm,</prosody><break time="500ms"/>you can't take down the %s.`,
  ],
  'turn_not_supported': [
    `<prosody rate="medium">Hmmm,</prosody><break time="500ms"/>the %s doesn't want to turn.`,
  ],
  'climb_not_supported': [
    `You get on top of the %s, but don't find anything useful, and get down again.`,
  ],
  'move_not_supported': [
    `You move the %s, but don't find anything. So, you move it back in place.`,
  ],
  'move_static_not_supported': [
    `The %s can't be moved.`,
  ],
  'kick_not_supported': [
    `You kick the %s, and hurt your toe.`,
    `You kick the %s, and now your toe is sore.`,
  ],
  'fix_not_supported': [
    `<prosody rate="medium">Uhm,</prosody><break time="500ms"/>you try to fix the %s, but it doesn't work.`,
  ],
  'listen_not_supported': [
    `You put your ear against the %s, but don't hear anything.`,
  ],
  'connect_not_supported': [
    `<prosody rate="medium">Hmmm,</prosody><break time="500ms"/>the %s can't be connected with your hands.`,
  ],
  'close_not_supported': [
    `<prosody rate="medium">Mmm,</prosody><break time="500ms"/>the %s doesn't want to close.`,
  ],
  'use_item_not_supported': [
    `<prosody rate="medium">Mmm,</prosody><break time="500ms"/>you can't use the %s.`,
  ],
  'touch_not_supported2': [
    `You try to touch the %s, but it just feels like a %s.`,
    `You try and touch the %s, but it just feels like a %s.`,
  ],
  'start_not_supported': [
    `<prosody rate="medium">Mmm,</prosody><break time="500ms"/>you can't start the %s.`,
  ],
  'cannot_listen': [
    `You don't hear anything.`,
  ],
  'nothing_direction': [
    'There\'s nothing new in that direction.',
    'There\'s only an empty wall in that direction.',
  ],
  'nothing_behind': [
    'There isn\'t anything behind the %s.',
    'There\'s nothing behind the %s.',
  ],
  'nothing_below': [
    'There isn\'t anything below the %s.',
    'There\'s nothing below the %s.',
  ],
  'nothing_under': [
    'There isn\'t anything under the %s.',
    'There\'s nothing under the %s.',
  ],
  'nothing_above': [
    'There isn\'t anything above the %s.',
    'There\'s nothing above the %s.',
  ],
  'nothing_inside': [
    'You can\'t see inside the %s.',
  ],
  'nothing_left': [
    'There isn\'t anything to the left of the %s.',
    'There\'s nothing to the left of the %s.',
  ],
  'nothing_right': [
    'There isn\'t anything to the right of the %s.',
    'There\'s nothing to the right of the %s.',
  ],
  'nothing_front': [
    'There isn\'t anything at the front of the %s.',
    'There\'s nothing at the front of the %s.',
  ],
  'cannot_take': [
    'You can\'t take the %s.',
  ],
  'cannot_drop': [
    'You can\'t drop the %s.',
  ],
  'more_time': [
    `If you aren't ready, you can ask for more time.`,
    `Just say if you need more time.`,
  ],
  'congratulations': [
    `Magnificent! You escaped from the %s.`,
  ],
  'lose': [
    `Unfortunately,${SSML_BREAK_SHORT}you didn't make it out of the %s safely.`,
  ],
  'time': [
    `It took you %s minutes to escape from the room.`,
    `It took you %s minutes to escape this room.`,
  ],
  'next_move_old': [
    `<prosody rate="medium" pitch="+0.6st">Your next move?</prosody>`,
    `<prosody rate="medium" pitch="+0.6st">What will you try now?</prosody>`,
    `<prosody rate="medium" pitch="+0.6st">What's your next move?</prosody>`,
    `<prosody rate="medium" pitch="+0.6st">What will you try next?</prosody>`,
    `<prosody rate="medium" pitch="+0.6st">What will you do next?</prosody>`,
    `<prosody rate="medium" pitch="+0.6st">What will you do now?</prosody>`,
    `<prosody rate="medium" pitch="+0.6st">So,<break time="600ms"/>what's next?</prosody>`,
  ],
  'next_move': [
    // `<prosody rate="medium" pitch="+0.6st">Your next move?</prosody>`,
    `<prosody rate="medium" pitch="+0.6st">What will you try now?</prosody>`,
    // `<prosody rate="medium" pitch="+0.6st">What's your next move?</prosody>`,
    `<prosody rate="medium" pitch="+0.6st">What will you try next?</prosody>`,
    `<prosody rate="medium" pitch="+0.6st">What will you do next?</prosody>`,
    `<prosody rate="medium" pitch="+0.6st">What will you do now?</prosody>`,
    `<prosody rate="medium" pitch="+0.6st">So,<break time="600ms"/>what's next?</prosody>`,
  ],
  'next_move_short_old': [
    // `<prosody rate="medium" pitch="-0.6st">Next move?</prosody>`,
    `<prosody rate="medium" pitch="-0.6st">What's next?</prosody>`,
    `<prosody rate="medium" pitch="-0.6st">So, what's next?</prosody>`,
    `<prosody rate="medium" pitch="-0.6st">So, your next move?</prosody>`,
    `<prosody rate="medium" pitch="-0.6st">Your next move?</prosody>`,
    `<prosody rate="medium" pitch="-0.6st">The next move?</prosody>`,
    `<prosody rate="medium" pitch="+0.6st">So,<break time="500ms"/>what's next?</prosody>`,
    `<prosody rate="medium" pitch="+0.6st">So,<break time="500ms"/>your next move?</prosody>`,
  ],
  'next_move_short': [
    // `<prosody rate="medium" pitch="-0.6st">Next move?</prosody>`,
    // `<prosody rate="medium" pitch="-0.6st">What's next?</prosody>`,
    // `<prosody rate="medium" pitch="-0.6st">So, what's next?</prosody>`,
    // `<prosody rate="medium" pitch="-0.6st">So, your next move?</prosody>`,
    // `<prosody rate="medium" pitch="-0.6st">Your next move?</prosody>`,
    // `<prosody rate="medium" pitch="-0.6st">The next move?</prosody>`,
    `<prosody rate="medium" pitch="+0.6st">So,<break time="500ms"/>what's next?</prosody>`,
    `<prosody rate="medium" pitch="+0.6st">What will you try now?</prosody>`,
    // `<prosody rate="medium" pitch="+0.6st">So,<break time="400ms"/>what will you do now?</prosody>`,
    `<prosody rate="medium" pitch="+0.6st">What will you do now?</prosody>`,
    `<prosody rate="medium" pitch="+0.6st">So,<break time="400ms"/>what will you try next?</prosody>`,
    `<prosody rate="medium" pitch="+0.6st">What will you try next?</prosody>`,
    // `<prosody rate="medium" pitch="+0.6st">So,<break time="500ms"/>your next move?</prosody>`
  ],
  'next_move_motivate': [
    `Now you have to escape.`,
    `Now to escape.`,
    `Now to escape the room.`,
  ],
  'try_colors': [
    `You try the colors %s.`,
    `You try %s.`,
  ],
  'which_colors': [
    `In what order do you want to connect them now?`,
    `In what order do you want to fix them now?`,
  ],
  'try_color': [
    `You try the color %s.`,
    `You try %s.`,
  ],
  'which_color': [
    `What's the color now?`,
    `Which color now?`,
  ],
  'colors_failed': [
    `Those colors weren't right.`,
    `Those weren't the right colors.`,
  ],
  'color_failed': [
    `That color wasn't right.`,
    `That wasn't the right color.`,
  ],
  'try_code': [
    `You try the digits %s.`,
    `You try %s.`,
  ],
  'which_code': [
    `Which digits do you want to enter now?`,
    `Which digits do you want to use next?`,
    `Which digits do you want to try now?`,
  ],
  'code_failed1': [
    `Good guess, but those digits weren't right.`,
    `Good guess, but those weren't the right digits.`,
  ],
  'code_failed': [
    `Those digits weren't right.`,
    `Those weren't the right digits.`,
  ],
  'code_obvious': [
    `Nope. That would be too easy.`,
    `No, it's not that easy.`,
    `No, it's not that obvious.`,
  ],
  'try_directions': [
    `You try the directions %s.`,
    `You try %s.`,
  ],
  'which_directions': [
    `Which directions now?`,
  ],
  'directions_failed': [
    `Those directions weren't right.`,
    `Those weren't the right directions.`,
  ],
  'try_turns': [
    `You try the turns %s.`,
    `You try %s.`,
  ],
  'turns_failed': [
    `Those turns weren't right.`,
    `Those weren't the right turns.`,
  ],
  'game_state_saved': [
    `Your game state has been saved for next time.`,
  ],
  'game_state_restored': [
    `The saved state from your last game has been loaded.`,
  ],
  'how_long': [
    `You've spent %s minutes in the %s.`,
  ],
  'stats': [
    `You've escaped from %s rooms. You've spent %s minutes in this room.`,
  ],
  'stats1': [
    `You've escaped from 1 room. You've spent %s minutes in this room.`,
  ],
  'stats_no_rooms': [
    `You haven't escaped from any rooms. You've spent %s minutes in this room.`,
  ],
  'stats_lobby': [
    `You've escaped from %s rooms.`,
  ],
  'stats_lobby1': [
    `You've escaped from 1 room.`,
  ],
  'stats_lobby_no_rooms': [
    `You haven't escaped from any rooms.`,
  ],
  'secrets_found': [
    `Also, you've found %s easter eggs.`,
  ],
  'secrets_not_found': [
    `Also, you haven't found any easter eggs.`,
  ],
  'room': [
    `At the moment you're in the %s.`,
    `You're in the %s.`,
  ],
  'sing': [
    `You start singing, but you soon get bored, and stop.`,
  ],
  'undo': [
    `Hmmm, you can't undo that.`,
    `Nope, you can't undo that.`,
  ],
  'smell': [
    `You try to smell the %s, but it just smells like a %s.`,
    `You try and smell the %s, but it just smells like a %s.`,
  ],
  'knock': [
    `You knock on the %s, but nothing happens.`,
    `You knock on the %s, but you don't hear anything.`,
  ],
  'items': [
    `You've found %s.`,
  ],
  'look_item': [
    `Just look %s again.`,
  ],
  'take_time': [
    `Take your time.`,
    `Take some time.`,
    `Take a minute.`,
  ],
  'take_time_return': [
    `Just say: "OK Google, I'm ready" to return to the game.`,
    `Just say: "OK Google, I'm ready" to come back to the game.`,
  ],
  'take_time_welcome': [
    `Welcome back.`,
    `Welcome back.`,
  ],
  'gentle_confirmation': [
    'Sure.',
    'Of course.',
    'Sure thing.',
  ],
  'positive_response': [
    `That's OK.`,
    `No worries.`,
    `No problem.`,
    `It's not a problem.`,
    `It's alright.`,
  ],
  'secret_found': [
    'And, you found the easter egg!',
  ],
  'secret_not_found': [
    `But,${SSML_BREAK_SHORT}you didn't find the easter egg!`,
  ],
  'turn_on': [
    `You turn on the %s.`,
    `You switch on the %s.`,
  ],
  'turn_off': [
    `You turn off the %s.`,
    `You switch off the %s.`,
  ],
  'already_on': [
    `The %s is already on.`,
  ],
  'already_off': [
    `The %s is already off.`,
  ],
  'why': [
    `To escape the room, you have to find items you can use to solve puzzles. Think logically and use your common sense.`,
    `To escape the room, look in every direction and find items you can use to solve puzzles. Just use your common sense.`,
  ],
  'boring': [
    `Sorry to hear that.${SSML_BREAK_SHORT}Did you know there is also an easter egg hidden somewhere in this room? You can find it!`,
  ],
  'map': [
    `There isn't a map.`,
    `There isn't a map of the room.`,
  ],
  'restart': [
    `Restarting this room.`,
  ],
  'turn_left': [
    `You turn left. Next turn?`,
    `You turn left. Next?`,
  ],
  'turn_right': [
    `You turn right. Next turn?`,
    `You turn right. Next?`,
  ],
  'turn_left_click': [
    `You turn left...click. Next turn?`,
    `You turn left...click. Next?`,
  ],
  'turn_right_click': [
    `You turn right...click. Next turn?`,
    `You turn right...click. Next?`,
  ],
  'easter_egg': [
    `An "Easter egg" is a secret feature or item that you can find in the rooms.`,
    `An "Easter egg" is a secret item or feature that you might find in the rooms.`,
  ],
  'no_direction': [
    `Got it. That's "%s", instead.`,
  ],
  'no_item': [
    `Got it. That's the "%s", instead.`,
  ],
  'slot_filling_look1': [
    `What item do you want to look at?`,
    `Which item do you want to look at?`,
  ],
  'slot_filling_look2': [
    `So, which item do you want to look at?`,
    `So, what item are you trying to look at?`,
  ],
  'slot_filling_look_items': [
    `You've found %s.`,
  ],
  'slot_filling_look_try_items': [
    `You can also try the %s.`,
  ],
  'slot_filling_use1': [
    `What do you want to use?`,
    `Which item do you want to use?`,
  ],
  'slot_filling_use2': [
    `So, which item do you want to use?`,
    `So, what are you trying to use?`,
  ],
  'slot_filling_use_items': [
    `You've found %s.`,
  ],
  'slot_filling_use_try_items': [
    `You can also try the %s.`,
  ],
  'slot_filling_use_on1': [
    `What do you want to use it on?`,
  ],
  'slot_filling_use_on2': [
    `So, which one do you want to use it on?`,
  ],
  'slot_filling_use_on_items': [
    `You've found %s.`,
  ],
  'slot_filling_use_on_try_items': [
    `You can also try the %s.`,
  ],
  'slot_filling_direction1': [
    `Which direction?`,
    `Which direction do you want to look?`,
  ],
  'slot_filling_direction2': [
    `So, which direction do you want to look?`,
    `So, which direction?`,
  ],
  'slot_filling_direction_items': [
    `Valid directions are %s.`,
  ],
  'slot_filling_direction_try_items': [
    `You can try %s.`,
  ],
  'slot_filling_room1': [
    `Which room?`,
    `Which room do you want to try?`,
  ],
  'slot_filling_room2': [
    `So, which room do you want to try?`,
    `So, which room?`,
  ],
  'slot_filling_room_items': [
    `Valid rooms are %s.`,
  ],
  'slot_filling_room_try_items': [
    `You can try %s.`,
  ],
  'slot_filling_room_difficulty1': [
    `Which difficulty?`,
    `Which difficulty do you want to try?`,
  ],
  'slot_filling_room_difficulty2': [
    `So, which difficulty do you want to try?`,
    `So, which difficulty?`,
  ],
  'slot_filling_room_difficulty_items': [
    `Valid difficulty levels are %s.`,
  ],
  'slot_filling_room_difficulty_try_items': [
    `You can try %s.`,
  ],
  'slot_filling_single_use_intent1': [
    `What item do you want to %s?`,
    `Which item do you want to %s?`,
  ],
  'slot_filling_single_use_intent2': [
    `So, which item do you want to %s?`,
    `So, what item do you want to %s?`,
  ],
  'slot_filling_single_use_intent_items': [
    `You've found %s.`,
  ],
  'slot_filling_single_use_intent_try_items': [
    `You can also try the %s.`,
  ],
  'slot_filling_single_use1': [
    `What item?`,
    `Which item?`,
  ],
  'slot_filling_single_use2': [
    `So, which item?`,
    `So, what item?`,
  ],
  'slot_filling_single_use_items': [
    `You've found %s.`,
  ],
  'slot_filling_single_use_try_items': [
    `You can also try the %s.`,
  ],
  'slot_filling_side1': [
    `Which side?`,
    `Which side do you want to look?`,
  ],
  'slot_filling_side2': [
    `So, which side do you want to look?`,
    `So, which side?`,
  ],
  'slot_filling_side_items': [
    `Valid sides are %s.`,
  ],
  'slot_filling_side_try_items': [
    `You can try %s.`,
  ],
  'slot_filling_on_off1': [
    `Which one?`,
  ],
  'slot_filling_on_off2': [
    `So, which one?`,
  ],
  'slot_filling_on_off_items': [
    `Valid options are %s.`,
  ],
  'slot_filling_on_off_try_items': [
    `You can try %s.`,
  ],
  'reward1': [
    `You've earned a hint. Ask for the hint anytime.`,
  ],
  'reward': [
    `You've earned a hint.`,
    `You've earned another hint.`,
  ],
  'agree': [
    `Yes,${SSML_BREAK_SHORT}yes, it is.`,
  ],
  'kick': [
    `You kick the %s, and hurt your toe.`,
    `You kick the %s, and now your toe is sore.`,
  ],
  'answer': [
    `Sorry, I didn't get that. Could you repeat that?`,
    `Sorry, I didn't understand that. Could you say that again?`,
    `Sorry, I didn't get that. What do you want to do?`,
    `Sorry, I didn't understand that. What are you trying to do?`,
    `Sorry, I didn't get that. What do you want to do?`,
    `Sorry, I didn't understand that. What do you want to do?`,
    `Sorry, I didn't get that. What do you want to do?`,
    `Sorry, I didn't understand that. What do you want to do?`,
    `Sorry, I didn't get that. What are you trying to do?`,
  ],
  'bad': [
    `Sorry about that. Just think logically, and use your common sense.`,
    `Sorry about that. There really is a way to escape. Give it one more try.`,
    `Sorry about that. Give it another try.`,
    `Sorry about that. But hang in there.`,
    `Sorry you feel that way. You might want to retrace your steps. You might've missed something.`,
  ],
  'language': [
    `Sorry, I only understand English.`,
    `Sorry, but I only know English.`,
  ],
  'bla': [
    `yes, blah, blah, blah.`,
    `yadda yadda yadda.`,
  ],
  'frustrated': [
    `You sound frustrated.${SSML_BREAK_SHORT}Just think logically, and use your common sense.`,
    `You sound a bit frustrated.${SSML_BREAK_SHORT}There really is a way to escape. Give it one more try.`,
    `You sound frustrated.${SSML_BREAK_SHORT}You might want to retrace your steps. You might've missed something.`,
  ],
  'whatcolor_known': [
    `The color of the %s is %s.`,
  ],
  'whatcolor_unknown': [
    `<prosody rate="medium">Hmmm,</prosody><break time="500ms"/>I can't make out the color of the %s.`,
  ],
  'hello': [
    `Hi there.`,
    `Hey, there.`,
  ],
  'suprise': [
    `Let's go with a surprise.`,
  ],
  'ok': [
    'OK.',
    'Okay.',
  ],
  'single_items': [
    'There is one %s in the room.',
    'There is one %s in this room.',
  ],
  'multiple_items': [
    'There are several %s in the room.',
    'There are several %s in this room.',
  ],
};

exports.prompts = prompts;
