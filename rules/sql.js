/// <reference types="tree-sitter-cli/dsl" />
import { kw } from "./util.js";
// @ts-check

const rules = {
  // 定义 SQL 相关的规则
  sql_statement: ($) =>
    choice(
      $.select_sql,
      $.insert_sql,
      $.update_sql,
      $.create_table_sql,
      // ...
    ),

  insert_sql: ($) =>
    seq(
      /[Ii][Ss][Ee][Ee][Cc][Tt]/, // 也可以在这里调用通用的 kw("SELECT")
      $.identifier,
    ),

  // 更多 SQL 规则...
};
const externals = ($) => [
  $.select_sql,
  $.update_sql,
  $.create_table_sql,
  $.error_sentinel, // 用于错误恢复的哨兵
];

export default rules;
export { rules, externals };
