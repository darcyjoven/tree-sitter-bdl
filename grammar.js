/**
 * @file Genero Business Development Language
 * @author darcy <darcy_joven@live.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

import {
  integerLiterals,
  decimalLiterals,
  datetimeQualifier,
  commaSep1,
  kw,
  commaSep,
} from "./rules/util.js";
import sqlStatement from "./rules/sql.js";
import { externals as sqlExternals } from "./rules/sql.js";
import fglStatement from "./rules/fgl.js";

export default grammar({
  name: "bdl",

  extras: ($) => [$.comment, /\s/],

  externals: ($) => [...sqlExternals($)],

  inline: ($) => [$._constant_statement, $.scope],

  conflicts: ($) => [
    [$._case_flow, $._expression],
    // [$.variable, $._expression]
  ],

  rules: {
    //============================================================
    // 指令(directive) -> 声明(declaration) -> 函数（function）
    source_file: ($) =>
      seq(repeat($._directive), repeat($._declaration), repeat($._function)),

    //============================================================
    // 指令(Directive)
    // compiler import schema
    _directive: ($) =>
      choice(
        $.compiler_options,
        $.import_statement,
        $.schema_statement,
        $.preprocessor_statement,
      ),

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
            kw("ATTRIBUTES"),
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
          seq(
            kw("ON TERMINATE SIGNAL CALL"),
            alias($._identifier, "func_name"),
          ),
          // Front-end termination
          // ON CLOSE APPLICATION CALL function
          seq(
            kw("ON CLOSE APPLICATION CALL"),
            alias($._identifier, "func_name"),
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
              alias($._identifier, "dbname"),
              optional(seq("@", alias($._identifier, "dbserver"))),
            ),
            alias($._string_literal, "dbname"),
          ),
          optional(kw("EXCLUSIVE")),
        ),
        // "SCHEMA  dbname",
        seq(kw("SCHEMA"), alias($._identifier, "dbname")),
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
        alias($._identifier, $.constant_name),
        alias(optional($._data_type), $.data_type),
        "=",
        $.literal,
      ),
    // 类型定义
    user_type_definition: ($) =>
      seq(optional($.scope), kw("TYPE"), $._variable_list),
    // 变量定义
    variable_definition: ($) =>
      seq(optional($.scope), kw("DEFINE"), $._variable_list),

    // 数据类型
    _data_type: ($) =>
      choice(
        $._basic_data_type,
        $._like_data_type,
        $._record_data_type,
        $._array_data_type,
      ),
    _basic_data_type: ($) =>
      choice(
        // CHAR
        seq(
          kw("CHAR"),
          optional(
            seq(
              "(",
              alias(choice($._natural_number, $._identifier), "length"),
              ")",
            ),
          ),
        ),
        //CHARACTER
        seq(
          kw("CHARACTER"),
          optional(
            seq(
              "(",
              alias(choice($._natural_number, $._identifier), "length"),
              ")",
            ),
          ),
        ),
        seq(
          kw("VARCHAR"),
          optional(
            seq(
              "(",
              alias(choice($._natural_number, $._identifier), "length"),
              optional(
                seq(
                  ",",
                  alias(choice($._natural_number, $._identifier), "length"),
                ),
              ),
              ")",
            ),
          ),
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
          optional(
            seq(
              "(",
              alias(choice($._natural_number, $._identifier), "length"),
              optional(
                seq(
                  ",",
                  alias(choice($._natural_number, $._identifier), "length"),
                ),
              ),
              ")",
            ),
          ),
        ),
        // MONEY
        seq(
          kw("MONEY"),
          optional(
            seq(
              "(",
              alias(choice($._natural_number, $._identifier), "length"),
              optional(
                seq(
                  ",",
                  alias(choice($._natural_number, $._identifier), "length"),
                ),
              ),
              ")",
            ),
          ),
        ),
        kw("DATE"),
        seq(kw("DATETIME"), datetimeQualifier, kw("TO"), datetimeQualifier),
        seq(kw("INTERVAL"), datetimeQualifier, kw("TO"), datetimeQualifier),
        kw("BYTE"),
        kw("TEXT"),
        kw("BOOLEAN"),
      ),
    _like_data_type: ($) =>
      seq(
        kw("LIKE"),
        seq(
          // [dbname:]
          optional(seq(alias($._identifier, "dbname"), ":")),
          // tabname
          alias($._identifier, "table_name"),
          // .colname
          ".",
          alias($._identifier, "column_name"),
        ),
      ),
    _record_data_type: ($) =>
      choice(
        seq(kw("RECORD"), $._record_list, kw("END RECORD")),
        seq(
          kw("RECORD"),
          kw("LIKE"),
          optional(seq(alias($._identifier, "dbname"), ":")),
          alias($._identifier, "table_name"),
          ".",
          "*",
        ),
      ),
    _array_data_type: ($) =>
      choice(
        seq(
          kw("ARRAY"),
          "[",
          commaSep1($._natural_number),
          "]",
          kw("OF"),
          $._data_type,
        ),
        seq(
          kw("DYNAMIC ARRAY"),
          optional(seq(kw("WITH DIMENSION"), /[1-3]/)),
          kw("OF"),
          $._data_type,
        ),
        seq(kw("ARRAY"), "[", "]", kw("OF"), alias($._identifier, "java_type")),
      ),
    // 系列类型，用于type record define
    _variable_list: ($) =>
      choice(
        prec(
          1,
          commaSep1(
            seq(
              alias($._identifier, $.variable_name),
              alias($._data_type, $.data_type),
            ),
          ),
        ),
        seq(
          commaSep1(alias($._identifier, $.variable_name)),
          alias($._data_type, $.data_type),
        ),
      ),
    // record 因为有end record
    _record_list: ($) =>
      commaSep1(
        seq(
          alias($._identifier, $.variable_name),
          alias($._data_type, $.data_type),
        ),
      ),
    //============================================================
    // 函数（function）
    // main function report dialog
    _function: ($) =>
      choice($.main_block, $.function_block, $.report_block, $.dialog_block),
    main_block: ($) =>
      seq(
        kw("MAIN"),
        seq(repeat($._top_declaration), repeat($._statement)),
        kw("END MAIN"),
      ),
    function_block: ($) =>
      seq(
        optional($.scope),
        kw("FUNCTION"),
        alias($._identifier, "func_name"),
        "(",
        commaSep(alias($._identifier, "param_name")),
        ")",
        seq(repeat($._top_declaration), repeat($._statement)),
        kw("END FUNCTION"),
      ),
    report_block: ($) => "__report_block_",
    dialog_block: ($) => "__dialog_block_",

    _top_declaration: ($) =>
      choice(
        $.constant_definition,
        $.user_type_definition,
        $.variable_definition,
      ),
    _statement: ($) => choice($.fgl_statement, $.sql_statement),

    // ============================import========================
    ...fglStatement,
    ...sqlStatement,
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
    _identifier: (_) => /[_\p{XID_Start}][_\p{XID_Continue}]*/u,
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
  },
});
