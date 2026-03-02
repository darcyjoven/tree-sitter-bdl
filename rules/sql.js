/// <reference types="tree-sitter-cli/dsl" />
import { commaSep1, kw } from "./util.js";
// @ts-check

const rules = {
  // 定义 SQL 相关的规则
  sql_statement: ($) => choice($._static_sql, $._dynamic_sql),
  // 静态SQL
  _static_sql: ($) =>
    choice(
      $.select_sql,
      $.insert_sql,
      $.delete_sql,
      $.update_sql,
      $.create_sql,
      $.alter_sql,
      $.drop_sql,
      $.block_sql,
      $.rename_sql,
    ),
  block_sql: ($) => seq(kw("SQL"), $._static_sql, kw("END SQL")),
  rename_sql: ($) =>
    seq(
      kw("RENAME"),
      choice(kw("TABLE"), kw("COLUMN"), kw("INDEX"), kw("SEQUENCE")),
      $._identifier,
      kw("TO"),
      $._identifier,
    ),
  _dynamic_sql: ($) =>
    choice(
      $.prepare_sql,
      $.execute_sql,
      // $.free_sql,
      $.declare_sql,
      $.open_sql,
      $.fetch_sql,
      $.close_sql,
      $.foreach_sql,
      $.put_sql,
      $.flush_sql,
    ),
  prepare_sql: ($) =>
    seq(kw("PREPARE"), $._identifier, kw("FROM"), $._string_literal),
  execute_sql: ($) =>
    choice(
      seq(
        kw("EXECUTE"),
        $._identifier,
        optional(
          seq(
            kw("USING"),
            commaSep1(
              seq(
                $._expression,
                optional(choice(kw("IN"), kw("OUT"), kw("INOUT"))),
              ),
            ),
          ),
        ),
        optional(seq(kw("INTO"), commaSep1($._variable))),
      ),
      seq(kw("EXECUTE IMMEDIATE"), $._string_literal),
    ),
  // 当作fgl处理
  // free_sql: ($) => seq(kw("FREE"), $._identifier),
  declare_sql: ($) =>
    seq(
      kw("DECLARE"),
      $._identifier,
      optional(kw("SCROLL")),
      kw("CURSOR"),
      optional(kw("WITH HOLD")),
      choice(
        seq(kw("FOR"), choice($._static_sql, $._identifier)),
        seq(kw("FROM"), $._expression),
      ),
    ),
  open_sql: ($) =>
    seq(
      kw("OPEN"),
      $._identifier,
      optional(
        seq(
          kw("USING"),
          commaSep1(
            seq(
              $._expression,
              optional(choice(kw("IN"), kw("OUT"), kw("INOUT"))),
            ),
          ),
        ),
      ),
      optional(kw("WITH REOPTIMIZATION")),
    ),
  fetch_sql: ($) =>
    seq(
      kw("FETCH"),
      optional(
        choice(
          kw("NEXT"),
          kw("PREVIOUS"),
          kw("PRIOR"),
          kw("CURRENT"),
          kw("FIRST"),
          kw("LAST"),
          seq(kw("ABSOLUTE"), $._expression),
          seq(kw("RELATIVE"), $._expression),
        ),
      ),
      $._identifier,
      optional(seq(kw("INTO"), commaSep1($._variable))),
    ),
  close_sql: ($) => seq(kw("CLOSE"), $._identifier),
  foreach_sql: ($) =>
    seq(
      kw("FOREACH"),
      $._identifier,
      optional(
        seq(
          kw("USING"),
          commaSep1(
            seq(
              $._expression,
              optional(choice(kw("IN"), kw("OUT"), kw("INOUT"))),
            ),
          ),
        ),
      ),
      optional(seq(kw("INTO"), commaSep1($._variable))),
      optional(kw("WITH REOPTIMIZATION")),
      repeat(
        choice($.fgl_statement, $.sql_statement, $._foreach_sql_statement),
      ),
      kw("END FOREACH"),
    ),
  _foreach_sql_statement: ($) =>
    choice(kw("CONTINUE FOREACH"), kw("EXIT FOREACH")),
  put_sql: ($) =>
    seq(
      kw("PUT"),
      $._identifier,
      optional(seq(kw("FROM"), commaSep1($._expression))),
    ),
  flush_sql: ($) => seq(kw("FLUSH"), $._identifier),
};
const externals = ($) => [
  $.insert_sql,
  $.update_sql,
  $.select_sql,
  $.delete_sql,
  $.create_sql,
  $.alter_sql,
  $.drop_sql,
  $.error_sentinel, // 用于错误恢复的哨兵
];

export default rules;
export { rules, externals };
