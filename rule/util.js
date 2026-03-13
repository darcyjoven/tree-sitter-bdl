/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const digit = /[0-9]/;

const integerLiterals = seq(optional("+"), repeat1(digit));
const decimalLiterals = seq(
  optional("+"),
  repeat(digit),
  ".",
  repeat1(digit),
  optional(seq(choice("e", "E"), choice("-", "+"), repeat1(digit))),
);
const datetimeQualifier = choice(
  kw("YEAR"),
  kw("MONTH"),
  kw("DAY"),
  kw("HOUR"),
  kw("MINUTE"),
  kw("SECOND"),
  seq(kw("FRACTION"), optional(seq("(", /[1-5]/, ")"))),
);

const PREC = {
  call: 13,
  primary: 12,
  unary: 11,
  multiplicative: 10,
  additive: 9,
  concatenation: 8,
  stringcomparison: 7,
  comparative: 6,
  null: 5,
  not: 4,
  and: 3,
  or: 2,
  ascii: 1,
  composite: -1,
};

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
 * Creates a rule to match one or more of the rules separated by a comma
 * 用逗号将1个或者多个规则拼接
 *
 * @param {Rule} rule
 *
 * @returns {SeqRule}
 */
function dotSep1(rule) {
  return seq(rule, repeat(seq(".", rule)));
}

function makeToken(/** @type {string} */ word) {
  return token(
    prec(
      10,
      new RegExp(
        word
          .split("")
          .map((c) => `[${c.toLowerCase()}${c.toUpperCase()}]`)
          .join(""),
      ),
    ),
  );
}

/**
 * 将短语转为不区分大小写的 Tree-sitter 序列 (递归优化版)
 * @param {string} phrase - 例如 "end if" 或 "help file"
 * @returns {Rule}
 */
function kw(phrase) {
  // 1. 统一转为大写并去除首尾空格
  const p = phrase.toUpperCase().trim();
  const words = p.split(/\s+/);

  // 2. 递归处理：如果是多词短语
  if (words.length > 1) {
    const _alias = p.replace(/\s+/g, "_"); // "END IF" -> "END_IF"
    return alias(
      prec(10, seq(...words.map((w) => kw(w)))), // 递归调用 kw 处理每一个单词
      _alias,
    );
  }

  // 3. 基准情况：处理单个单词
  // 使用 alias 将节点在 AST 中显示为大写单词本身
  return alias(token(prec(10, makeToken(p))), p);
}

export {
  digit,
  integerLiterals,
  decimalLiterals,
  datetimeQualifier,
  commaSep,
  commaSep1,
  dotSep1,
  kw,
  PREC,
};
