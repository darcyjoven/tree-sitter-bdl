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
      $.hook,
    ),
  // 基础属性
  _help: (/** @type {any} */ $) => seq(kw("HELP"), field("line", $.number)),
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
      kw("FORM"),
      kw("WINDOW"),
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
  hook: (/** @type {any} */ $) =>
    prec(
      1,
      choice(
        seq(kw("ACCEPT"), kw("INPUT")),
        seq(
          kw("NEXT"),
          kw("FIELD"),
          choice(
            kw("CURRENT"),
            kw("NEXT"),
            kw("PREVIOUS"),
            field("field", $.variable),
          ),
        ),
        seq(kw("CANCEL"), kw("DELETE")),
        seq(kw("CANCEL"), kw("INSERT")),
        seq(kw("ACCEPT"), kw("DIALOG")),
        seq(kw("ACCEPT"), kw("CONSTRUCT")),
        seq(kw("NEXT"), kw("DIALOG")),
        seq(kw("ACCEPT"), kw("DISPLAY")),
        // NEXT OPTION "label": MENU 中跳到下一个选项
        seq(kw("NEXT OPTION"), field("option", $.expression)),
      ),
    ),
  branch: (/** @type {any} */ $) =>
    seq(
      choice(
        kw("BEFORE DISPLAY"),
        kw("AFTER DISPLAY"),
        kw("ON APPEND"),
        kw("ON INSERT"),
        kw("ON UPDATE"),
        kw("ON DELETE"),
        seq(kw("ON EXPAND"), "(", field("control", $.variable), ")"),
        seq(kw("ON COLLAPSE"), "(", field("control", $.variable), ")"),
        seq(kw("ON DRAG_START"), "(", field("control", $.variable), ")"),
        seq(kw("ON DRAG_FINISHED"), "(", field("control", $.variable), ")"),
        seq(kw("ON DRAG_ENTER"), "(", field("control", $.variable), ")"),
        seq(kw("ON DRAG_OVER"), "(", field("control", $.variable), ")"),
        seq(kw("ON DROP"), "(", field("control", $.variable), ")"),
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
        seq(kw("ON KEY"), "(", $._key, ")"),
        seq(
          kw("ON ACTION"),
          field("action", choice($.identifier, $.string)),
          // ON ACTION <action> INFIELD <field>: 限定该 action 作用于指定字段
          optional(seq(kw("INFIELD"), field("field", $._field_ref))),
        ),
        seq(kw("ON IDLE"), field("idle", $.expression)),
        seq(kw("BEFORE MENU")),
        seq(kw("BEFORE INPUT")),
        seq(kw("AFTER INPUT")),
        // 字段名可为 tm.yy 形式, 故允许 标识符/对象/切片
        seq(kw("BEFORE FIELD"), commaSep1(field("field", $._field_ref))),
        seq(kw("AFTER FIELD"), commaSep1(field("field", $._field_ref))),
        seq(kw("ON CHANGE"), commaSep1(field("field", $._field_ref))),
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
      repeat($._statement),
    ),

  window: (/** @type {any} */ $) =>
    choice(
      seq(
        kw("OPEN WINDOW"),
        $._name,
        optional(seq(kw("AT"), $._coordinate, ",", $._coordinate)),
        seq(
          kw("WITH"),
          choice(
            seq(kw("FORM"), field("form", choice($.variable, $.string))),
            seq($._rows, kw("ROWS"), optional(","), $._columns, kw("COLUMNS")),
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
  clear: (/** @type {any} */ $) => seq(kw("CLEAR"), $._params),
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
              seq(kw("AT"), $._coordinate, ",", $._coordinate),
              seq(kw("TO"), commaSep1(field("field", $.variable))),
            ),
          ),
        ),
        seq(
          kw("ARRAY"),
          $._names,
          kw("TO"),
          field("record", seq($.identifier, ".*")),
          optional($._help),
        ),
      ),
      optional($.attribute),
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
    seq($._menu_head, optional(repeat($.branch)), kw("END MENU")),
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
        seq(
          kw("ARRAY"),
          commaSep1(field("value", $.variable)),
          optional(kw("WITHOUT DEFAULTS")),
          kw("FROM"),
          field("record", seq($.variable, ".*")),
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
          commaSep1(field("field", $.variable)),
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

  // 数值操作数(变量或数字)的语义化子规则
  // 坐标: OPEN WINDOW/DISPLAY ... AT x, y
  _coordinate: (/** @type {any} */ $) =>
    field("coordinate", choice($.variable, $.number)),
  // 行数/列数: OPEN WINDOW ... WITH n ROWS, m COLUMNS
  _rows: (/** @type {any} */ $) => field("rows", choice($.variable, $.number)),
  _columns: (/** @type {any} */ $) =>
    field("columns", choice($.variable, $.number)),
  // 字段引用: 支持 field 与 tm.field 两种写法(保留裸标识符形态)
  _field_ref: (/** @type {any} */ $) =>
    choice($.identifier, $.object, $.slice),
  // 内建函数 INFIELD(<字段>): 判断当前字段是否指定字段
  // (INFIELD 作为关键字后, 函数式写法需单独支持)
  infield_function: (/** @type {any} */ $) =>
    seq(kw("INFIELD"), "(", optional($._params), ")"),
};
