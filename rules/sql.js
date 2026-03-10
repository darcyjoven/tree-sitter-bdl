/// <reference types="tree-sitter-cli/dsl" />
import { commaSep1, kw } from "./util.js";
// @ts-check

const rules = {
  // 定义 SQL 相关的规则
  _sql_statement_content: ($) =>
    choice($._static_sql, $._dynamic_sql, $._io_sql, $._transactions_sql),
  _sql_statement: ($) => seq($._sql_statement_content, optional(";")),
  // 静态SQL
  select_sql: ($) => seq(kw("SELECT"), $._sql_body),
  insert_sql: ($) => seq(kw("INSERT"), $._sql_body),
  delete_sql: ($) => seq(kw("DELETE"), $._sql_body),
  update_sql: ($) => seq(kw("UPDATE"), $._sql_body),
  create_sql: ($) => seq(kw("CREATE"), $._sql_body),
  alter_sql: ($) => seq(kw("ALTER"), $._sql_body),
  drop_sql: ($) => seq(kw("DROP"), $._sql_body),
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
  block_sql: ($) => seq(kw("SQL"), $._static_sql, kw("END"), kw("SQL")),
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
    seq(kw("PREPARE"), $._identifier, kw("FROM"), $._expression),
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
      seq(kw("EXECUTE"), kw("IMMEDIATE"), $._expression),
    ),
  // 当作fgl处理
  // free_sql: ($) => seq(kw("FREE"), $._identifier),
  declare_sql: ($) =>
    seq(
      kw("DECLARE"),
      alias($._identifier, "cursor_name"),
      optional(kw("SCROLL")),
      kw("CURSOR"),
      optional(seq(kw("WITH"), kw("HOLD"))),
      choice(
        seq(
          kw("FOR"),
          alias(
            choice($.select_sql, $.insert_sql, prec(2, $._identifier)),
            "sql",
          ),
        ),
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
        choice($._fgl_statement, $._sql_statement, $._foreach__sql_statement),
      ),
      kw("END FOREACH"),
    ),
  _foreach__sql_statement: ($) =>
    choice(kw("CONTINUE FOREACH"), kw("EXIT FOREACH")),
  put_sql: ($) =>
    seq(
      kw("PUT"),
      $._identifier,
      optional(seq(kw("FROM"), commaSep1($._expression))),
    ),
  flush_sql: ($) => seq(kw("FLUSH"), $._identifier),
  // TODO
  _io_sql: ($) => choice($.unload_sql, $.load_sql),
  load_sql: ($) =>
    seq(
      kw("LOAD"),
      kw("FROM"),
      choice($._string_literal, $._variable),
      optional(seq(kw("DELIMITER"), $._string_literal)),
      choice($.insert_sql, $._string_literal, $._variable),
    ),
  unload_sql: ($) =>
    seq(
      kw("UNLOAD"),
      kw("TO"),
      choice($._string_literal, $._variable),
      optional(seq(kw("DELIMITER"), $._string_literal)),
      choice($.select_sql, $._string_literal, $._variable),
    ),
  _transactions_sql: ($) =>
    choice(
      $.begin_work,
      $.savepoint,
      $.commit_work,
      $.rollback_work,
      $.release_savepoint,
      $.set_isolation,
      $.set_lock_mode,
    ),
  begin_work: ($) => kw("BEGIN WORK"),
  savepoint: ($) => seq(kw("SAVEPOINT"), $._identifier, optional(kw("UNIQUE"))),
  commit_work: ($) => kw("COMMIT WORK"),
  rollback_work: ($) =>
    seq(
      kw("ROLLBACK WORK"),
      optional(seq(kw("TO SAVEPOINT"), optional($._identifier))),
    ),
  release_savepoint: ($) =>
    prec(1, seq(kw("RELEASE SAVEPOINT"), $._identifier)),
  set_isolation: ($) =>
    seq(
      kw("SET"),
      kw("ISOLATION"),
      kw("TO"),
      choice(
        kw("DIRTY READ"),
        seq(
          kw("COMMITTED READ"),
          optional(kw("LAST COMMITTED")),
          optional(kw("RETAIN UPDATE LOCKS")),
        ),
        kw("CURSOR STABILITY"),
        kw("REPEATABLE READ"),
      ),
    ),
  set_lock_mode: ($) =>
    seq(
      kw("SET"),
      kw("LOCK"),
      kw("MODE"),
      kw("TO"),
      choice(kw("NOT WAIT"), seq(kw("WAIT"), $._expression)),
    ),
};
const externals = ($) => [
  $._sql_body,
  $.error_sentinel, // 用于错误恢复的哨兵
];

export default rules;
export { rules, externals };
