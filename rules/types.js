/// <reference types="tree-sitter-cli/dsl" />

import { commaSep1, dotSep1, datetimeQualifier, kw } from "./util.js";
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
        repeat(
          choice(
            $.constant_definition,
            $.user_type_definition,
            $.variable_definition,
          ),
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
      optional($._data_type),
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
      alias(
        seq(kw("RECORD"), $._variable_list, kw("END RECORD")),
        $.record_type,
      ),
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
        kw("DYNAMIC"),
        kw("ARRAY"),
        optional(seq(kw("WITH"), kw("DIMENSION"), /[1-3]/)),
        kw("OF"),
        $._data_type,
      ),
      seq(
        kw("ARRAY"),
        "[",
        "]",
        kw("OF"),
        alias($._third_java_type, "java_type"),
      ),
    ),
  // 系列类型，用于type record define
  // 允许混合定义 define l_a,l_b string, l_c string
  _variable_list: ($) => commaSep1($._variable_declaration_group),
  _variable_declaration_group: ($) =>
    seq(commaSep1(alias($._identifier, $.variable_name)), $._data_type),
  // record 因为有end record
  // _record_list: ($) =>
  //   commaSep1(seq(alias($._identifier, $.variable_name), $._data_type)),
  // 第三方导入类型
  _third_type: ($) =>
    choice(
      $._third_base_type,
      $._third_ui_type,
      $._third_om_type,
      $._third_java_type,
    ),
  _third_base_type: ($) =>
    seq(
      kw("BASE"),
      ".",
      choice(
        kw("APPLICATION"),
        kw("CHANNEL"),
        kw("STRINGBUFFER "),
        seq(kw("STRINGTOKENIZER"), optional(seq(".", kw("CREATE")))),
        kw("TYPEINFO"),
        kw("MESSAGESERVER"),
      ),
    ),
  _third_ui_type: ($) =>
    seq(
      kw("UI"),
      ".",
      choice(
        kw("WINDOW"),
        kw("FORM"),
        kw("COMBOBOX"),
        kw("DRAGDROP"),
        kw("DIALOG"),
      ),
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
  _third_java_type: ($) => dotSep1($._identifier),
};
