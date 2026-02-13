/**
 * @file Genero Business Development Language
 * @author darcy <darcy_joven@live.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const digit = /[0-9]/;

const integerLiterals = seq(optional(choice("+", "-")), repeat1(digit));
const decimalLiterals = seq(
  optional(choice("+", "-")),
  repeat(digit),
  ".",
  repeat1(digit),
  optional(seq(choice("e", "E"), choice("-", "+"), repeat1(digit))),
);

export default grammar({
  name: "bdl",

  extras: ($) => [$.comment, /\s/],

  inline: ($) => [$.literal, $._constant_statement, $.scope],

  rules: {
    //============================================================
    // 指令(directive) -> 声明(declaration) -> 函数（function）
    source_file: ($) =>
      seq(repeat($._directive), repeat($._declaration), repeat($._function)),

    //============================================================
    // 指令(Directive)
    // compiler import schema
    _directive: ($) =>
      choice($.compiler_options, $.import_statement, $.schema_statement),

    compiler_options: ($) =>
      seq(
        kw("OPTIONS"),
        choice(
          // Controlling semantics of AND / OR operators
          kw("SHORT CIRCUIT"),
          // Defining the position of reserved lines
          // OPTIONS { MENU LINE line-value| MESSAGE LINE line-value| COMMENT LINE {OFF|line-value}| PROMPT LINE line-value| ERROR LINE line-value| FORM LINE line-value}
          choice(
            seq(kw("MENU LINE"), $._natural_number),
            seq(kw("MESSAGE LINE"), $._natural_number),
            seq(kw("COMMENT LINE"), choice(kw("OFF"), $._natural_number)),
            seq(kw("PROMPT LINE"), $._natural_number),
            seq(kw("ERROR LINE"), $._natural_number),
            seq(kw("FORM LINE"), $._natural_number),
          ),
          // Defining default TTY attributes
          // OPTIONS { INPUT | DISPLAY } ATTRIBUTES ({FORM|WINDOW|attributes)
          seq(
            choice(kw("INPUT"), kw("DISPLAY")),
            kw("ATTRIBUTES "),
            "(",
            choice(
              kw("FORM"),
              kw("WINDOW"),
              choice(
                kw("BLACK"),
                kw("BLUE"),
                kw("CYAN"),
                kw("GREEN"),
                kw("MAGENTA"),
                kw("RED"),
                kw("WHITE"),
                kw("YELLO"),
                kw("BOLD"),
                kw("DIM"),
                kw("INVISIBLE"),
                kw("NORMAL"),
                kw("REVERSE"),
                kw("BLINK"),
                kw("UNDERLINE"),
              ),
            ),
            ")",
          ),
          // Defining the field input loop
          // OPTIONS INPUT [NO] WRAP
          seq(kw("INPUT"), optional(kw("NO")), kw("WRAP")),
          // Defining field tabbing order
          // FIELD ORDER { CONSTRAINED | UNCONSTRAINED | FORM }
          seq(
            kw("FIELD ORDER"),
            choice(kw("CONSTRAINED"), kw("UNCONSTRAINED"), kw("FORM")),
          ),
          // Application termination
          // ON TERMINATE SIGNAL CALL function
          seq(kw("ON TERMINATE SIGNAL CALL"), alias($.identifier, "func_name")),
          // Front-end termination
          // ON CLOSE APPLICATION CALL function
          seq(
            kw("ON CLOSE APPLICATION CALL"),
            alias($.identifier, "func_name"),
          ),
          // Defining the message file
          // HELP FILE filename
          seq(kw("HELP FILE"), alias($._unquoted_string, "file_name")),
          // Defining control keys
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
            alias($._unquoted_string, "key_name"),
          ),
          // Setting default screen modes for sub-programs
          // RUN IN {FORM|LINE} MODE
          seq(kw("RUN IN"), choice(kw("FORM"), kw("LINE")), kw("MODE")),
          // Enabling/disabling SQL interruption
          // SQL INTERRUPT { ON | OFF }
          seq(kw("SQL INTERRUPT"), choice(kw("ON"), kw("OFF"))),
        ),
      ),
    import_statement: ($) =>
      seq(
        kw("IMPORT"),
        optional(choice(kw("FGL"), kw("JAVA"))),
        choice(alias($._unquoted_string, "file_name")),
      ),
    schema_statement: ($) =>
      choice(
        // "CONNECT TO dbspec [USER username USING password]",
        seq(
          kw("CONNECT TO"),
          alias($._unquoted_string, "dbname"),
          optional(
            seq(
              kw("USER"),
              alias($._unquoted_string, "username"),
              kw("USING"),
              alias($._unquoted_string, "password"),
            ),
          ),
        ),
        // "DATABASE { dbname[@dbserver] | variable | string } [EXCLUSIVE]",
        seq(
          optional(kw("DESCRIBE")),
          kw("DATABASE"),
          choice(
            seq(
              alias($.identifier, "dbname"),
              optional(seq("@", alias($.identifier, "dbserver"))),
            ),
            alias($._string_literal, "dbname"), // TODO 字符串 字面值
          ),
          optional(kw("EXCLUSIVE")),
        ),
        // "SCHEMA  dbname",
        seq(kw("SCHEMA"), alias($.identifier, "dbname")),
      ),

    //============================================================
    // 声明(declaration)
    // globals constant type variable
    _declaration: ($) =>
      choice(
        $.globals_inclusion,
        $.constant_definition,
        $.user_type_definition,
        $.variable_definition,
      ),
    // 全局
    globals_inclusion: ($) =>
      choice(
        seq(
          kw("GLOBALS"),
          choice(
            $.constant_definition,
            $.user_type_definition,
            $.variable_definition,
          ),
          kw("END GLOBALS"),
        ),
        seq(kw("GLOBALS"), alias($._string_literal, "filename")),
      ),
    // 常量
    constant_definition: ($) =>
      seq(optional($.scope), kw("CONSTANT"), commaSep1($._constant_statement)),
    _constant_statement: ($) =>
      seq(
        alias($.identifier, "constant_identifier"),
        optional($._data_type),
        "=",
        $.literal,
      ),
    // 类型定义
    user_type_definition: ($) =>
      seq(
        optional($.scope),
        kw("TYPE"),
        commaSep1(seq(alias($.identifier, "type_name"), $._data_type)),
      ),
    // 变量定义
    variable_definition: ($) =>
      seq(
        optional($.scope),
        kw("DEFINE"),
        commaSep1(seq(alias($.identifier, "type_name"), $._data_type)),
      ),

    // 数据类型
    _data_type: ($) => "__data_type__",
    //============================================================
    // 函数（function）
    // main function report dialog
    _function: ($) => "__function__",
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
    identifier: (_) => /[_\p{XID_Start}][_\p{XID_Continue}]*/u,
    // 整数
    _natural_number: (_) => /\d+/,
    // 字面值
    literal: ($) => choice($._string_literal, $._number_literal),
    _string_literal: (_) =>
      choice(
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
    _number_literal: (_) => choice(integerLiterals, decimalLiterals),
    // 作用域
    scope: ($) => choice(kw("PRIVATE"), kw("PUBLIC")),
  },
});

