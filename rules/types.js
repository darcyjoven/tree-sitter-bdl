/// <reference types="tree-sitter-cli/dsl" />

import { commaSep1, datetimeQualifier, kw } from "./util.js";
// @ts-check

export default {
  //============================================================
  // 声明(declaration)
  // globals constant type variable
  _declaration: ($) =>
    choice(
      $.globals_inclusion,
      $.constant_definition,
      $.user_type_definition,
      $.variable_definition,
    ),
  // 全局
  globals_inclusion: ($) =>
    choice(
      seq(
        kw("GLOBALS"),
        choice(
          $.constant_definition,
          $.user_type_definition,
          $.variable_definition,
        ),
        kw("END GLOBALS"),
      ),
      seq(kw("GLOBALS"), alias($._string_literal, "filename")),
    ),
  // 常量
  constant_definition: ($) =>
    seq(optional($.scope), kw("CONSTANT"), commaSep1($._constant_statement)),
  _constant_statement: ($) =>
    seq(
      alias($._identifier, $.constant_name),
      alias(optional($._data_type), $.data_type),
      "=",
      $.literal,
    ),
  // 类型定义
  user_type_definition: ($) =>
    seq(optional($.scope), kw("TYPE"), $._variable_list),
  // 变量定义
  variable_definition: ($) =>
    seq(optional($.scope), kw("DEFINE"), $._variable_list),

  // 数据类型
  _data_type: ($) =>
    choice(
      prec(
        1,
        choice(
          $._basic_data_type,
          $._like_data_type,
          $._record_data_type,
          $._array_data_type,
          $._third_type,
        ),
      ),
      alias($._identifier, "user_type"),
    ),
  _basic_data_type: ($) =>
    choice(
      // CHAR
      seq(
        kw("CHAR"),
        optional(
          seq(
            "(",
            alias(choice($._natural_number, $._identifier), "length"),
            ")",
          ),
        ),
      ),
      //CHARACTER
      seq(
        kw("CHARACTER"),
        optional(
          seq(
            "(",
            alias(choice($._natural_number, $._identifier), "length"),
            ")",
          ),
        ),
      ),
      seq(
        kw("VARCHAR"),
        optional(
          seq(
            "(",
            alias(choice($._natural_number, $._identifier), "length"),
            optional(
              seq(
                ",",
                alias(choice($._natural_number, $._identifier), "length"),
              ),
            ),
            ")",
          ),
        ),
      ),
      kw("STRING"),
      kw("BIGINT"),
      kw("INTEGER"),
      kw("SMALLINT"),
      kw("TINYINT"),
      kw("FLOAT"),
      kw("SMALLFLOAT"),
      //DECIMAL
      seq(
        kw("DECIMAL"),
        optional(
          seq(
            "(",
            alias(choice($._natural_number, $._identifier), "length"),
            optional(
              seq(
                ",",
                alias(choice($._natural_number, $._identifier), "length"),
              ),
            ),
            ")",
          ),
        ),
      ),
      // MONEY
      seq(
        kw("MONEY"),
        optional(
          seq(
            "(",
            alias(choice($._natural_number, $._identifier), "length"),
            optional(
              seq(
                ",",
                alias(choice($._natural_number, $._identifier), "length"),
              ),
            ),
            ")",
          ),
        ),
      ),
      kw("DATE"),
      seq(kw("DATETIME"), datetimeQualifier, kw("TO"), datetimeQualifier),
      seq(kw("INTERVAL"), datetimeQualifier, kw("TO"), datetimeQualifier),
      kw("BYTE"),
      kw("TEXT"),
      kw("BOOLEAN"),
    ),
  _like_data_type: ($) =>
    seq(
      kw("LIKE"),
      seq(
        // [dbname:]
        optional(seq(alias($._identifier, "dbname"), ":")),
        // tabname
        alias($._identifier, "table_name"),
        // .colname
        ".",
        alias($._identifier, "column_name"),
      ),
    ),
  _record_data_type: ($) =>
    choice(
      seq(kw("RECORD"), $._record_list, kw("END RECORD")),
      seq(
        kw("RECORD"),
        kw("LIKE"),
        optional(seq(alias($._identifier, "dbname"), ":")),
        alias($._identifier, "table_name"),
        ".",
        "*",
      ),
    ),
  _array_data_type: ($) =>
    choice(
      seq(
        kw("ARRAY"),
        "[",
        commaSep1($._natural_number),
        "]",
        kw("OF"),
        $._data_type,
      ),
      seq(
        kw("DYNAMIC ARRAY"),
        optional(seq(kw("WITH DIMENSION"), /[1-3]/)),
        kw("OF"),
        $._data_type,
      ),
      seq(kw("ARRAY"), "[", "]", kw("OF"), alias($._identifier, "java_type")),
    ),
  // 系列类型，用于type record define
  _variable_list: ($) =>
    choice(
      prec(
        1,
        commaSep1(
          seq(
            alias($._identifier, $.variable_name),
            alias($._data_type, $.data_type),
          ),
        ),
      ),
      seq(
        commaSep1(alias($._identifier, $.variable_name)),
        alias($._data_type, $.data_type),
      ),
    ),
  // record 因为有end record
  _record_list: ($) =>
    commaSep1(
      seq(
        alias($._identifier, $.variable_name),
        alias($._data_type, $.data_type),
      ),
    ),
  // 第三方导入类型
  _third_type: ($) =>
    choice($._third_base_type, $._third_ui_type, $._third_om_type),
  _third_base_type: ($) =>
    seq(
      kw("BASE"),
      ".",
      choice(
        kw("APPLICATION"),
        kw("CHANNEL"),
        kw("STRINGBUFFER "),
        kw("STRINGTOKENIZER"),
        kw("TYPEINFO"),
        kw("MESSAGESERVER"),
      ),
    ),
  _third_ui_type: ($) =>
    seq(
      kw("UI"),
      ".",
      choice(kw("WINDOW"), kw("FORM"), kw("COMBOBOX"), kw("DRAGDROP")),
    ),
  _third_om_type: ($) =>
    seq(
      kw("OM"),
      ".",
      choice(
        kw("DOMNODE "),
        kw("DOMDOCUMENT "),
        kw("NODELIST "),
        kw("SAXATTRIBUTES "),
        kw("SAXDOCUMENTHANDLER"),
        kw("XMLREADER"),
      ),
    ),
};
