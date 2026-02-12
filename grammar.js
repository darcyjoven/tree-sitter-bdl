/**
 * @file Genero Business Development Language
 * @author darcy <darcy_joven@live.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
  name: "bdl",

  extras: ($) => [$.comment, /\s/],

  rules: {
    // TODO: add the actual grammar rules
    source_file: ($) =>
      seq(alias(kw("hello"), $.hello), field("hello_var", $.identifier)),

    //============================================================
    //
    //
    //============================================================
    // 以下是常用的定义，不在主结构中
    //
    // 注释
    comment: (_) =>
      token(
        choice(
          seq("--", /.*/), // -- 行注释
          seq("#", /.*/), // # 行注释
          seq("{", /[^}]*/, "}"), // { } 块注释
        ),
      ),
    // 标识符
    identifier: (_) => /[_\p{XID_Start}][_\p{XID_Continue}]*/u,
  },
});

/**
 * Creates a rule to match one or more of the rules separated by a comma
 * 用逗号将1个或者多个规则拼接
 *
 * @param {Rule} rule
 *
 * @returns {SeqRule}
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

/**
 * Creates a rule to optionally match one or more of the rules separated by a comma
 * 用逗号将0个或者多个规则拼接
 *
 * @param {Rule} rule
 *
 * @returns {ChoiceRule}
 */
function commaSep(rule) {
  return optional(commaSep1(rule));
}
/**
 * 将多词短语转为不区分大小写的 Tree-sitter 序列
 * @param {string} phrase - 例如 "end function"
 * @returns {Rule|RegExp} Tree-sitter 规则序列
 */
function kw(phrase) {
  // 1. 将单词按空格拆开
  const words = phrase.split(/\s+/);

  // 2. 将每个单词转为不区分大小写的正则规则
  const stickyRules = words.map((word) => {
    return new RegExp(
      word
        .split("")
        .map((char) => `[${char.toLowerCase()}${char.toUpperCase()}]`)
        .join(""),
    );
  });

  // 3. 使用 seq 将单词串联起来，中间插入至少一个空格的匹配
  // 如果只有一个单词，直接返回该正则；如果有多个，中间插入 /\s+/
  if (stickyRules.length === 1) return stickyRules[0];

  const result = [];
  for (let i = 0; i < stickyRules.length; i++) {
    result.push(stickyRules[i]);
    if (i < stickyRules.length - 1) {
      result.push(/\s+/); // 在单词之间插入空格规则
    }
  }

  return seq(...result);
}
