#include "tree_sitter/parser.h"
#include <wctype.h>
#include <string.h>
#include <stdbool.h>

enum TokenType
{
    SELECT_STATEMENT,
    UPDATE_STATEMENT,
    CREATE_TABLE_STATEMENT,
    ERROR_SENTINEL
};

typedef struct
{
    const char *keyword;
    enum TokenType type;
} StatementConfig;

static const StatementConfig SQL_STARTERS[] = {
    {"SELECT", SELECT_STATEMENT},
    {"UPDATE", UPDATE_STATEMENT},
    {"CREATE TABLE", CREATE_TABLE_STATEMENT}};

// 终止符：包含 BDL 关键字和所有的 SQL 起始词
static const char *BDL_TERMINATORS[] = {
    "IF", "END", "LET", "RETURN", "FOR", "WHILE", "CASE",
    "SELECT", "UPDATE", "INSERT", "DELETE", "CREATE", "DROP"};

#define STARTER_COUNT (sizeof(SQL_STARTERS) / sizeof(SQL_STARTERS[0]))
#define TERM_COUNT (sizeof(BDL_TERMINATORS) / sizeof(BDL_TERMINATORS[0]))

static bool is_word_char(int32_t c)
{
    return iswalnum(c) || c == '_';
}

// 精准匹配起始词
static bool try_match_starter(TSLexer *lexer, const char *target)
{
    for (int i = 0; target[i]; i++)
    {
        if (target[i] == ' ')
        {
            if (!iswspace(lexer->lookahead))
                return false;
            while (iswspace(lexer->lookahead))
                lexer->advance(lexer, false);
        }
        else
        {
            if (towupper(lexer->lookahead) != target[i])
                return false;
            lexer->advance(lexer, false);
        }
    }
    return !is_word_char(lexer->lookahead);
}

bool tree_sitter_bdl_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols)
{
    if (valid_symbols[ERROR_SENTINEL])
        return false;

    // 1. 跳过前置空白
    while (iswspace(lexer->lookahead))
        lexer->advance(lexer, true);

    // 2. 尝试识别起始词
    int current_type = -1;
    for (int i = 0; i < STARTER_COUNT; i++)
    {
        if (valid_symbols[SQL_STARTERS[i].type])
        {
            if (try_match_starter(lexer, SQL_STARTERS[i].keyword))
            {
                current_type = SQL_STARTERS[i].type;
                break;
            }
        }
    }

    if (current_type == -1)
        return false;

    // 3. 进入内容扫描
    int paren_depth = 0;
    bool in_s_quote = false;
    bool in_d_quote = false;

    while (!lexer->eof(lexer))
    {
        // A. 处理引号
        if (lexer->lookahead == '\'')
        {
            if (!in_d_quote)
                in_s_quote = !in_s_quote;
            lexer->advance(lexer, false);
        }
        else if (lexer->lookahead == '"')
        {
            if (!in_s_quote)
                in_d_quote = !in_d_quote;
            lexer->advance(lexer, false);
        }
        // B. 在非引号内处理括号和单词
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
                // 【关键修复点】：只要 paren_depth 为 0，读取任何词前先标记结束位置
                lexer->mark_end(lexer);

                char word[64] = {0};
                int len = 0;
                while (is_word_char(lexer->lookahead) && len < 63)
                {
                    word[len++] = (char)towupper(lexer->lookahead);
                    lexer->advance(lexer, false);
                }
                word[len] = '\0';

                // 检查是否为终止词（包括另一个 SELECT）
                for (int i = 0; i < TERM_COUNT; i++)
                {
                    if (strcmp(word, BDL_TERMINATORS[i]) == 0)
                    {
                        lexer->result_symbol = current_type;
                        return true;
                    }
                }
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