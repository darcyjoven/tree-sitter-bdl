/// <reference types="tree-sitter-cli/dsl" />
// @ts-check
import { commaSep1, kw } from "./util.js";

export default {
  _interface: (/** @type {any} */ $) =>
    choice(
      $.window,
      $.form,
      $.clear,
      $.message,
      $.error,
      $.scroll,
      $.display,
      $.menu,
      $.input,
      $.construct,
      $.dialog,
      $.prompt,
    ),
  // 基础属性
  _help: (/** @type {any} */ $) => seq(kw("HELP"), field("", $.number)),
  _display_attribute: (/** @type {any} */ $) =>
    choice(
      seq(kw("TEXT"), "=", field("value", $.expression)),
      seq(kw("STYLE"), "=", field("value", $.expression)),
      seq(kw("COMMENT"), "=", field("value", $.expression)),
      seq(kw("IMAGE"), "=", field("value", $.expression)),
      kw("BLACK"),
      kw("BLUE"),
      kw("CYAN"),
      kw("GREEN"),
      kw("MAGENTA"),
      kw("RED"),
      kw("WHITE"),
      kw("YELLOW"),
      kw("BOLD"),
      kw("DIM"),
      kw("INVISIBLE"),
      kw("NORMAL"),
      kw("REVERSE"),
      kw("BLINK"),
      kw("UNDERLINE"),
      seq(kw("PROMPT LINE"), field("value", $.expression)),
      seq(kw("FORM LINE"), field("value", $.expression)),
      seq(kw("MENU LINE"), field("value", $.expression)),
      seq(kw("MESSAGE LINE"), field("value", $.expression)),
      seq(kw("ERROR LINE"), field("value", $.expression)),
      seq(kw("COMMENT LINE"), choice(kw("OFF"), field("value", $.expression))),
      kw("BORDER"),
    ),
  _ctrl_attribute: (/** @type {any} */ $) =>
    choice(
      seq(kw("ACCEPT"), optional(seq("=", field("value", $.expression)))),
      seq(kw("APPEND ROW"), optional(seq("=", field("value", $.expression)))),
      seq(kw("AUTO APPEND"), optional(seq("=", field("value", $.expression)))),
      seq(kw("CANCEL"), optional(seq("=", field("value", $.expression)))),
      seq(kw("COUNT"), "=", field("value", $.expression)),
      seq(kw("DELETE ROW"), optional(seq("=", field("value", $.expression)))),
      seq(kw("FIELD ORDER FORM")),
      seq(kw("HELP"), "=", field("value", $.expression)),
      seq(kw("INSERT ROW"), optional(seq("=", field("value", $.expression)))),
      seq(
        kw("KEEP"),
        kw("CURRENT"),
        kw("ROW"),
        optional(seq("=", field("value", $.expression))),
      ),
      seq(kw("MAXCOUNT"), "=", field("value", $.expression)),
      seq(kw("UNBUFFERED"), optional(seq("=", field("value", $.expression)))),
      seq(
        kw("WITHOUT DEFAULTS"),
        optional(seq("=", field("value", $.expression))),
      ),
    ),
  attribute: (/** @type {any} */ $) =>
    seq(
      choice(kw("ATTRIBUTES"), kw("ATTRIBUTE")),
      "(",
      commaSep1(
        field("attribute", choice($._display_attribute, $._ctrl_attribute)),
      ),
      ")",
    ),
  branch: (/** @type {any} */ $) =>
    choice(
      kw("BEFORE DISPLAY"),
      kw("AFTER DISPLAY"),
      kw("ON APPEND"),
      kw("ON INSERT"),
      kw("ON UPDATE"),
      kw("ON DELETE"),
      seq(kw("ON EXPAND"), "(", field("drag", $.variable), ")"),
      seq(kw("ON COLLAPSE"), "(", field("drag", $.variable), ")"),
      seq(kw("ON DRAG_START"), "(", field("drag", $.variable), ")"),
      seq(kw("ON DRAG_FINISHED"), "(", field("drag", $.variable), ")"),
      seq(kw("ON DRAG_ENTER"), "(", field("drag", $.variable), ")"),
      seq(kw("ON DRAG_OVER"), "(", field("drag", $.variable), ")"),
      seq(kw("ON DROP"), "(", field("drag", $.variable), ")"),
      kw("ON FILL BUFFER"),
      seq(
        kw("COMMAND"),
        field("action", choice($.identifier, $.string)),
        optional(field("comment", $.expression)),
        optional($._help),
      ),
      seq(
        kw("COMMAND"),
        seq(kw("KEY"), "(", $._key, ")"),
        field("action", choice($.identifier, $.string)),
        optional(field("comment", $.expression)),
        optional($._help),
      ),
      seq(kw("COMMAND"), seq(kw("KEY"), "(", $._key, ")")),
      seq(
        kw("ON"),
        kw("ACTION"),
        field("action", choice($.identifier, $.string)),
      ),
      seq(kw("ON IDLE"), field("idle", $.expression)),
      seq(kw("BEFORE MENU")),
      seq(kw("BEFORE INPUT")),
      seq(kw("AFTER INPUT")),
      seq(kw("BEFORE FIELD"), commaSep1(field("field", $.identifier))),
      seq(kw("AFTER FIELD"), commaSep1(field("field", $.identifier))),
      seq(kw("ON CHANGE"), commaSep1(field("field", $.identifier))),
      kw("BEFORE DELETE"),
      kw("AFTER DELETE"),
      kw("BEFORE ROW"),
      kw("AFTER ROW"),
      kw("ON ROW CHANGE"),
      kw("BEFORE INSERT"),
      kw("AFTER INSERT"),
      kw("BEFORE CONSTRUCT"),
      kw("AFTER CONSTRUCT"),
      kw("BEFORE DIALOG"),
      kw("AFTER DIALOG"),
    ),

  window: (/** @type {any} */ $) =>
    choice(
      seq(
        kw("OPEN WINDOW"),
        $._name,
        optional(seq(kw("AT"), $._scale, ",", $._scale)),
        seq(
          kw("WITH"),
          choice(
            seq(kw("FORM"), field("form", choice($.variable, $.string))),
            seq($._scale, kw("ROWS"), $._scale, kw("COLUMNS")),
          ),
        ),
        optional($.attribute),
      ),
      seq(kw("CLOSE WINDOW"), $._name),
      seq(kw("CURRENT WINDOW IS"), $._name),
      seq(kw("CLEAR WINDOW"), $._name),
    ),
  form: (/** @type {any} */ $) =>
    choice(
      seq(
        kw("OPEN FORM"),
        $._name,
        kw("FROM"),
        field("form", choice($.variable, $.string)),
      ),
      seq(kw("CLOSE FORM"), $._name),
    ),
  clear: (/** @type {any} */ $) => seq(kw("CLEAR"), $._names),
  message: (/** @type {any} */ $) =>
    seq(kw("MESSAGE"), field("content", $.expression), optional($.attribute)),
  error: (/** @type {any} */ $) =>
    seq(kw("ERROR"), field("content", $.expression), optional($.attribute)),
  scroll: (/** @type {any} */ $) =>
    seq(
      kw("SCROLL"),
      field("content", $.expression),
      optional(choice(kw("UP"), kw("DOWN"))),
      optional(seq(kw("BY"), $.expression)),
    ),
  _display_head: (/** @type {any} */ $) =>
    seq(
      kw("DISPLAY"),
      choice(
        seq("FORM", $._name),
        seq(kw("BY NAME"), commaSep1(field("field", $.variable))),
        seq(
          $._value,
          optional(
            choice(
              seq(kw("AT"), $._scale, ",", $._scale),
              seq(kw("TO"), commaSep1(field("field", $.variable))),
            ),
          ),
        ),
        seq(
          kw("ARRAY"),
          $._names,
          kw("TO"),
          field("fields", seq($.identifier, ".*")),
          optional($._help),
          optional($.attribute),
        ),
      ),
    ),
  display: (/** @type {any} */ $) =>
    seq($._display_head, optional(seq(repeat($.branch), kw("END DISPLAY")))),
  _menu_head: (/** @type {any} */ $) =>
    seq(
      kw("MENU"),
      optional(field("title", choice($.variable, $.string))),
      optional($.attribute),
    ),
  menu: (/** @type {any} */ $) =>
    seq($._menu_head, optional(seq(repeat($.branch), kw("END MENU")))),
  _input_head: (/** @type {any} */ $) =>
    seq(
      kw("INPUT"),
      choice(
        seq(
          kw("BY NAME"),
          commaSep1(field("value", $.variable)),
          optional(kw("WITHOUT DEFAULTS")),
        ),
        seq(
          commaSep1(field("value", $.variable)),
          optional(kw("WITHOUT DEFAULTS")),
          kw("FROM"),
          commaSep1(field("field", $.variable)),
        ),
      ),
      optional($.attribute),
      optional($._help),
    ),
  input: (/** @type {any} */ $) =>
    seq($._input_head, optional(seq(repeat($.branch), kw("END INPUT")))),
  _construct_head: (/** @type {any} */ $) =>
    seq(
      kw("CONSTRUCT"),
      choice(
        seq(
          kw("BY NAME"),
          field("value", $.variable),
          kw("ON"),
          commaSep1(field("field", $.variable)),
        ),
        seq(
          field("value", $.variable),
          kw("ON"),
          commaSep1(field("name", $.variable)),
          kw("FROM"),
          commaSep1(field("field", $.variable)),
        ),
      ),
      optional($.attribute),
      optional($._help),
    ),
  construct: (/** @type {any} */ $) =>
    seq(
      $._construct_head,
      optional(seq(repeat($.branch), kw("END CONSTRUCT"))),
    ),

  dialog: (/** @type {any} */ $) =>
    seq(
      kw("DIALOG"),
      optional($.attribute),
      repeat(choice($.input, $.construct, $.display)),
      repeat($.branch),
      kw("END DIALOG"),
    ),
  _prompt_head: (/** @type {any} */ $) =>
    seq(
      kw("PROMPT"),
      field("ask", $.expression),
      optional($.attribute),
      kw("FOR"),
      optional(choice(kw("CHAR"), kw("CHARACTER"))),
      field("value", $.variable),
      optional($._help),
      optional($.attribute),
    ),
  prompt: (/** @type {any} */ $) =>
    seq($._prompt_head, optional(seq(repeat($.branch), kw("END PROMPT")))),
};
