/// <reference types="tree-sitter-cli/dsl" />

import interface_statement from "./interface.js";
import { commaSep, commaSep1, datetimeQualifier, kw, PREC } from "./util.js";
// @ts-check

export default {
  fgl_statement: ($) =>
    choice(
      $.defer_statement,
      $.flow_ctrl_statement,
      $.exception_statement,
      $.variable_statement,
      $.preprocessor_statement,
      $.interface_statement,
      $.schema_statement,
    ),
  defer_statement: ($) => seq(kw("DEFER"), choice(kw("INTERRUPT"), kw("QUIT"))),
  // 变量操作
  variable_statement: ($) =>
    choice(
      seq(kw("LET"), $.variable, "=", $._expression),
      // VALIDATE
      seq(
        kw("VALIDATE"),
        commaSep1($.variable),
        kw("LIKE"),
        choice(
          seq(alias($.identifier, "table_name"), ".*"),
          seq(
            alias($.identifier, "table_name"),
            ".",
            alias($.identifier, "column_name"),
          ),
        ),
      ),
      seq(kw("FREE"), $.identifier),
      // seq(kw("LOCATE"), $._expression),
      $._locate_statement,
      // INITIALIZE
      seq(
        kw("INITIALIZE"),
        commaSep1($.variable),
        choice(
          kw("TO NULL"),
          seq(
            kw("LIKE"),
            choice(
              seq(alias($.identifier, "table_name"), ".*"),
              seq(
                alias($.identifier, "table_name"),
                ".",
                alias($.identifier, "column_name"),
              ),
            ),
          ),
        ),
      ),
    ),
  _locate_statement: ($) =>
    seq(
      kw("LOCATE"),
      commaSep1($.identifier),
      kw("IN"),
      choice(
        kw("MEMORY"),
        kw("FILE"),
        seq(kw("FILE"), choice($._string_literal, $.identifier)),
      ),
    ),
  // 错误处理
  exception_statement: ($) =>
    choice(
      seq(kw("WHENEVER"), $._exception_classes, $._exception_action),
      seq(kw("TRY"), $._statement, kw("CATCH"), $._statement, kw("END TRY")),
    ),
  _exception_classes: ($) =>
    choice(kw("ERROR"), kw("SQLERROR"), kw("NOT FOUND"), kw("WARNING")),
  _exception_action: ($) =>
    choice(
      kw("STOP"),
      kw("CONTINUE"),
      kw("RAISE"),
      seq(kw("CALL"), alias($.identifier, "func_name")),
      seq(kw("GOTO"), alias($.identifier, "label_name")),
    ),
  // 流程控制
  flow_ctrl_statement: ($) => "flow_ctrl_statement",
  preprocessor_statement: ($) => "preprocessor_statement",
  // 结果是一个值的内容
  expression: ($) => $._expression,
  _expression: ($) =>
    choice(
      $.literal,
      $._boolean_expression,
      $._numberic_expression,
      $._string_expression,
      $._function_expression,
      $._bracket_expression,
    ),
  // 允许外加括号
  _bracket_expression: ($) =>
    choice(
      seq("(", $._expression, ")"),
      prec.right(
        PREC.comparative,
        seq($._expression, kw("THRU"), $._expression),
      ),
    ),
  // 结果是boolean的操作
  _boolean_expression: ($) =>
    choice(
      prec.left(PREC.and, seq($._expression, kw("AND"), $._expression)),
      prec.left(PREC.or, seq($._expression, kw("OR"), $._expression)),
      prec.right(PREC.not, seq(kw("NOT"), $._expression)),
      prec.left(PREC.null, seq($._expression, kw("IS NULL"))),
      prec.left(PREC.null, seq($._expression, kw("IS NOT NULL"))),
      prec.left(
        PREC.stringcomparison,
        seq(
          $._expression,
          kw("LIKE"),
          $._expression,
          optional(seq(kw("ESCAPE"), $._expression)),
        ),
      ),
      prec.right(
        PREC.stringcomparison,
        seq(
          $._expression,
          kw("MATCHES"),
          $._expression,
          optional(seq(kw("ESCAPE"), $._expression)),
        ),
      ),
      prec.left(PREC.comparative, seq($._expression, "=", $._expression)),
      prec.left(PREC.comparative, seq($._expression, "==", $._expression)),
      prec.left(PREC.comparative, seq($._expression, "!=", $._expression)),
      prec.left(PREC.comparative, seq($._expression, "<>", $._expression)),
      prec.left(PREC.comparative, seq($._expression, "<", $._expression)),
      prec.left(PREC.comparative, seq($._expression, "<=", $._expression)),
      prec.left(PREC.comparative, seq($._expression, ">", $._expression)),
      prec.left(PREC.comparative, seq($._expression, ">=", $._expression)),
    ),
  _numberic_expression: ($) =>
    choice(
      prec.left(
        PREC.call,
        seq(kw("COLUMN"), choice(seq("(", $._expression, ")"), $._expression)),
      ),
      prec.left(PREC.additive, seq($._expression, "+", $._expression)),
      prec.left(PREC.additive, seq($._expression, "-", $._expression)),
      prec.left(PREC.multiplicative, seq($._expression, "*", $._expression)),
      prec.left(PREC.multiplicative, seq($._expression, "/", $._expression)),
      prec.left(PREC.multiplicative, seq($._expression, "**", $._expression)),
      prec.left(
        PREC.multiplicative,
        seq($._expression, kw("MOD"), $._expression),
      ),
    ),
  _string_expression: ($) =>
    choice(
      // seq(kw("COLEMN"), choice(seq("(", $._expression, ")"), $._expression)),
      prec.left(-1, seq($._expression, "||", $._expression)),
      prec.left(-1, seq($._expression, ",", $._expression)),
      prec.right(PREC.ascii, seq($._expression, "USING", $._expression)),
      prec.left(PREC.ascii, seq($._expression, "CLIPPED")),
      prec.left(PREC.ascii, seq($._expression, "SPACE")),
    ),
  _function_expression: ($) =>
    seq($.variable, "(", commaSep($._expression), ")"),
  ...interface_statement,
};
