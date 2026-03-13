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

export default grammar({
  name: "bdl",
  // 空白符和注释
  extras: ($) => [$.comment, /\s/, /[\u3000]/],

  externals: ($) => [...sqlExternals($)],

  // inline: ($) => [$._constant_statement, $.scope],

  conflicts: ($) => [
    [$._menu_head],
    [$.return],
    [$.display],
    [$.input],
    [$.construct],
    [$.menu],
    [$.prompt],
    [$.exit],
    [$.start],
  ],

  rules: {
    source_file: ($) =>
      seq(
        repeat(choice($.options, $.import, $.schema, $.preproc)),
        repeat(choice($.globals, $.constant, $.type, $.define)),
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
    report: ($) =>
      seq(
        optional($.scope),
        kw("REPORT"),
        field("name", $.identifier),
        "(",
        optional($._param),
        ")",
        seq(repeat(choice($.constant, $.type, $.define)), repeat($._statement)),
        seq(kw("END"), kw("REPORT")),
      ),
    // 可以出现在任何位置的语句
    _statement: ($) => choice($._fgl, $._interface, $._sql),
    ...sqlRules,
    ...fglBlock,
    ...flowBlock,
    ...interfaceBlock,
    ...typeBlock,
  },
});
