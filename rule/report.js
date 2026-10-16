/// <reference types="tree-sitter-cli/dsl" />
// @ts-check
import { commaSep, commaSep1, kw, PREC } from "./util.js";

/**
 * REPORT 定义体与报表专用语句/表达式
 *
 * 结构(手册 p274-294,固定子句顺序):
 *   [PUBLIC|PRIVATE] REPORT name (args)
 *   [ DEFINE 段 ]
 *   [ OUTPUT 段 ]
 *   [ ORDER BY 段 ]
 *   FORMAT 段(必需, EVERY ROW 或 控制块序列)
 *   END REPORT
 *
 * 控制块: FIRST PAGE HEADER / PAGE HEADER / PAGE TRAILER /
 *         ON EVERY ROW / ON LAST ROW / BEFORE GROUP OF var / AFTER GROUP OF var
 * 报表专用语句(仅出现在控制块内): PRINT / PRINTX / SKIP / NEED / PAUSE
 * 报表专用表达式操作符: PAGENO / LINENO / SPACES(SPACE 别名) /
 *         WORDWRAP [RIGHT MARGIN] / 聚合 COUNT|PERCENT|SUM|AVG|MIN|MAX [GROUP] [WHERE]
 */
export default {
  // ---- REPORT 定义块 ----
  report: (/** @type {any} */ $) =>
    seq(
      optional($.scope),
      kw("REPORT"),
      field("name", $.identifier),
      "(",
      optional($._param),
      ")",
      repeat(choice($.constant, $.type, $.define)),
      optional($.report_output_section),
      optional($.report_order_section),
      $.report_format_section,
      kw("END"),
      kw("REPORT"),
    ),

  // OUTPUT 段: OUTPUT [REPORT TO dest] [WITH? dimension...]
  report_output_section: (/** @type {any} */ $) =>
    seq(
      kw("OUTPUT"),
      optional(
        seq(kw("REPORT"), kw("TO"), field("destination", $.report_destination)),
      ),
      optional(kw("WITH")),
      repeat($.report_dimension),
    ),

  report_destination: (/** @type {any} */ $) =>
    choice(
      kw("SCREEN"),
      kw("PRINTER"),
      seq(optional(kw("FILE")), field("filename", $.expression)),
      seq(
        kw("PIPE"),
        optional(choice(kw("IN FORM MODE"), kw("IN LINE MODE"))),
        field("program", $.expression),
      ),
    ),

  // 边距/页尺寸(值用表达式,兼容变量与字面量;实码常换行书写,故不用逗号分隔)
  report_dimension: (/** @type {any} */ $) =>
    choice(
      seq(kw("LEFT MARGIN"), field("value", $.expression)),
      seq(kw("RIGHT MARGIN"), field("value", $.expression)),
      seq(kw("TOP MARGIN"), field("value", $.expression)),
      seq(kw("BOTTOM MARGIN"), field("value", $.expression)),
      seq(kw("PAGE LENGTH"), field("value", $.expression)),
      seq(kw("TOP OF PAGE"), field("value", $.expression)),
    ),

  // ORDER [EXTERNAL] BY var [ASC|DESC][,...]
  report_order_section: (/** @type {any} */ $) =>
    seq(
      kw("ORDER"),
      optional(kw("EXTERNAL")),
      kw("BY"),
      commaSep1($.report_sort_key),
    ),

  report_sort_key: (/** @type {any} */ $) =>
    seq(
      field("variable", $.variable),
      optional(choice(kw("ASC"), kw("DESC"))),
    ),

  // FORMAT EVERY ROW | FORMAT + 控制块序列
  report_format_section: (/** @type {any} */ $) =>
    seq(
      kw("FORMAT"),
      choice(kw("EVERY ROW"), repeat1($.report_control_block)),
    ),

  report_control_block: (/** @type {any} */ $) =>
    seq(
      choice(
        kw("FIRST PAGE HEADER"),
        kw("PAGE HEADER"),
        kw("PAGE TRAILER"),
        kw("ON EVERY ROW"),
        kw("ON LAST ROW"),
        seq(kw("BEFORE GROUP OF"), field("group", $.variable)),
        seq(kw("AFTER GROUP OF"), field("group", $.variable)),
      ),
      repeat($._statement),
    ),

  // ---- 报表专用语句(加入全局 _statement) ----
  _report: (/** @type {any} */ $) =>
    choice(
      $.report_print,
      $.report_print_empty,
      $.report_printx,
      $.report_skip,
      $.report_need,
      $.report_pause,
    ),

  // ---- 报表驱动语句(自 fgl.js 归位) ----
  terminate_report: (/** @type {any} */ $) =>
    seq(kw("TERMINATE REPORT"), field("report", $.identifier)),
  finish_report: (/** @type {any} */ $) =>
    seq(kw("FINISH REPORT"), field("report", $.identifier)),
  output_to_report: (/** @type {any} */ $) =>
    seq(
      kw("OUTPUT TO REPORT"),
      field("report", $.identifier),
      "(",
      optional($._params),
      ")",
    ),
  start_report: (/** @type {any} */ $) =>
    seq(
      kw("START REPORT"),
      field("report", $.identifier),
      optional(
        seq(
          kw("TO"),
          field(
            "destination",
            choice(
              $.variable,
              kw("SCREEN"),
              kw("PRINTER"),
              seq(optional(kw("FILE")), field("filename", $.expression)),
              seq(
                kw("PIPE"),
                optional(choice(kw("IN FORM MODE"), kw("IN LINE MODE"))),
                field("program", $.expression),
              ),
              seq(kw("XML HANDLER"), field("handler", $.expression)),
              seq(kw("OUTPUT"), field("output", $.expression)),
            ),
          ),
        ),
      ),
      optional(seq(kw("WITH"), commaSep1($.report_start_option))),
    ),
  report_start_option: (/** @type {any} */ $) =>
    choice(
      seq(kw("LEFT MARGIN"), optional("="), field("value", $.expression)),
      seq(kw("RIGHT MARGIN"), optional("="), field("value", $.expression)),
      seq(kw("TOP MARGIN"), optional("="), field("value", $.expression)),
      seq(kw("BOTTOM MARGIN"), optional("="), field("value", $.expression)),
      seq(kw("PAGE LENGTH"), optional("="), field("value", $.expression)),
      seq(kw("TOP OF PAGE"), optional(field("value", $.expression))),
    ),

  report_print: (/** @type {any} */ $) =>
    seq(
      kw("PRINT"),
      commaSep1($.report_print_item),
      optional(";"),
    ),

  // 空 PRINT 语句(实码常见,用于打印空行)
  report_print_empty: (/** @type {any} */ $) =>
    seq(kw("PRINT"), optional(";")),

  // 报表打印项: 可带 COLUMN 列定位前缀(实码常见 PRINT COLUMN n, expr)
  // 列定位值与其后打印值之间以逗号固定分隔,消除与 expression 的歧义
  report_print_item: (/** @type {any} */ $) =>
    choice(
      seq(kw("COLUMN"), $._report_column_pos, ",", choice($.expression, $.report_print_file)),
      $.expression,
      $.report_print_file,
    ),

  // COLUMN 列定位值: 字面量或变量(实码均为简单定位值)
  _report_column_pos: (/** @type {any} */ $) =>
    choice($.literal, $.variable),

  // PRINT FILE "name" —— 读取文本文件并入报表
  report_print_file: (/** @type {any} */ $) =>
    seq(kw("FILE"), $.string),

  // PRINTX [NAME = id] expr[, expr ...] | PRINTX rec.*
  report_printx: (/** @type {any} */ $) =>
    seq(
      kw("PRINTX"),
      optional(seq(kw("NAME"), "=", field("name", $.identifier))),
      commaSep1(choice($.expression, seq($.identifier, ".*"))),
    ),

  report_skip: (/** @type {any} */ $) =>
    seq(
      kw("SKIP"),
      choice(
        seq($._line_count, choice(kw("LINE"), kw("LINES"))),
        seq(kw("TO"), kw("TOP OF PAGE")),
      ),
    ),

  report_need: (/** @type {any} */ $) =>
    seq(kw("NEED"), $._line_count, choice(kw("LINE"), kw("LINES"))),

  report_pause: (/** @type {any} */ $) =>
    seq(kw("PAUSE"), optional($.string)),

  // ---- 报表专用表达式操作符(自 fgl.js 归位) ----
  // ASCII(n) / n SPACES(SPACE 为 SPACES 别名): 报表空格操作符
  _report_special_expression: (/** @type {any} */ $) =>
    choice(
      seq(kw("ASCII"), $._ascii_arg),
      seq(field("left", $.expression), choice(kw("SPACES"), kw("SPACE"))),
    ),

  // expr WORDWRAP [RIGHT MARGIN expr]: 字符串换行操作符(报表专用)
  _report_wordwrap: (/** @type {any} */ $) =>
    prec.right(
      PREC.ascii,
      seq(
        field("left", $.expression),
        kw("WORDWRAP"),
        optional(seq(kw("RIGHT MARGIN"), $.expression)),
      ),
    ),

  // ---- 报表专用表达式操作符(加入全局 expression) ----
  // COUNT(*) / PERCENT(*) 必须识别(函数调用形式不支持裸 * 参数)
  // SUM|AVG|MIN|MAX 直接作为函数调用解析(避免关键字遮蔽同名变量/函数),
  // 仅额外支持 GROUP 前缀与可选 WHERE 子句。
  report_aggregate: (/** @type {any} */ $) =>
    choice(
      seq(
        optional(kw("GROUP")),
        choice(kw("COUNT"), kw("PERCENT")),
        "(",
        "*",
        ")",
        optional($.report_where),
      ),
      seq(
        kw("GROUP"),
        $._function_expression,
        optional($.report_where),
      ),
    ),

  report_where: (/** @type {any} */ $) =>
    seq(kw("WHERE"), $.expression),

  // ---- 报表专用数值操作数子规则 ----
  // 行数: SKIP/NEED n LINE(S)
  _line_count: (/** @type {any} */ $) =>
    field("lines", choice($.variable, $.number)),
  // ASCII 参数: ASCII n
  _ascii_arg: (/** @type {any} */ $) =>
    field("argument", choice($.variable, $.number)),
};
