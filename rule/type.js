/// <reference types="tree-sitter-cli/dsl" />
// @ts-check
import {
  integerLiterals,
  decimalLiterals,
  commaSep,
  datetimeQualifier,
  kw,
  commaSep1,
  dotSep1,
} from "./util.js";

export default {
  // 标识符
  identifier: (/** @type {any} */ $) => /[a-zA-Z_][a-zA-Z0-9_]*/,
  // 字面值
  literal: (/** @type {any} */ $) =>
    choice($.string, $.number, $.datetime, $.buildin),
  // 字符串
  string: (/** @type {any} */ $) =>
    choice(
      token(
        prec(
          2,
          seq(
            '"',
            repeat(
              field(
                "content",
                choice(
                  // 普通字符（不含 " 和 \）
                  /[^"\\]/,
                  // 转义序列：\n, \", \\, \t 等
                  /\\./,
                  '""',
                ),
              ),
            ),
            '"',
          ),
        ),
      ),
      token(
        prec(
          2,
          seq(
            "'",
            repeat(
              field(
                "content",
                choice(
                  // 普通字符（不含 " 和 \）
                  /[^'\\]/,
                  // 转义序列：\n, \", \\, \t 等
                  /\\./,
                  "''",
                ),
              ),
            ),
            "'",
          ),
        ),
      ),
    ),
  number: (/** @type {any} */ $) =>
    token.immediate(choice(integerLiterals, decimalLiterals)),
  _qual1_2: (/** @type {any} */ $) =>
    seq(
      field("qual1", datetimeQualifier),
      kw("TO"),
      field("qual2", datetimeQualifier),
    ),
  datetime: (/** @type {any} */ $) =>
    choice(
      seq(kw("CURRENT"), $._qual1_2),
      seq(kw("DATETIME"), "(", /[^)]+/, ")", $._qual1_2),
      seq(kw("INTERVAL"), "(", /[^)]+/, ")", $._qual1_2),
    ),
  // 内建字面值
  buildin: (/** @type {any} */ $) =>
    choice(
      kw("NULL"),
      kw("TODAY"),
      kw("CURRENT"),
      // COLUMN？
    ),
  // 变量可能的表达式
  variable: (/** @type {any} */ $) => choice($.identifier, $.object, $.slice),
  object: (/** @type {any} */ $) =>
    prec.left(
      1,
      choice(
        seq(
          field("object", $.variable),
          ".",
          choice(field("property", $.identifier), "*"),
        ),
      ),
    ),
  slice: (/** @type {any} */ $) =>
    prec.left(
      2,
      seq(field("object", $.variable), "[", commaSep1($.expression), "]"),
    ),
  // 类型的定义
  types: (/** @type {any} */ $) =>
    choice(
      prec(1, choice($.basic, $.like, $.record, $.array)),
      alias(dotSep1($.identifier), $.user_type),
    ),

  basic: (/** @type {any} */ $) =>
    choice(
      // CHAR
      seq(kw("CHAR"), optional(seq("(", $._scale, ")"))),
      //CHARACTER
      seq(kw("CHARACTER"), optional(seq("(", $._scale, ")"))),
      seq(
        kw("VARCHAR"),
        optional(seq("(", $._scale, optional(seq(",", $._scale)), ")")),
      ),
      kw("STRING"),
      kw("BIGINT"),
      kw("INTEGER"),
      kw("SMALLINT"),
      kw("TINYINT"),
      kw("FLOAT"),
      kw("SMALLFLOAT"),
      //DECIMAL
      seq(
        kw("DECIMAL"),
        optional(seq("(", $._scale, optional(seq(",", $._scale)), ")")),
      ),
      // MONEY
      seq(
        kw("MONEY"),
        optional(seq("(", $._scale, optional(seq(",", $._scale)), ")")),
      ),
      kw("DATE"),
      seq(kw("DATETIME"), datetimeQualifier, kw("TO"), datetimeQualifier),
      seq(kw("INTERVAL"), datetimeQualifier, kw("TO"), datetimeQualifier),
      kw("BYTE"),
      kw("TEXT"),
      kw("BOOLEAN"),
    ),
  like: (/** @type {any} */ $) =>
    seq(
      kw("LIKE"),
      seq(optional(seq($._dbname, ":")), $._table, ".", $._column),
    ),
  _variable_list: (/** @type {any} */ $) =>
    commaSep1(
      seq(commaSep1(field("name", $.identifier)), field("types", $.types)),
    ),
  record: (/** @type {any} */ $) =>
    choice(
      seq(kw("RECORD"), $._variable_list, kw("END RECORD")),
      seq(
        kw("RECORD"),
        kw("LIKE"),
        optional(seq($._dbname, ":")),
        $._table,
        ".",
        "*",
      ),
    ),
  array: (/** @type {any} */ $) =>
    choice(
      seq(kw("ARRAY"), "[", commaSep1($._scale), "]", kw("OF"), $.types),
      seq(
        kw("DYNAMIC"),
        kw("ARRAY"),
        optional(seq(kw("WITH"), kw("DIMENSION"), $._scale)),
        kw("OF"),
        $.types,
      ),
      seq(kw("ARRAY"), "[", "]", kw("OF"), $.types),
    ),
  // globals 块
  globals: (/** @type {any} */ $) =>
    choice(
      seq(
        kw("GLOBALS"),
        repeat(choice($.constant, $.type, $.define)),
        kw("END"),
        kw("GLOBALS"),
      ),
      seq(kw("GLOBALS"), field("filename", choice($.variable, $.string))),
    ),
  // 常量
  constant: (/** @type {any} */ $) =>
    seq(
      optional($.scope),
      kw("CONSTANT"),
      commaSep1(field("const", $._constant_statement)),
    ),
  _constant_statement: (/** @type {any} */ $) =>
    seq(
      $._name,
      optional(field("types", $.types)),
      "=",
      field("value", $.literal),
    ),
  // 类型定义
  type: (/** @type {any} */ $) =>
    seq(optional($.scope), kw("TYPE"), $._variable_list),
  // 变量定义
  define: (/** @type {any} */ $) =>
    seq(optional($.scope), kw("DEFINE"), $._variable_list),

  // 以下定义只是为了缩减常见语句长度
  _dbname: (/** @type {any} */ $) => field("dbname", $.identifier),
  _table: (/** @type {any} */ $) => field("table", $.identifier),
  _column: (/** @type {any} */ $) => field("column", $.identifier),
  _name: (/** @type {any} */ $) => field("name", $.identifier),
  _names: (/** @type {any} */ $) => field("name", $.variable),
  _key: (/** @type {any} */ $) =>
    field("key", seq($.identifier, repeat(seq("-", $.identifier)))),
  _param: (/** @type {any} */ $) => commaSep1(field("params", $.identifier)),
  _params: (/** @type {any} */ $) =>
    commaSep1(
      field(
        "params",
        choice($.expression, seq("[", commaSep($.expression), "]")),
      ),
    ),
  _value: (/** @type {any} */ $) => field("value", $.expression),
  _sqlstring: (/** @type {any} */ $) => field("sql", $.expression),
  _cid: (/** @type {any} */ $) => field("name", $.identifier),
  _scale: (/** @type {any} */ $) =>
    field("scale", choice($.variable, $.number)),
};
