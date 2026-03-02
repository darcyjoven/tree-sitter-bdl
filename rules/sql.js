/// <reference types="tree-sitter-cli/dsl" />
import { kw } from "./util.js";
// @ts-check

const rules = {
  // 定义 SQL 相关的规则
  sql_statement: ($) => choice($._static_sql),
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
    ),
  block_sql: ($) => seq(kw("SQL"), $._static_sql, kw("END SQL")),
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
