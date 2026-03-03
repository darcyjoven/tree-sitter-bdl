/// <reference types="tree-sitter-cli/dsl" />

import { commaSep1, kw } from "./util.js";
// @ts-check

export default {
  _interface_statement: ($) =>
    choice(
      $._window_interface,
      $._show_interface,
      $.display_block,
      $.menu_block,
      $.input_block,
      $.construct_block,
      $.dialog_block,
      $.prompt_block,
    ),

  _window_interface: ($) =>
    choice(
      $.open_window,
      $.close_window,
      $.current_window,
      $.open_form,
      $.close_form,
      $.clear_interface,
    ),
  open_window: ($) =>
    prec(
      1,
      seq(
        kw("OPEN"),
        kw("WINDOW"),
        $._identifier,
        optional(seq(kw("AT"), $._expression, ",", $._expression)),
        seq(
          kw("WITH"),
          choice(
            seq(kw("FORM"), $._string_literal),
            seq($._expression, kw("ROWS"), ",", $._expression, kw("COLUMNS")),
          ),
        ),
        optional($._display_attribute_block),
      ),
    ),
  close_window: ($) =>
    seq(kw("CLOSE"), kw("WINDOW"), choice($._identifier, kw("SCREEN"))),
  current_window: ($) =>
    seq(kw("CURRENT WINDOW IS"), choice($._identifier, kw("SCREEN"))),
  open_form: ($) =>
    seq(kw("OPEN"), kw("FORM"), $._identifier, kw("FROM"), $._string_literal),
  close_form: ($) => seq(kw("CLOSE"), kw("FORM"), $._identifier),
  clear_interface: ($) =>
    choice(
      // CLEAR WINDOW { identifier | SCREEN }
      prec(1, seq(kw("CLEAR"), kw("SCREEN"))),
      // CLEAR SCREEN
      prec(
        1,
        seq(kw("CLEAR"), kw("WINDOW"), choice($._identifier, kw("SCREEN"))),
      ),
      seq(kw("CLEAR"), $._identifier),
    ),

  _show_interface: ($) =>
    choice($.message_interface, $.error_interface, $.scroll_interface),
  message_interface: ($) =>
    seq(kw("MESSAGE"), $._expression, optional($._display_attribute_block)),
  error_interface: ($) =>
    seq(kw("ERROR"), $._expression, optional($._display_attribute_block)),
  scroll_interface: ($) =>
    seq(
      kw("SCROLL"),
      commaSep1($._variable),
      optional(choice(kw("UP"), kw("DOWN"))),
      optional(seq(kw("BY"), $._expression)),
    ),

  display_block: ($) => choice($._display_inline),
  _display_inline: ($) =>
    seq(
      kw("DISPLAY"),
      choice(
        // DISPLAY FORM
        seq(kw("FORM"), $._identifier),
        // DISPLAY text AT
        seq(
          $._expression,
          optional(seq(kw("AT"), $._expression, ",", $._expression)),
        ),
        // DISPLAY .. TO ..
        seq($._expression, kw("TO"), commaSep1($._identifier)),
        // DISPLAY BY NAME
        seq(kw("BY"), kw("NAME"), commaSep1($._variable)),
      ),
      optional($._display_attribute_block),
    ),

  menu_block: ($) =>
    seq(
      kw("MENU"),
      optional(alias($._expression, "menu_title")),
      optional(alias($._display_attribute, "attribute")),
      repeat(seq($.menu_option, repeat($._menu_statement))),
      kw("END MENU"),
    ),
  menu_option: ($) =>
    choice(
      // COMMAND option-name [option-comment] [HELP help-number]
      seq(
        kw("COMMAND"),
        alias(choice($._identifier, $._string_literal), "option_name"),
        optional(alias($._expression, "option_comment")),
        optional(seq(kw("HELP"), $._number_literal)),
      ),

      // COMMAND KEY ( key-name ) option-name [option-comment] [HELP help-number]
      seq(
        kw("COMMAND"),
        $._menu_key_option,
        alias(choice($._identifier, $._string_literal), "option_name"),
        optional(alias($._expression, "option_comment")),
        optional(seq(kw("HELP"), $._number_literal)),
      ),

      // COMMAND KEY ( key-name )
      seq(kw("COMMAND"), $._menu_key_option),

      // ON ACTION action-name
      seq(kw("ON"), kw("ACTION"), alias($._identifier, "action_name")),

      // ON IDLE idle-seconds
      seq(kw("ON"), kw("IDLE"), alias($._expression, "idle_seconds")),
    ),
  _menu_key_option: ($) =>
    seq(
      kw("KEY"),
      "(",
      alias(seq($._identifier, optional(seq("-", $._identifier))), "key_name"),
      ")",
    ),
  _menu_statement: ($) =>
    choice(
      $.fgl_statement,
      $.sql_statement,
      alias(
        choice(
          seq(kw("NEXT"), kw("OPTION"), $._identifier),
          seq(
            choice(kw("SHOW"), kw("HIDE")),
            seq(
              kw("OPTION"),
              choice(kw("ALL"), alias(commaSep1($._identifier), "options")),
            ),
          ),
        ),
        $.menu_statement,
      ),
    ),

  input_block: ($) => "input_block",
  construct_block: ($) => "construct_block",
  dialog_block: ($) => "dialog_block",
  prompt_block: ($) => "prompt_block",

  _display_attribute_block: ($) =>
    seq(kw("ATTRIBUTE"), "(", commaSep1($._display_attribute), ")"),
  _display_attribute: ($) =>
    choice(
      seq(kw("TEXT"), "=", $._expression),
      seq(kw("STYLE"), "=", $._expression),
      // COLOR
      kw("BLACK"),
      kw("BLUE"),
      kw("CYAN"),
      kw("GREEN"),
      kw("MAGENTA"),
      kw("RED"),
      kw("WHITE"),
      kw("YELLOW"),
      // font attribute
      kw("BOLD"),
      kw("DIM"),
      kw("INVISIBLE"),
      kw("NORMAL"),
      // video attribute
      kw("REVERSE"),
      kw("BLINK"),
      kw("UNDERLINE"),
      seq(kw("PROMPT LINE"), $._expression),
      seq(kw("FORM LINE"), $._expression),
      seq(kw("MENU LINE"), $._expression),
      seq(kw("MESSAGE LINE"), $._expression),
      seq(kw("ERROR LINE"), $._expression),
      seq(kw("COMMENT LINE"), choice(kw("OFF"), $._expression)),
      kw("BORDER"),
    ),
};
