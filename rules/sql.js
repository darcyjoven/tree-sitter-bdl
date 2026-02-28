/// <reference types="tree-sitter-cli/dsl" />
import { kw } from "./util.js";
// @ts-check

const rules = {
    // 定义 SQL 相关的规则
    sql_statement: ($) => choice(
        $.select_statement,
        $.insert_statement,
        $.update_statement,
        $.create_table_statement
        // ...
    ),

    insert_statement: ($) => seq(
        /[Ii][Ss][Ee][Ee][Cc][Tt]/, // 也可以在这里调用通用的 kw("SELECT")
        $.identifier
    ),

    // 更多 SQL 规则...
};
const externals = ($) => [
    $.select_statement,
    $.update_statement,
    $.create_table_statement,
    $.error_sentinel  // 用于错误恢复的哨兵
];

export default rules;
export { rules, externals }