/// <reference types="tree-sitter-cli/dsl" />
// @ts-check
import { commaSep, commaSep1, kw } from "./util.js";

export default {
  _flow: (/** @type {any} */ $) =>
    choice(
      $.call,
      $.run,
      $.return,
      $.case,
      $.continue,
      $.exit,
      $.for,
      $.goto,
      $.if,
      $.label,
      $.while,
      $.sleep,
    ),
  call: (/** @type {any} */ $) =>
    seq(
      kw("CALL"),
      $._names,
      "(",
      optional($._params),
      ")",
      optional($.returning),
    ),
  returning: (/** @type {any} */ $) =>
    seq(kw("RETURNING"), commaSep1(field("returning", $.variable))),
  run: (/** @type {any} */ $) =>
    seq(
      kw("RUN"),
      field("content", $.expression),
      optional(seq(kw("IN"), choice(kw("FORM"), kw("LINE")), kw("MODE"))),
      optional(choice($.returning, seq(kw("WITHOUT WAITING")))),
    ),
  return: (/** @type {any} */ $) =>
    seq(kw("RETURN"), commaSep(field("return", $.expression))),
  case: (/** @type {any} */ $) =>
    seq(
      seq(kw("CASE"), optional(field("condition", $.expression))),
      repeat(choice($.when, $.otherwise)),
      kw("END CASE"),
    ),
  when: (/** @type {any} */ $) =>
    seq(
      seq(kw("WHEN"), field("condition", $.expression)),
      repeat($._statement),
    ),
  otherwise: (/** @type {any} */ $) =>
    seq(kw("OTHERWISE"), repeat($._statement)),
  continue: (/** @type {any} */ $) =>
    seq(
      kw("CONTINUE"),
      choice(
        kw("FOR"),
        kw("FOREACH"),
        kw("WHILE"),
        kw("MENU"),
        kw("CONSTRUCT"),
        kw("INPUT"),
        kw("DIALOG"),
        kw("DISPLAY"),
      ),
    ),
  exit: (/** @type {any} */ $) =>
    seq(
      kw("EXIT"),
      choice(
        kw("CASE"),
        kw("FOR"),
        kw("FOREACH"),
        kw("WHILE"),
        kw("MENU"),
        kw("CONSTRUCT"),
        kw("REPORT"),
        kw("DISPLAY"),
        seq(kw("PROGRAM"), optional(field("code", $.expression))),
        kw("INPUT"),
        kw("DIALOG"),
      ),
    ),
  for: (/** @type {any} */ $) =>
    seq(
      seq(
        kw("FOR"),
        $._names,
        "=",
        field("start", $.expression),
        kw("TO"),
        field("end", $.expression),
        optional(field("step", seq(kw("STEP"), $.expression))),
      ),
      repeat($._statement),
      kw("END FOR"),
    ),
  goto: (/** @type {any} */ $) => seq(kw("GOTO"), optional(":"), $._name),
  if: (/** @type {any} */ $) =>
    seq(
      seq(kw("IF"), field("condition", $.expression), kw("THEN")),
      repeat($._statement),
      optional($.else),
      kw("END IF"),
    ),
  else: (/** @type {any} */ $) => seq(kw("ELSE"), repeat($._statement)),
  label: (/** @type {any} */ $) => seq(kw("LABEL"), $._name, optional(":")),
  while: (/** @type {any} */ $) =>
    seq(
      seq(kw("WHILE"), field("condition", $.expression)),
      repeat($._statement),
      kw("END WHILE"),
    ),
  sleep: (/** @type {any} */ $) => seq(kw("SLEEP"), $._scale),
};
