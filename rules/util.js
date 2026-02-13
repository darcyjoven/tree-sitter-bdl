
const digit = /[0-9]/;

const integerLiterals = seq(optional(choice("+", "-")), repeat1(digit));
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

    // 统一生成不区分大小写的 token
    const makeToken = (/** @type {string} */ word) => token(prec(10, new RegExp(
        word.split('').map(c => `[${c.toLowerCase()}${c.toUpperCase()}]`).join('')
    )));

    // 如果是多词短语如 "HELP FILE"，由 seq 拼接
    if (words.length > 1) {
        return seq(...words.map(w => makeToken(w)));
    }
    return makeToken(words[0]);
}


export { digit, integerLiterals, decimalLiterals, datetimeQualifier, commaSep, commaSep1, kw }