/// <reference types="tree-sitter-cli/dsl" />
// @ts-check
import { commaSep1, kw } from "./util.js";

const rules = {
  _sql: (/** @type {any} */ $) =>
    choice(
      $.schema,
      $.select,
      $.insert,
      $.delete,
      $.update,
      $.create,
      $.alter,
      $.drop,
      $.unlock,
      $.block,
      $.rename,
      $.prepare,
      $.execute,
      $.declare,
      $.open,
      $.fetch,
      $.close,
      $.put,
      $.flush,
      $.load,
      $.unload,
      $.begin,
      $.savepoint,
      $.commit,
      $.rollback,
      $.release,
      $.set,
    ),
  schema: (/** @type {any} */ $) =>
    choice(
      seq(
        kw("CONNECT TO"),
        $._dbname,
        optional(seq(kw("AS"), $._name)),
        optional(
          seq(
            kw("USER"),
            field("name", choice($.identifier, $.string)),
            kw("USING"),
            field("password", choice($.identifier, $.string)),
          ),
        ),
        optional(kw("WITH CONCURRENT TRANSACTION")),
      ),
      seq(
        optional(kw("DESCRIBE")),
        kw("DATABASE"),
        seq(
          $._dbname,
          optional(seq("@", field("dbserver", choice($.variable, $.string)))),
        ),
        optional(kw("EXCLUSIVE")),
      ),
      seq(kw("SCHEMA"), $._dbname),
      seq(kw("DISCONNECT"), $._dbname),
      seq(kw("SET CONNECTION"), seq($._dbname, kw("DORMANT"))),
    ),
  select: (/** @type {any} */ $) => seq(kw("SELECT"), $._sql_body),
  insert: (/** @type {any} */ $) => seq(kw("INSERT"), $._sql_body),
  delete: (/** @type {any} */ $) => seq(kw("DELETE"), $._sql_body),
  update: (/** @type {any} */ $) => seq(kw("UPDATE"), $._sql_body),
  create: (/** @type {any} */ $) => seq(kw("CREATE"), $._sql_body),
  alter: (/** @type {any} */ $) => seq(kw("ALTER"), $._sql_body),
  drop: (/** @type {any} */ $) => seq(kw("DROP"), $._sql_body),
  _static_sql: (/** @type {any} */ $) =>
    choice($.select, $.insert, $.delete, $.update, $.create, $.alter, $.drop),
  unlock: (/** @type {any} */ $) => seq(kw("UNLOCK TABLE"), $._table),
  block: (/** @type {any} */ $) => seq(kw("SQL"), $._static_sql, kw("END SQL")),
  rename: (/** @type {any} */ $) =>
    seq(
      kw("RENAME"),
      choice(kw("TABLE"), kw("COLUMN"), kw("INDEX"), kw("SEQUENCE")),
      field("object", $.identifier),
      kw("TO"),
      $._name,
    ),
  prepare: (/** @type {any} */ $) =>
    seq(kw("PREPARE"), $._cid, kw("FROM"), $._sqlstring),
  execute: (/** @type {any} */ $) =>
    choice(
      seq(
        kw("EXECUTE"),
        $._cid,
        choice(seq($._into, $._using), seq($._using, $._into)),
      ),
      seq(kw("EXECUTE IMMEDIATE"), $._sqlstring),
    ),
  declare: (/** @type {any} */ $) =>
    seq(
      kw("DECLARE"),
      $._cid,
      optional(kw("SCROLL")),
      kw("CURSOR"),
      optional(kw("WITH HOLD")),
      choice(
        seq(kw("FOR"), choice($._static_sql, $._cid)),
        seq(kw("FROM"), $._sqlstring),
      ),
    ),
  open: (/** @type {any} */ $) => seq(kw("OPEN"), $._cid, optional($._using)),
  fetch: (/** @type {any} */ $) =>
    seq(
      kw("FETCH"),
      optional(
        choice(
          kw("NEXT"),
          kw("PREVIOUS"),
          kw("PRIOR"),
          kw("CURRENT"),
          kw("FIRST"),
          kw("LAST"),
          seq(kw("ABSOLUTE"), $._scale),
          seq(kw("RELATIVE"), $._scale),
        ),
      ),
      $._cid,
      optional($._into),
    ),
  close: (/** @type {any} */ $) => seq(kw("CLOSE"), $._cid),
  foreach: (/** @type {any} */ $) =>
    seq(
      seq(
        kw("FOREEACH"),
        $._cid,
        optional($._using),
        optional($._into),
        optional(kw("WITH REOPTIMIZATION")),
      ),
      repeat($._statement),
      kw("END FOREACH"),
    ),
  put: (/** @type {any} */ $) =>
    seq(
      kw("PUT"),
      $._cid,
      seq(kw("FROM"), commaSep1(field("params", $.variable))),
    ),
  flush: (/** @type {any} */ $) => seq(kw("FLUSH"), $._cid),
  load: (/** @type {any} */ $) =>
    seq(
      kw("LOAD FROM"),
      field("filename", choice($.variable, $.string)),
      optional(
        seq(kw("DELIMITER"), field("delimiter", choice($.variable, $.string))),
      ),
      choice($.insert, $._sqlstring),
    ),
  unload: (/** @type {any} */ $) =>
    seq(
      kw("UNLOAD TO"),
      field("filename", choice($.variable, $.string)),
      optional(
        seq(kw("DELIMITER"), field("delimiter", choice($.variable, $.string))),
      ),
      choice($.insert, $._sqlstring),
    ),
  begin: (/** @type {any} */ $) => kw("BEGIN WORK"),
  savepoint: (/** @type {any} */ $) =>
    seq(kw("SAVEPOINT"), $._name, optional(kw("UNQIE"))),
  commit: (/** @type {any} */ $) => kw("COMMIT WORK"),
  rollback: (/** @type {any} */ $) =>
    seq(
      kw("ROLLBACK WORK"),
      choice(kw("TO SAVEPOINT"), seq(kw("TO SAVEPOINT"), $._name)),
    ),
  release: (/** @type {any} */ $) => seq(kw("RELEASE SAVEPOINT"), $._name),
  set: (/** @type {any} */ $) =>
    choice(
      seq(
        kw("SET ISOLATION TO"),
        choice(
          kw("DIRTY READ"),
          seq(
            kw("COMMITTED READ"),
            optional(kw("LAST COMMITTED")),
            optional(kw("RETAIN UPDATE LOCKS")),
          ),
          kw("CURSOR STABILITY"),
          kw("REPEATABLE READ"),
        ),
      ),
      seq(
        kw("SET LOCK MODE TO"),
        choice(kw("NOT WAIT"), seq(kw("WAIT"), $._scale)),
      ),
    ),
  // 基础
  _into: (/** @type {any} */ $) =>
    seq(kw("INTO"), commaSep1(field("value", $.variable))),
  _using: (/** @type {any} */ $) =>
    seq(
      kw("USING"),
      commaSep1(
        field(
          "params",
          seq($.expression, optional(choice(kw("IN"), kw("OUT"), kw("INOUT")))),
        ),
      ),
    ),
};
const externals = (/** @type {any} */ $) => [$._sql_body, $.error_sentinel];

export default rules;
export { rules, externals };
