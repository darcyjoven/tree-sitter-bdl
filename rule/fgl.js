/// <reference types="tree-sitter-cli/dsl" />
// @ts-check
import { commaSep, commaSep1, kw, PREC, datetimeQualifier } from "./util.js";

export default {
  // 备注
  comment: (/** @type {any} */ $) =>
    token(
      choice(
        seq("--", /.*/), // -- 行注释
        seq("#", /.*/), // # 行注释
        seq("{", /[^}]*/, "}"), // { } 块注释
      ),
    ),
  scope: (/** @type {any} */ $) => choice(kw("PRIVATE"), kw("PUBLIC")),
  _fgl: (/** @type {any} */ $) =>
    choice(
      $.preproc,
      $.whenever,
      $.try,
      $.terminate_report,
      $.finish_report,
      $.output_to_report,
      $.start_report,
      $.defer,
      $.let,
      $.locate,
      $.validate,
      $.free,
      $.initialize,
      $.options,
      $._flow,
    ),
  preproc: (/** @type {any} */ $) =>
    choice(
      seq("&include", field("filename", $.string)),
      seq(
        "&define",
        field(
          "key",
          seq($.identifier, optional(seq("(", commaSep($.identifier), ")"))),
        ),
        field("value", $._preproc_value),
      ),
    ),
  // 预处理器条件指令: 由 Genero 预处理阶段处理, 对语法透明
  // (&ifdef/&ifndef/&elif/&else/&endif/&undef 可出现在任意位置, 含 DEFINE 列表中间)
  preproc_directive: (/** @type {any} */ $) =>
    token(
      seq("&", choice("ifdef", "ifndef", "elif", "else", "endif", "undef"), /.*/),
    ),
  _preproc_value: (/** @type {any} */ $) =>
    seq(
      repeat(
        choice(
          /.*\\\r?\n/, // 匹配以 \ 结尾的行（包含 \ 和换行）
          /[^\n\\]+/, // 匹配行内普通字符
          /\\./, // 匹配单个转义字符
        ),
      ),
      /[^\n]*/, // 匹配最后一行（不带反斜杠的结尾行）
    ),

  whenever: (/** @type {any} */ $) =>
    seq(
      kw("WHENEVER"),
      field(
        "class",
        choice(
          seq(optional(kw("ANY")), kw("ERROR")),
          seq(kw("ANY"), kw("SQLERROR")),
          kw("NOT FOUND"),
          kw("WARNING"),
        ),
      ),
      field(
        "action",
        choice(
          kw("STOP"),
          kw("CONTINUE"),
          kw("RAISE"),
          seq(kw("CALL"), $._names),
          seq(kw("GOTO"), $._names),
        ),
      ),
    ),

  try: (/** @type {any} */ $) =>
    seq(kw("TRY"), repeat($._statement), optional($.catch), kw("END TRY")),
  catch: (/** @type {any} */ $) => seq(kw("CATCH"), repeat($._statement)),

  expression: (/** @type {any} */ $) =>
    choice(
      $.literal,
      $.variable,
      $._boolean_expression,
      $._number_expression,
      $._string_expression,
      $._function_expression,
      $.extend,
      $.infield_function,
      $._special_expression,
      $.report_aggregate,
    ),

  _boolean_expression: (/** @type {any} */ $) =>
    choice(
      prec.left(
        PREC.and,
        seq(
          field("left", $.expression),
          kw("AND"),
          field("right", $.expression),
        ),
      ),
      prec.left(
        PREC.or,
        seq(
          field("left", $.expression),
          kw("OR"),
          field("right", $.expression),
        ),
      ),
      prec.right(PREC.not, seq(kw("NOT"), field("right", $.expression))),
      prec.left(
        PREC.null,
        seq(seq(field("left", $.expression)), kw("IS NULL")),
      ),
      prec.left(
        PREC.null,
        seq(seq(field("left", $.expression)), kw("IS NOT NULL")),
      ),
      prec.left(
        PREC.stringcomparison,
        seq(
          seq(field("left", $.expression)),
          kw("LIKE"),
          field("right", $.expression),
          optional(seq(kw("ESCAPE"), field("option", $.expression))),
        ),
      ),
      prec.right(
        PREC.stringcomparison,
        seq(
          seq(field("left", $.expression)),
          optional(kw("NOT")),
          kw("MATCHES"),
          field("right", $.expression),
          optional(seq(kw("ESCAPE"), field("option", $.expression))),
        ),
      ),
      prec.left(
        PREC.comparative,
        seq(field("left", $.expression), "=", field("right", $.expression)),
      ),
      prec.left(
        PREC.comparative,
        seq(
          field("left", $.expression),
          ":",
          "=",
          field("right", $.expression),
        ),
      ),
      prec.left(
        PREC.comparative,
        seq(
          field("left", $.expression),
          "=",
          "=",
          field("right", $.expression),
        ),
      ),
      prec.left(
        PREC.comparative,
        seq(
          field("left", $.expression),
          "!",
          "=",
          field("right", $.expression),
        ),
      ),
      prec.left(
        PREC.comparative,
        seq(
          field("left", $.expression),
          "<",
          ">",
          field("right", $.expression),
        ),
      ),
      prec.left(
        PREC.comparative,
        seq(field("left", $.expression), "<", field("right", $.expression)),
      ),
      prec.left(
        PREC.comparative,
        seq(
          field("left", $.expression),
          "<",
          "=",
          field("right", $.expression),
        ),
      ),
      prec.left(
        PREC.comparative,
        seq(field("left", $.expression), ">", field("right", $.expression)),
      ),
      prec.left(
        PREC.comparative,
        seq(
          field("left", $.expression),
          ">",
          "=",
          field("right", $.expression),
        ),
      ),
    ),
  _number_expression: (/** @type {any} */ $) =>
    choice(
      prec.left(PREC.call, seq(kw("COLUMN"), field("right", $.expression))),
      prec.left(
        PREC.additive,
        seq(field("left", $.expression), "+", field("right", $.expression)),
      ),
      prec.left(
        PREC.additive,
        seq(field("left", $.expression), "-", field("right", $.expression)),
      ),
      prec(PREC.unary, seq("-", field("right", $.expression))),
      prec.left(
        PREC.multiplicative,
        seq(field("left", $.expression), "*", field("right", $.expression)),
      ),
      prec.left(
        PREC.multiplicative,
        seq(field("left", $.expression), "/", field("right", $.expression)),
      ),
      prec.left(
        PREC.multiplicative,
        seq(
          field("left", $.expression),
          "*",
          "*",
          field("right", $.expression),
        ),
      ),
      prec.left(
        PREC.multiplicative,
        seq(
          field("left", $.expression),
          kw("MOD"),
          field("right", $.expression),
        ),
      ),
      prec.right(
        PREC.ascii,
        seq(
          field("left", $.expression),
          kw("UNITS"),
          field("right", datetimeQualifier),
        ),
      ),
    ),
  _string_expression: (/** @type {any} */ $) =>
    choice(
      prec.left(
        -1,
        seq(
          field("left", $.expression),
          "|",
          "|",
          field("right", $.expression),
        ),
      ),
      prec.left(
        -1,
        seq(field("left", $.expression), ",", field("right", $.expression)),
      ),
      prec.right(
        PREC.ascii,
        seq(
          field("left", $.expression),
          kw("USING"),
          field("right", $.expression),
        ),
      ),
      prec.left(PREC.ascii, seq(field("left", $.expression), kw("CLIPPED"))),
      // WORDWRAP [RIGHT MARGIN expr]: 报表换行操作符(定义已归位 report.js)
      $._report_wordwrap,
    ),
  _function_expression: (/** @type {any} */ $) =>
    seq($._names, "(", optional($._params), ")"),
  // EXTEND(dt-expr, qual1 TO qual2[(scale)]): 第二参数是日期格式限定符, 非普通表达式
  extend: (/** @type {any} */ $) =>
    seq(
      kw("EXTEND"),
      "(",
      field("value", $.expression),
      ",",
      field("qualifier", $._datetime_qualifier_range),
      ")",
    ),
  _special_expression: (/** @type {any} */ $) =>
    choice(
      seq("(", $.expression, ")"),
      // ASCII / SPACES 等报表空格操作符(定义已归位 report.js)
      $._report_special_expression,
    ),
  defer: (/** @type {any} */ $) =>
    seq(kw("DEFER"), choice(kw("INTERRUPT"), kw("QUIT"))),
  let: (/** @type {any} */ $) =>
    seq(kw("LET"), $._names, "=", field("value", $.expression)),
  locate: (/** @type {any} */ $) =>
    seq(
      kw("LOCATE"),
      $._names,
      kw("IN"),
      choice(
        kw("MEMORY"),
        seq(kw("FILE"), field("value", choice($.variable, $.string))),
      ),
    ),
  validate: (/** @type {any} */ $) =>
    seq(
      kw("VALIDATE"),
      $._names,
      kw("LIKE"),
      choice(seq($._table, ".*"), seq($._table, ".", $._column)),
    ),
  free: (/** @type {any} */ $) => seq(kw("FREE"), $._names),
  initialize: (/** @type {any} */ $) =>
    seq(
      kw("INITIALIZE"),
      commaSep1(field("name", $.variable)),
      choice(
        kw("TO NULL"),
        seq(
          kw("LIKE"),
          // 与左侧变量一一对应, 允许 t.c1,t.c2,... 列表或 t.*
          commaSep1(
            field(
              "format",
              choice(seq($._table, ".", "*"), seq($._table, ".", $._column)),
            ),
          ),
        ),
      ),
    ),
  _option_line: (/** @type {any} */ $) =>
    choice(
      field("line", choice($.variable, $.number)),
      seq(kw("FIRST"), optional(field("line", seq("+", $.number)))),
      seq(kw("LAST"), optional(field("line", seq("-", $.number)))),
    ),
  options: (/** @type {any} */ $) =>
    seq(
      kw("OPTIONS"),
      commaSep1(
        choice(
          kw("SHORT CIRCUIT"),
          seq(kw("MENU LINE"), $._option_line),
          seq(kw("MESSAGE LINE"), $._option_line),
          seq(kw("COMMENT LINE"), choice(kw("OFF"), $._option_line)),
          seq(kw("PROMPT LINE"), $._option_line),
          seq(kw("ERROR LINE"), $._option_line),
          seq(kw("FORM LINE"), $._option_line),
          seq(choice(kw("INPUT"), kw("DISPLAY")), $.attribute),
          kw("INPUT NO WRAP"),
          kw("INPUT WRAP"),
          seq(
            kw("FIELD ORDER"),
            choice(kw("CONSTRAINED"), kw("UNCONSTRAINED"), kw("FORM")),
          ),
          seq(kw("ON TERMINATE SIGNAL CALL"), $._names),
          seq(
            kw("ON CLOSE APPLICATION"),
            choice(seq(kw("CALL"), $._names), kw("STOP")),
          ),
          seq(kw("HELP FILE"), field("filename", choice($.variable, $.string))),
          seq(
            choice(
              kw("INSERT"),
              kw("DELETE"),
              kw("NEXT"),
              kw("PREVIOUS"),
              kw("ACCEPT"),
              kw("HELP"),
            ),
            kw("KEY"),
            $._key,
          ),
          seq(kw("RUN IN"), choice(kw("FORM"), kw("LINE")), kw("MODE")),
          seq(kw("SQL INTERRUPT"), choice(kw("ON"), kw("OFF"))),
        ),
      ),
    ),
  import: (/** @type {any} */ $) =>
    seq(
      kw("IMPORT"),
      optional(choice(kw("FGL"), kw("JAVA"))),
      field("module", seq($.identifier, repeat(seq(".", $.identifier)))),
    ),
};
