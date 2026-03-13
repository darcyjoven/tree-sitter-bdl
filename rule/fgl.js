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
      $.terminate,
      $.finish,
      $.output,
      $.start,
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

  terminate: (/** @type {any} */ $) =>
    seq(kw("TERMINATE REPORT"), field("report", $.identifier)),
  finish: (/** @type {any} */ $) =>
    seq(kw("FINISH REPORT"), field("report", $.identifier)),
  output: (/** @type {any} */ $) =>
    seq(
      kw("OUTPUT TO REPORT"),
      field("report", $.identifier),
      "(",
      optional($._params),
      ")",
    ),
  start: (/** @type {any} */ $) =>
    seq(
      kw("START REPORT"),
      field("report", $.identifier),
      optional(
        field(
          "clause",
          choice(
            $.variable,
            kw("SCREEN"),
            kw("PRINTER"),
            seq(kw("FILE"), field("filename", $.variable)),
            seq(kw("PIPE"), field("filename", $.variable)),
            seq(kw("XML HANDLER")),
            seq(kw("OUTPUT"), field("filename", $.variable)),
          ),
        ),
      ),
      optional(
        field(
          "option",
          choice(
            seq(kw("LEFT MARGIN"), $.expression),
            seq(kw("RIGHT MARGIN"), $.expression),
            seq(kw("TOP MARGIN"), $.expression),
            seq(kw("BOTTOM MARGIN"), $.expression),
            seq(kw("PAGE LENGTH"), $.expression),
            seq(kw("TOP OF PAGE")),
          ),
        ),
      ),
    ),
  expression: (/** @type {any} */ $) =>
    choice(
      $.literal,
      $.variable,
      $._boolean_expression,
      $._number_expression,
      $._function_expression,
      $._special_expression,
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
      prec.left(PREC.ascii, seq(field("left", $.expression), kw("SPACE"))),
    ),
  _function_expression: (/** @type {any} */ $) =>
    seq($._names, "(", optional($._params), ")"),
  _special_expression: (/** @type {any} */ $) =>
    choice(
      seq(kw("ASCII"), field("right", $._scale)),
      seq(field("left", $._scale), kw("SPACES")),
    ),
  defer: (/** @type {any} */ $) =>
    choice(kw("DEFER"), choice(kw("INTERRUPT"), kw("QUIT"))),
  let: (/** @type {any} */ $) =>
    seq(kw("LET"), $._names, "=", field("value", $.expression)),
  locate: (/** @type {any} */ $) =>
    seq(
      kw("LOCATE"),
      $._names,
      kw("IN"),
      choice(kw("MEMORY"), seq(kw("FILE"), field("value", $.variable))),
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
      $._names,
      choice(
        kw("TO NULL"),
        seq(
          kw("LIKE"),
          field(
            "format",
            choice(seq($._table, ".", "*"), seq($._table, ".", $._column)),
          ),
        ),
      ),
    ),
  _option_line: (/** @type {any} */ $) =>
    choice(
      $._scale,
      seq(kw("FIRST"), optional(field("scale", seq("+", $.number)))),
      seq(kw("LAST"), optional(field("scale", seq("-", $.number)))),
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
      field("right", seq($.identifier, repeat(seq(".", $.identifier)))),
    ),
};
