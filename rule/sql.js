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
      $.truncate,
      $.unlock,
      $.block,
      $.rename,
      $.prepare,
      $.execute,
      $.declare,
      $.open,
      $.fetch,
      $.close,
      $.foreach,
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
      $.lock,
    ),
  schema: (/** @type {any} */ $) =>
    choice(
      seq(
        kw("CONNECT TO"),
        $._dbname,
        optional(seq(kw("AS"), field("name", choice($.identifier, $.string)))),
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
          // 数据库名可为标识符/字符串/变量(实码含 DATABASE a[i].col 形式)
          field("dbname", choice($.identifier, $.object, $.slice, $.string)),
          optional(seq("@", field("dbserver", choice($.variable, $.string)))),
        ),
        optional(kw("EXCLUSIVE")),
      ),
      seq(kw("SCHEMA"), $._dbname),
      seq(kw("DISCONNECT"), $._dbname),
      // DORMANT 可选(实码 SET CONNECTION "MAIN" 无 DORMANT)
      seq(kw("SET CONNECTION"), $._dbname, optional(kw("DORMANT"))),
    ),
  select: (/** @type {any} */ $) => seq(kw("SELECT"), $.sql_body),
  // LOCK TABLE t IN {SHARE|EXCLUSIVE} MODE
  // 仅关心语句边界, 细节交由 sql_body 外部扫描器(同 CREATE TABLE 的处理)
  lock: (/** @type {any} */ $) => seq(kw("LOCK TABLE"), $.sql_body),
  insert: (/** @type {any} */ $) => seq(kw("INSERT"), $.sql_body),
  delete: (/** @type {any} */ $) => seq(kw("DELETE"), $.sql_body),
  update: (/** @type {any} */ $) => seq(kw("UPDATE"), $.sql_body),
  create: (/** @type {any} */ $) => seq(kw("CREATE"), $.sql_body),
  alter: (/** @type {any} */ $) => seq(kw("ALTER"), $.sql_body),
  drop: (/** @type {any} */ $) => seq(kw("DROP"), $.sql_body),
  // TRUNCATE TABLE t / TRUNCATE t: 同 DROP 只关心边界
  truncate: (/** @type {any} */ $) => seq(kw("TRUNCATE"), $.sql_body),
  _static_sql: (/** @type {any} */ $) =>
    choice(
      $.select,
      $.insert,
      $.delete,
      $.update,
      $.create,
      $.alter,
      $.drop,
      $.truncate,
    ),
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
        optional(
          choice(
            seq($._into, $._using),
            seq($._using, $._into),
            $._into,
            $._using,
          ),
        ),
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
        // 括号子查询: DECLARE c CURSOR FOR (SELECT ...)
        seq(kw("FOR"), "(", choice($.select_in_paren, $._cid), ")"),
        // 静态 SQL 两种写法皆可(FOR / FROM); 动态 SQL 串只能用 FROM
        seq(kw("FROM"), choice($._static_sql, $._sqlstring)),
      ),
    ),
  // 括号内子查询体(使用 SQL_BODY_IN_PAREN 外部符号, 遇匹配的右括号结束)
  select_in_paren: (/** @type {any} */ $) =>
    seq(kw("SELECT"), $.sql_body_in_paren),
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
          seq(kw("ABSOLUTE"), $._offset),
          seq(kw("RELATIVE"), $._offset),
        ),
      ),
      $._cid,
      optional($._into),
    ),
  close: (/** @type {any} */ $) => seq(kw("CLOSE"), $._cid),
  foreach: (/** @type {any} */ $) =>
    seq(
      seq(
        kw("FOREACH"),
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
      // FROM 列表可含字面值(实码 PUT ... FROM ...,'N','N',...)
      optional(
        seq(kw("FROM"), commaSep1(field("params", choice($.variable, $.literal)))),
      ),
    ),
  flush: (/** @type {any} */ $) => seq(kw("FLUSH"), $._cid),
  load: (/** @type {any} */ $) =>
    seq(
      kw("LOAD FROM"),
      field("filename", choice($.variable, $.string)),
      optional(
        seq(kw("DELIMITER"), field("delimiter", choice($.variable, $.string))),
      ),
      choice($.insert, $.select, $._sqlstring),
    ),
  unload: (/** @type {any} */ $) =>
    seq(
      kw("UNLOAD TO"),
      field("filename", choice($.variable, $.string)),
      optional(
        seq(kw("DELIMITER"), field("delimiter", choice($.variable, $.string))),
      ),
      choice($.insert, $.select, $._sqlstring),
    ),
  begin: (/** @type {any} */ $) => kw("BEGIN WORK"),
  savepoint: (/** @type {any} */ $) =>
    seq(kw("SAVEPOINT"), $._name, optional(kw("UNIQUE"))),
  commit: (/** @type {any} */ $) => kw("COMMIT WORK"),
  rollback: (/** @type {any} */ $) =>
    seq(
      kw("ROLLBACK WORK"),
      optional(choice(kw("TO SAVEPOINT"), seq(kw("TO SAVEPOINT"), $._name))),
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
        // 秒数可省略: SET LOCK MODE TO WAIT 与 SET LOCK MODE TO WAIT 5 均合法
        choice(kw("NOT WAIT"), seq(kw("WAIT"), optional($._wait_seconds))),
      ),
      // SET EXPLAIN ON|OFF（GG-25）
      seq(kw("SET EXPLAIN"), choice(kw("ON"), kw("OFF"))),
    ),
  // 基础
  _into: (/** @type {any} */ $) =>
    seq(
      kw("INTO"),
      commaSep1(
        choice(
          // 字段范围: INTO rec.first THRU rec.last (等价于枚举中间全部字段)
          seq(
            field("value", $.variable),
            choice(kw("THRU"), kw("THROUGH")),
            field("to", $.variable),
          ),
          field("value", $.variable),
        ),
      ),
    ),
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

  // SQL 命名助手(自 type.js 归位): 数据库/表/列/游标/SQL 文本
  _dbname: (/** @type {any} */ $) =>
    field("dbname", choice($.identifier, $.string)),
  _table: (/** @type {any} */ $) => field("table", $.identifier),
  _column: (/** @type {any} */ $) => field("column", $.identifier),
  _sqlstring: (/** @type {any} */ $) => field("sql", $.expression),
  _cid: (/** @type {any} */ $) => field("cursor", $.identifier),

  // 数值操作数(变量或数字)的语义化子规则
  // 偏移: FETCH ABSOLUTE/RELATIVE n
  _offset: (/** @type {any} */ $) => field("offset", choice($.variable, $.number)),
  // 等待秒数: SET LOCK MODE TO WAIT n
  _wait_seconds: (/** @type {any} */ $) =>
    field("seconds", choice($.variable, $.number)),
};
const externals = (/** @type {any} */ $) => [
  $.sql_body,
  $.sql_body_in_paren,
  $.error_sentinel,
];

export default rules;
export { rules, externals };