/**
 * Creates a rule to match one or more of the rules separated by a comma
 * 用逗号将1个或者多个规则拼接
 *
 * @param {Rule} rule
 *
 * @returns {SeqRule}
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

/**
 * Creates a rule to optionally match one or more of the rules separated by a comma
 * 用逗号将0个或者多个规则拼接
 *
 * @param {Rule} rule
 *
 * @returns {ChoiceRule}
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}
/**
 * 将多词短语转为不区分大小写的 Tree-sitter 序列
 * @param {string} phrase - 例如 "end function"
 * @returns {Rule|RegExp} Tree-sitter 规则序列
 */
function kw(phrase) {
  // 1. 将单词按空格拆开
  const words = phrase.split(/\s+/);

  // 2. 将每个单词转为不区分大小写的正则规则
  const stickyRules = words.map((word) => {
    return new RegExp(
      word
        .split("")
        .map((char) => `[${char.toLowerCase()}${char.toUpperCase()}]`)
        .join(""),
    );
  });

  // 3. 使用 seq 将单词串联起来，中间插入至少一个空格的匹配
  // 如果只有一个单词，直接返回该正则；如果有多个，中间插入 /\s+/
  if (stickyRules.length === 1) return stickyRules[0];

  const result = [];
  for (let i = 0; i < stickyRules.length; i++) {
    result.push(stickyRules[i]);
    if (i < stickyRules.length - 1) {
      result.push(/\s+/); // 在单词之间插入空格规则
    }
  }

  return seq(...result);
}
