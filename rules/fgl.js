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
      $.demo_statement
    ),
  demo_statement: ($) =>'ON ACTION',
  defer_statement: ($) => seq(kw("DEFER"), choice(kw("INTERRUPT"), kw("QUIT"))),
  // 变量操作
  variable_statement: ($) =>
    choice(
      seq(kw("LET"), $._variable, "=", $._expression),
      // VALIDATE
      seq(
        kw("VALIDATE"),
        commaSep1($._variable),
        kw("LIKE"),
        choice(
          seq(alias($._identifier, "table_name"), ".*"),
          seq(
            alias($._identifier, "table_name"),
            ".",
            alias($._identifier, "column_name"),
          ),
        ),
      ),
      seq(kw("FREE"), $._identifier),
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
              seq(alias($._identifier, "table_name"), ".*"),
              seq(
                alias($._identifier, "table_name"),
                ".",
                alias($._identifier, "column_name"),
              ),
            ),
          ),
        ),
      ),
    ),
  _locate_statement: ($) =>
    seq(
      kw("LOCATE"),
      commaSep1($._identifier),
      kw("IN"),
      choice(
        kw("MEMORY"),
        kw("FILE"),
        seq(kw("FILE"), choice($._string_literal, $._identifier)),
      ),
    ),
  // 错误处理
  exception_statement: ($) =>
    choice(
      seq(kw("WHENEVER"), $._exception_classes, $._exception_action),
      seq(kw("TRY"), $._statement, kw("CATCH"), $._statement, kw("END TRY")),
    ),
  _exception_classes: ($) =>
    choice(seq(optional(kw('ANY')), kw("ERROR")), seq(kw('ANY'), kw("SQLERROR")), kw("NOT FOUND"), kw("WARNING")),
  _exception_action: ($) =>
    choice(
      kw("STOP"),
      kw("CONTINUE"),
      kw("RAISE"),
      seq(kw("CALL"), alias($.variable, "func_name")),
      seq(kw("GOTO"), alias($.variable, "label_name")),
    ),
  // 流程控制
  flow_ctrl_statement: ($) => choice(
    $._call_flow,
    $._return_flow,
    $._case_flow,
    $._continue_flow,
    $._exit_flow,
    $._for_flow,
    $._goto_flow,
    $._if_flow,
    $._label_flow,
    $._sleep_flow,
    $._while_flow,
  ),
  _call_flow: ($) => seq(
    kw('CALL'),
    alias($._variable, 'func_name'),
    '(',
    alias(commaSep($._expression), 'func_params'),
    ')',
    optional(
      seq(
        kw('RETURNING'),
        alias(commaSep1($._variable), 'func_returns'),
      )
    )
  ),
  _return_flow: ($) => seq(
    kw('RETURN'),
    alias(commaSep($._expression), 'func_returns'),
  ),
  _case_flow: ($) => seq(
    kw('CASE'),
    alias(optional($._variable), 'case_vairable'),
    repeat(
      seq(
        kw('WHEN'),
        choice($._variable, $._expression),
        repeat(
          choice(
            $.fgl_statement,
            $.sql_statement,
          )
        )
      ),
    ),
    optional(
      seq(
        kw('OTHERWISE'),
        repeat(
          choice(
            $.fgl_statement,
            $.sql_statement,
          )
        )
      )
    ),
    kw('END CASE')
  ),
  _continue_flow: ($) => seq(kw('CONTINUE'), choice(
    kw('FOR'),
    kw('FOREACH'),
    kw('WHILE'),
    kw('MENU'),
    kw('CONSTRUCT'),
    kw('INPUT'),
    kw('DIALOG'),
  )),
  _exit_flow: ($) => seq(kw('EXIT'), choice(
    kw('CASE'),
    kw('FOR'),
    kw('FOREACH'),
    kw('WHILE'),
    kw('MENU'),
    kw('CONSTRUCT'),
    kw('REPORT'),
    kw('DISPLAY'),
    kw('INPUT'),
    kw('DIALOG'),
  )),
  _for_flow: ($) => seq(
    kw('FOR'),
    $._variable,
    '=',
    $._expression,
    kw('TO'),
    $._expression,
    optional(
      seq(
        kw('STEP'),
        $._expression,
      )
    ),
    repeat(
      choice($.fgl_statement,
        $.sql_statement,)
    ),
    kw('END FOR')
  ),
  _goto_flow: ($) => seq(
    kw('GOTO'),
    optional(':'),
    alias($._identifier, 'label_name')
  ),
  _if_flow: ($) => seq(
    kw('IF'),
    $._expression,
    kw('THEN'),
    repeat(choice($.fgl_statement, $.sql_statement)),
    optional(
      seq(
        kw('ELSE'),
        repeat(choice($.fgl_statement, $.sql_statement))
      )
    ),
    kw('END IF')
  ),
  _label_flow: ($) => seq(
    kw('LABEL'),
    alias($._identifier, 'label_name'),
    ":"
  ),
  _sleep_flow: ($) => seq(
    kw('SLEEP'),
    $._expression
  ),
  _while_flow: ($) => seq(
    kw('WHILE'),
    $._expression,
    repeat(choice($.fgl_statement, $.sql_statement)),
    kw('END WHILE'),
  ),
  preprocessor_statement: ($) => $._preprocessor_statement,
  _preprocessor_statement: ($) => choice(
    seq('&include', $._string_literal),
    seq(
      '&define',
      alias(seq(
        $._identifier,
        optional(seq('(', commaSep($._identifier), ')')),
      ), 'define_identifier'),
      alias($._pre_define_content, '&define_content'))
  ),
  // _pre_define_body: ($) => repeat1(
  //   choice(
  //     /\\\r?\n/,
  //     /[^\n\\]+/,
  //     /\\.[^\n\\]*/
  //   )
  // ),
  _pre_define_content: ($) => seq(
    repeat(choice(
      /.*\\\r?\n/,      // 匹配以 \ 结尾的行（包含 \ 和换行）
      /[^\n\\]+/,       // 匹配行内普通字符
      /\\./             // 匹配单个转义字符
    )),
    /[^\n]*/            // 匹配最后一行（不带反斜杠的结尾行）
  ),
  // 结果是一个值的内容
  expression: ($) => $._expression,
  _expression: ($) =>
    choice(
      $._literal,
      $._variable,
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
      prec.right(PREC.ascii, seq($._expression, kw("USING"), $._expression)),
      prec.left(PREC.ascii, seq($._expression, kw("CLIPPED"))),
      prec.left(PREC.ascii, seq($._expression, kw("SPACE"))),
    ),
  _function_expression: ($) =>
    seq($._variable, "(", commaSep($._expression), ")"),
  ...interface_statement,
};
