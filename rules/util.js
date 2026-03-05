/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const digit = /[0-9]/;

const integerLiterals = choice(
  seq(optional(choice("+", "-")), repeat1(digit)),
  kw("TRUE"),
  kw("FALSE"),
);
const decimalLiterals = seq(
  optional(choice("+", "-")),
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

const multiplicativeOperators = ["**", kw("MOD"), "*", "/"];
const additiveOperators = ["+", "-"];
const comparativeOperators = ["==", "=", "!=", "<>", "<", "<=", ">", ">="];
const nullOperators = [
  seq(kw("IS"), kw("NULL")),
  seq(kw("IS"), kw("NOT"), kw("NULL")),
];
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
 * @returns {Rule} Tree-sitter 规则序列
 */
function kw(phrase) {
  const words = phrase.split(/\s+/);
  const _alias = phrase.replaceAll(" ", "_");

  // 统一生成不区分大小写的 token
  const makeToken = (/** @type {string} */ word) =>
    token(
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

  // 如果是多词短语如 "HELP FILE"，由 seq 拼接
  if (words.length > 1) {
    return alias(prec(10, seq(...words.map((w) => makeToken(w)))), _alias);
  }
  return alias(token(prec(10, makeToken(words[0]))), _alias);
}

export {
  digit,
  integerLiterals,
  decimalLiterals,
  datetimeQualifier,
  commaSep,
  commaSep1,
  kw,
  PREC,
  multiplicativeOperators,
  additiveOperators,
  comparativeOperators,
  nullOperators,
};
