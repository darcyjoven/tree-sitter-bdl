/**
 * @file Genero Business Development Language
 * @author darcy <darcy_joven@live.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

import { rules as sqlRules, externals as sqlExternals } from "./rules/sql.js";
import fglRules from "./rules/fgl.js";
import interfaceRules from "./rules/interface.js";
import commonRules from "./rules/common.js";
import typeRules from "./rules/types.js";
import programRules from "./rules/program.js";

export default grammar({
  name: "bdl",

  extras: ($) => [$.comment, /\s/, /[\u3000]/],

  externals: ($) => [...sqlExternals($)],

  inline: ($) => [$._constant_statement, $.scope],

  conflicts: ($) => [
    // [$.case_flow, $._expression]
    [$._fgl_statement, $._interface_block],
    [$.input_array_inline, $.input_array_block],
  ],

  rules: {
    ...programRules,
    ...commonRules,
    ...typeRules,
    ...fglRules,
    ...sqlRules,
    ...interfaceRules,
  },
});
