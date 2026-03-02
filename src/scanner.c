#include "tree_sitter/parser.h"
#include <wctype.h>
#include <string.h>
#include <stdbool.h>

enum TokenType
{
    SELECT_SQL,
    UPDATE_SQL,
    CREATE_TABLE_SQL,
    ERROR_SENTINEL
};

typedef struct {
    const char *first;
    const char *second;   // 可为 NULL
    enum TokenType type;
} SqlRule;

// --- 配置区 ---

static const SqlRule SQL_RULES[] = {
    {"SELECT", NULL, SELECT_SQL},
    {"UPDATE", NULL, UPDATE_SQL},
    {"CREATE", "TABLE", CREATE_TABLE_SQL},
    // 后续只在这里加：
    // {"DELETE", NULL, DELETE_SQL},
    // {"INSERT", NULL, INSERT_SQL},
};
#define SQL_RULE_COUNT (sizeof(SQL_RULES) / sizeof(SQL_RULES[0]))

static const char *BDL_TERMINATORS[] = {
    "ACCEPT",
    "AFTER",
    "ALTER",
    "BEFORE",
    "CALL",
    "CANCEL",
    "CASE",
    "CATCH",
    "CLEAR",
    "CLOSE",
    "COMMAND",
    "CONNECT",
    "CONTINUE",
    "CREATE",
    "CURSOR",
    "DATABASE",
    "DECLARE",
    "DEFINE",
    "DELETE",
    "DISPLAY",
    "DROP",
    "END",
    "ERROR",
    "EXECUTE",
    "EXIT",
    "FETCH",
    "FLUSH",
    "FOR",
    "FOREACH",
    "FREE",
    "GLOBALS",
    "GOTO",
    "HIDE",
    "IF",
    "INITIALIZE",
    "INSERT",
    "LABEL",
    "LET",
    "LOAD",
    "LOCATE",
    "MENU",
    "MESSAGE",
    "NEXT",
    "OPEN",
    "OPEN",
    "PREPARE",
    "PUT",
    "RENAME",
    "RETURN",
    "SCHEMA",
    "SCROLL",
    "SELECT",
    "SHOW",
    "SQL",
    "TRY",
    "TYPE",
    "UNLOAD",
    "UPDATE",
    "VALIDATE",
    "WHENEVER",
    "WHILE"};

typedef struct
{
    const char *first;
    const char *second;
} Phrase;
static const Phrase PHRASE_TERMINATORS[] = {
    {"ON", "ACTION"},
    {"ON", "APPEND"},
    {"ON", "CHANGE"},
    {"ON", "COLLAPSE"},
    {"ON", "DELETE"},
    {"ON", "DRAG_ENTER"},
    {"ON", "DRAG_FINISH"},
    {"ON", "DRAG_OVER"},
    {"ON", "DRAG_START"},
    {"ON", "DROP"},
    {"ON", "EXPAND"},
    {"ON", "FILL"},
    {"ON", "IDLE"},
    {"ON", "INSERT"},
    {"ON", "KEY"},
    {"ON", "ROW"},
    {"ON", "UPDATE"}};

#define TERM_COUNT (sizeof(BDL_TERMINATORS) / sizeof(BDL_TERMINATORS[0]))
#define PHRASE_COUNT (sizeof(PHRASE_TERMINATORS) / sizeof(PHRASE_TERMINATORS[0]))

// --- 辅助工具 ---
static bool is_word_char(int32_t c)
{
    return iswalnum(c) || c == '_';
}

// 模拟读取单词但不影响主循环的 mark_end
static void scan_word(TSLexer *lexer, char *buf)
{
    int i = 0;
    while (is_word_char(lexer->lookahead) && i < 63)
    {
        buf[i++] = (char)towupper(lexer->lookahead);
        lexer->advance(lexer, false);
    }
    buf[i] = '\0';
}

