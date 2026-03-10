/// <reference types="tree-sitter-cli/dsl" />

import { commaSep, commaSep1, kw } from "./util.js";
// @ts-check

export default {
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
      commaSep1(
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
        kw("CONNECT"),
        kw("TO"),
        alias(choice($._unquoted_string, kw("DEFAULT")), "dbname"),
        optional(seq(kw("AS"), alias($._unquoted_string, "session_name"))),
        optional(
          seq(
            kw("USER"),
            alias($._unquoted_string, "username"),
            kw("USING"),
            alias($._unquoted_string, "password"),
          ),
        ),
        optional(seq(kw("WITH"), kw("CONCURRENT"), kw("TRANSACTION"))),
      ),
      // "DATABASE { dbname[@dbserver] | variable | string } [EXCLUSIVE]",
      seq(
        optional(kw("DESCRIBE")),
        kw("DATABASE"),
        seq(
          alias(choice($._variable, $._string_literal), "dbname"),
          optional(seq("@", alias($._identifier, "dbserver"))),
        ),
        optional(kw("EXCLUSIVE")),
      ),
      // "SCHEMA  dbname",
      seq(kw("SCHEMA"), alias($._identifier, "dbname")),
      // DISCONNECT
      seq(
        kw("DISCONNECT"),
        choice(kw("ALL"), kw("CURRENT"), $._string_literal, $._variable),
      ),
      // SET CONNECTION
      seq(
        kw("SET"),
        kw("CONNECTION"),
        choice(
          seq(
            choice($._string_literal, kw("DEFAULT")),
            optional(kw("DORMANT")),
          ),
          seq(kw("CURRENT"), kw("DORMANT")),
        ),
      ),
    ),

  //============================================================
  // 函数（function）
  // main function report dialog
  _function: ($) =>
    choice(
      $.main_block,
      $.function_block,
      $.report_block,
      //$.dialog_block
    ),
  // dialog_block 在fgl2.5中才能实现，目前没有环境无法测试
  main_block: ($) =>
    seq(
      kw("MAIN"),
      seq(repeat($._top_declaration), repeat($._statement)),
      seq(kw("END"), kw("MAIN")),
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
      kw("END"),
      kw("FUNCTION"),
    ),
  report_block: ($) => "__report_block_",
  // dialog_block: ($) => "__dialog_block_",

  _top_declaration: ($) =>
    choice(
      $.constant_definition,
      $.user_type_definition,
      $.variable_definition,
    ),
  _statement: ($) => choice($._fgl_statement, $._sql_statement),
};
