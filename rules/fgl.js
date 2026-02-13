/// <reference types="tree-sitter-cli/dsl" />

import { kw } from "./util.js";
// @ts-check

import interface_statement from './interface.js'

export default {
    fgl_statement: ($) =>choice(

        $.defer_statement,
        $.expression_statement,
        $.operator_statement,
        $.flow_ctrl_statement,
        $.exceptions_statement,
        $.variable_statement,
        $.preprocessor_statement,
        $.interface_statement
    ),
    defer_statement: ($) => seq(kw("DEFER"), choice(kw("INTERRUPT"), kw("QUIT"))),
    expression_statement: ($) =>'__expression_statement__',
    operator_statement: ($) =>'operator_statement',
    flow_ctrl_statement: ($) => 'flow_ctrl_statement',
    exceptions_statement: ($) => 'exceptions_statement',
    // 操作变量
    variable_statement: ($) => 'variable_statement',
    preprocessor_statement: ($) => 'preprocessor_statement',
    ...interface_statement,

}