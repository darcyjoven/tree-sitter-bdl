/**
 * @file Genero Business Development Language
 * @author darcy <darcy_joven@live.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

import { rules as sqlRules, externals as sqlExternals } from "./rule/sql.js";
import { kw } from "./rule/util.js";
import fglBlock from "./rule/fgl.js";
import flowBlock from "./rule/flow.js";
import interfaceBlock from "./rule/interface.js";
import typeBlock from "./rule/type.js";
import reportBlock from "./rule/report.js";

export default grammar({
  name: "bdl",
  // 空白符和注释
  extras: ($) => [
    $.comment,
    $.preproc_directive,
    // 语句可选的结束分号(实码普遍使用), 对语法透明
    ";",
    /\s/,
    /[\u3000]/,
  ],

  externals: ($) => [...sqlExternals($)],


  conflicts: ($) => [
    [$.return],
    [$.display],
    [$.input],
    [$.construct],
    [$.prompt],
    [$.exit],
    [$.start_report],
    [$._report_special_expression, $.report_where],
    [$.report_start_option],
    [$.report_print, $.report_print_empty],
    [$.expression, $._report_column_pos],
    [$.start_report, $.expression],
    // 报表聚合名(COUNT/PERCENT)现在以 identifier 承接, 与函数调用起点重叠
    [$.variable, $.report_aggregate],
  ],

  rules: {
    source_file: ($) =>
      seq(
        // 顶层声明/指令不限制先后顺序: 实码常见 GLOBALS "<file>"
        // 与 DATABASE/SCHEMA 交错出现
        repeat(
          choice(
            $.options,
            $.import,
            $.schema,
            $.preproc,
            $.globals,
            $.constant,
            $.type,
            $.define,
          ),
        ),
        repeat(choice($.main, $.function, $.report)),
      ),
    main: ($) =>
      seq(
        kw("MAIN"),
        seq(repeat(choice($.constant, $.type, $.define)), repeat($._statement)),
        seq(kw("END"), kw("MAIN")),
      ),
    function: ($) =>
      seq(
        optional($.scope),
        kw("FUNCTION"),
        field("name", $.identifier),
        "(",
        optional($._param),
        ")",
        seq(repeat(choice($.constant, $.type, $.define)), repeat($._statement)),
        seq(kw("END"), kw("FUNCTION")),
      ),
    // 可以出现在任何位置的语句(含报表专用语句)
    _statement: ($) => choice($._fgl, $._interface, $._sql, $._report),
    ...sqlRules,
    ...fglBlock,
    ...flowBlock,
    ...interfaceBlock,
    ...typeBlock,
    ...reportBlock,
  },
});
