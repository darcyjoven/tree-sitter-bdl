/// <reference types="tree-sitter-cli/dsl" />
import {
  integerLiterals,
  decimalLiterals,
  datetimeQualifier,
  commaSep1,
  kw,
} from "./util.js";
// @ts-check

export default {
  //============================================================
  // 以下是常用的定义，不在主结构中
  //
  // 注释
  comment: (_) =>
    token(
      choice(
        seq("--", /.*/), // -- 行注释
        seq("#", /.*/), // # 行注释
        seq("{", /[^}]*/, "}"), // { } 块注释
      ),
    ),
  // 空白符结束的字符串
  _unquoted_string: (_) => /[^\s]+/,
  // 标识符
  identifier: ($) => $._identifier,
  // 允许连字符
  _identifier: (_) => /[a-zA-Z_][a-zA-Z0-9_-]*/,
  // 整数
  _natural_number: (_) => /\d+/,
  // 字面值
  literal: ($) => $._literal,
  _literal: ($) =>
    choice($._string_literal, $._number_literal, $._datetime_literal),
  _string_literal: (_) =>
    choice(
      token(
        prec(
          2,
          seq(
            '"',
            repeat(
              choice(
                // 普通字符（不含 " 和 \）
                alias(/[^"\\]/, "string_content"),
                // 转义序列：\n, \", \\, \t 等
                alias(/\\./, "string_content"),
                alias('""', "string_content"),
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
              choice(
                // 普通字符（不含 " 和 \）
                alias(/[^'\\]/, "string_content"),
                // 转义序列：\n, \", \\, \t 等
                alias(/\\./, "string_content"),
                alias("''", "string_content"),
              ),
            ),
            "'",
          ),
        ),
      ),
    ),
  _number_literal: (_) => choice(integerLiterals, decimalLiterals),
  _datetime_literal: (_) =>
    choice(
      seq(kw("CURRENT"), datetimeQualifier, kw("TO"), datetimeQualifier),
      seq(
        kw("DATETIME"),
        "(",
        /[^)]+/,
        ")",
        datetimeQualifier,
        kw("TO"),
        datetimeQualifier,
      ),
      seq(
        kw("INTERVAL"),
        "(",
        /[^)]+/,
        ")",
        datetimeQualifier,
        kw("TO"),
        datetimeQualifier,
      ),
    ),
  _other_literal: (_) => choice(kw("NULL"), kw("TODAY")),
  // 作用域
  scope: ($) => choice(kw("PRIVATE"), kw("PUBLIC")),
  // 变量/方法名
  variable: ($) => $._variable,
  _variable: ($) => choice($._identifier, $._member, $._array_item),
  _member: ($) =>
    prec.left(
      1,
      choice(
        seq(
          field("object", $._variable),
          ".",
          choice(field("member", $._identifier), "*"),
        ),
      ),
    ),
  _array_item: ($) =>
    prec.left(
      2,
      seq(field("object", $._variable), "[", commaSep1($._expression), "]"),
    ),
};
