export default {
    // 定义 SQL 相关的规则
    sql_statement: $ => choice(
        $.select_statement,
        $.insert_statement,
        // ...
    ),

    select_statement: $ => seq(
        /[Ss][Ee][Ll][Ee][Cc][Tt]/, // 也可以在这里调用通用的 kw("SELECT")
        /[Ff][Rr][Oo][Mm]/,
        $.identifier
    ),
    insert_statement: $ => seq(
        /[Ss][Ee][Ll][Ee][Cc][Tt]/, // 也可以在这里调用通用的 kw("SELECT")
        /[Ff][Rr][Oo][Mm]/,
        $.identifier
    ),

    // 更多 SQL 规则...
};