bool tree_sitter_bdl_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols)
{
    if (valid_symbols[ERROR_SENTINEL])
        return false;

    // 1. 跳过前置空白
    while (iswspace(lexer->lookahead))
        lexer->advance(lexer, true);

    // 2. 识别起始词
    lexer->mark_end(lexer);
    char starter[64];
    if (!is_word_char(lexer->lookahead))
        return false;

    // 探测起始词
    int i = 0;
    while (is_word_char(lexer->lookahead) && i < 63)
    {
        starter[i++] = (char)towupper(lexer->lookahead);
        lexer->advance(lexer, false);
    }
    starter[i] = '\0';

    int current_type = -1;
    // if (strcmp(starter, "SELECT") == 0 && valid_symbols[SELECT_SQL])
    //     current_type = SELECT_SQL;
    // else if (strcmp(starter, "UPDATE") == 0 && valid_symbols[UPDATE_SQL])
    //     current_type = UPDATE_SQL;
    // else if (strcmp(starter, "CREATE") == 0 && valid_symbols[CREATE_TABLE_SQL])
    // {
    //     while (iswspace(lexer->lookahead))
    //         lexer->advance(lexer, false);
    //     char second[64];
    //     scan_word(lexer, second);
    //     if (strcmp(second, "TABLE") == 0)
    //         current_type = CREATE_TABLE_SQL;
    // }

    //
    for (int r = 0; r < SQL_RULE_COUNT; r++) {
        const SqlRule *rule = &SQL_RULES[r];

        // 没匹配到退出
        if (strcmp(starter, rule->first) != 0)
                continue;
        // 关键字未定义退出
        if (!valid_symbols[rule->type])
                continue;
        // 单词直接结束
        if (rule->second == NULL) {
            current_type = rule->type;
            break;
        }
        // 找第二词
        // 遍历掉空白符
        while (iswspace(lexer->lookahead))
            lexer->advance(lexer, false);

        char second[64];
        scan_word(lexer, second);

        if (strcmp(second, rule->second) == 0) {
            current_type = rule->type;
            break;
        }
    }

    if (current_type == -1)
        return false;

    // 3. 核心循环：寻找边界
    int paren_depth = 0;
    bool in_s_quote = false;
    bool in_d_quote = false;

    while (!lexer->eof(lexer))
    {
        // ---【关键：仅在深度为0且不在引号内时，记录当前的“干净边界”】---
        if (!in_s_quote && !in_d_quote && paren_depth == 0)
        {
            lexer->mark_end(lexer);
        }

        if (lexer->lookahead == '\'')
        {
            if (!in_d_quote)
                in_s_quote = !in_s_quote;
            lexer->advance(lexer, false);
        }
        else if (lexer->lookahead == '"')
        {
            if (!in_s_quote)
                in_d_quote = !in_s_quote;
            lexer->advance(lexer, false);
        }
        else if (!in_s_quote && !in_d_quote)
        {
            if (lexer->lookahead == '(')
            {
                paren_depth++;
                lexer->advance(lexer, false);
            }
            else if (lexer->lookahead == ')')
            {
                if (paren_depth > 0)
                    paren_depth--;
                lexer->advance(lexer, false);
            }
            else if (paren_depth == 0 && is_word_char(lexer->lookahead))
            {

                // 探测接下来的单词，但注意：我们已经在上面 mark_end 了
                char word1[64];
                scan_word(lexer, word1);

                // 检查单词终止
                bool matched = false;
                for (int i = 0; i < TERM_COUNT; i++)
                {
                    if (strcmp(word1, BDL_TERMINATORS[i]) == 0)
                    {
                        matched = true;
                        break;
                    }
                }

                // 检查短语终止
                if (!matched)
                {
                    for (int i = 0; i < PHRASE_COUNT; i++)
                    {
                        if (strcmp(word1, PHRASE_TERMINATORS[i].first) == 0)
                        {
                            while (iswspace(lexer->lookahead))
                                lexer->advance(lexer, false);
                            char word2[64];
                            scan_word(lexer, word2);
                            if (strcmp(word2, PHRASE_TERMINATORS[i].second) == 0)
                            {
                                matched = true;
                                break;
                            }
                        }
                    }
                }

                if (matched)
                {
                    lexer->result_symbol = current_type;
                    return true; // 结果停在 word1 之前的 mark_end 处
                }

                // 如果没有匹配到终止符，继续循环。
                // 此时 lexer 已经在单词之后，下一次循环开头会执行 mark_end 更新边界。
            }
            else
            {
                lexer->advance(lexer, false);
            }
        }
        else
        {
            lexer->advance(lexer, false);
        }
    }

    lexer->mark_end(lexer);
    lexer->result_symbol = current_type;
    return true;
}

// 占位函数...
void *tree_sitter_bdl_external_scanner_create() { return NULL; }
void tree_sitter_bdl_external_scanner_destroy(void *p) {}
unsigned tree_sitter_bdl_external_scanner_serialize(void *p, char *b) { return 0; }
void tree_sitter_bdl_external_scanner_deserialize(void *p, const char *b, unsigned n) {}
