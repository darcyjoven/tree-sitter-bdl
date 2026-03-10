#include "tree_sitter/parser.h"
#include <stdarg.h>
#include <stdbool.h>
#include <stdio.h>
#include <string.h>
#include <wctype.h>

// 你的代理函数
int printfLog(const char *format, ...) {

  return 0;

  int done;
  va_list arg;

  // 1. 初始化 va_list，使其指向第一个变长参数
  va_start(arg, format);

  // 2. 将 va_list 传递给 vprintf（这是核心步骤）
  // 注意：不能直接调用 printf(format, arg)，那是不行的
  done = vprintf(format, arg);

  // 4. 清理工作
  va_end(arg);

  return done; // 返回打印的字符总数，保持与 printf 行为一致
}

enum TokenType { SQL_BODY, ERROR_SENTINEL };


static const char *BDL_TERMINATORS[] = {
    "ACCEPT",  "AFTER",    "ALTER",    "BEFORE",   "CALL",       "CANCEL",
    "CASE",    "CATCH",    "CLEAR",    "CLOSE",    "COMMAND",    "COMMIT",
    "CONNECT", "CONTINUE", "CREATE",   "CURSOR",   "DATABASE",   "DECLARE",
    "DELETE",  "DISPLAY",  "DROP",     "END",      "ERROR",      "EXECUTE",
    "EXIT",    "FETCH",    "FLUSH",    "FOR",      "FOREACH",    "FREE",
    "GLOBALS", "GOTO",     "HIDE",     "IF",       "INITIALIZE", "INSERT",
    "INPUT",   "LABEL",    "LET",      "LOAD",     "LOCATE",     "MENU",
    "MESSAGE", "NEXT",     "OPEN",     "OPEN",     "PREPARE",    "PUT",
    "RELEASE", "RENAME",   "RETURN",   "ROLLBACK", "SAVEPOINT",  "SCHEMA",
    "SCROLL",  "SELECT",   "SHOW",     "SQL",      "TRY",        "UNLOAD",
    "UPDATE",  "VALIDATE", "WHENEVER", "WHILE"};

typedef struct {
  const char *first;
  const char *second;
} Phrase;
static const Phrase PHRASE_TERMINATORS[] = {
    {"ON", "ACTION"},      {"ON", "APPEND"},    {"ON", "CHANGE"},
    {"ON", "COLLAPSE"},    {"ON", "DELETE"},    {"ON", "DRAG_ENTER"},
    {"ON", "DRAG_FINISH"}, {"ON", "DRAG_OVER"}, {"ON", "DRAG_START"},
    {"ON", "DROP"},        {"ON", "EXPAND"},    {"ON", "FILL"},
    {"ON", "IDLE"},        {"ON", "INSERT"},    {"ON", "KEY"},
    {"ON", "ROW"},         {"ON", "UPDATE"}};

#define TERM_COUNT (sizeof(BDL_TERMINATORS) / sizeof(BDL_TERMINATORS[0]))
#define PHRASE_COUNT                                                           \
  (sizeof(PHRASE_TERMINATORS) / sizeof(PHRASE_TERMINATORS[0]))

// --- 辅助工具 ---
static bool is_word_char(int32_t c) { return iswalnum(c) || c == '_'; }

// 模拟读取单词但不影响主循环的 mark_end
static void scan_word(TSLexer *lexer, char *buf) {
  int i = 0;
  while (is_word_char(lexer->lookahead) && i < 63) {
    buf[i++] = (char)towupper(lexer->lookahead);
    lexer->advance(lexer, false);
  }
  buf[i] = '\0';
}

bool tree_sitter_bdl_external_scanner_scan(void *payload, TSLexer *lexer,
                                           const bool *valid_symbols) {
  if (valid_symbols[ERROR_SENTINEL])
    return false;

  if (!valid_symbols[SQL_BODY])
    return false;

  // 1. 跳过前置空白，并标记当前位置为 token 开始
  while (iswspace(lexer->lookahead))
    lexer->advance(lexer, true);

  lexer->mark_end(lexer);

  int paren_depth = 0;   // 括号深度：用于处理 (SELECT ...)
  int case_depth = 0;    // SQL 内部 CASE 深度：用于处理 CASE WHEN ... END
  bool in_s_quote = false;
  bool in_d_quote = false;
  bool last_was_whitespace = true;
  bool pending_case_end = false;

  while (!lexer->eof(lexer)) {
    // 只有在最外层（非嵌套、非引号内）时，才可能标记有效的 SQL 结束边界
    if (!in_s_quote && !in_d_quote && paren_depth == 0 && case_depth == 0) {
      lexer->mark_end(lexer);
    }

    // --- 1. 处理空白和注释 ---
    if (iswspace(lexer->lookahead)) {
      last_was_whitespace = true;
      lexer->advance(lexer, false);
      continue;
    }

    if (!in_s_quote && !in_d_quote) {
      // 行注释 --
      if (lexer->lookahead == '-') {
        lexer->advance(lexer, false);
        if (lexer->lookahead == '-') {
          while (!lexer->eof(lexer) && lexer->lookahead != '\n') {
            lexer->advance(lexer, false);
          }
          last_was_whitespace = true;
          continue;
        }
        last_was_whitespace = false;
        continue;
      }
      // 行注释 #
      else if (lexer->lookahead == '#') {
        while (!lexer->eof(lexer) && lexer->lookahead != '\n') {
          lexer->advance(lexer, false);
        }
        last_was_whitespace = true;
        continue;
      }
      // 块注释 { ... }
      else if (lexer->lookahead == '{') {
        lexer->advance(lexer, false);
        while (!lexer->eof(lexer) && lexer->lookahead != '}') {
          lexer->advance(lexer, false);
        }
        if (lexer->lookahead == '}') {
          lexer->advance(lexer, false);
        }
        last_was_whitespace = true;
        continue;
      }
    }

    // --- 2. 处理引号 ---
    if (lexer->lookahead == '\'') {
      if (!in_d_quote) in_s_quote = !in_s_quote;
      last_was_whitespace = false;
      lexer->advance(lexer, false);
    } else if (lexer->lookahead == '"') {
      if (!in_s_quote) in_d_quote = !in_d_quote;
      last_was_whitespace = false;
      lexer->advance(lexer, false);
    }
    // --- 3. 处理核心语法结构 ---
    else if (!in_s_quote && !in_d_quote) {
      if (lexer->lookahead == '(') {
        paren_depth++;
        last_was_whitespace = false;
        lexer->advance(lexer, false);
      } else if (lexer->lookahead == ')') {
        if (paren_depth > 0) paren_depth--;
        last_was_whitespace = false;
        lexer->advance(lexer, false);
      } else if (is_word_char(lexer->lookahead)) {

        bool can_be_terminator = last_was_whitespace;
        char word1[64];
        scan_word(lexer, word1);
        last_was_whitespace = false;

        bool is_internal_case_logic = false;

        if (pending_case_end) {
          if (strcmp(word1, "CASE") == 0) {
            pending_case_end = false;
            is_internal_case_logic = true;
          } else {
            pending_case_end = false;
          }
        }

        if (!is_internal_case_logic && strcmp(word1, "CASE") == 0) {
          case_depth++;
          is_internal_case_logic = true;
        } else if (!is_internal_case_logic && strcmp(word1, "END") == 0) {
          if (case_depth > 0) {
            case_depth--;
            pending_case_end = true;
            is_internal_case_logic = true;
          }
        }

        // 判定是否作为结束符触发
        if (can_be_terminator && paren_depth == 0 && case_depth == 0 && !is_internal_case_logic) {
          bool matched = false;

          // 检查单单词终止符
          for (int i = 0; i < TERM_COUNT; i++) {
            if (strcmp(word1, BDL_TERMINATORS[i]) == 0) {
              matched = true;
              break;
            }
          }

          // 检查短语终止符 (如 ON ACTION)
          if (!matched) {
            bool possible_phrase_start = false;
            for (int i = 0; i < PHRASE_COUNT; i++) {
              if (strcmp(word1, PHRASE_TERMINATORS[i].first) == 0) {
                possible_phrase_start = true;
                break;
              }
            }

            if (possible_phrase_start) {
              // 暂时不 mark_end，尝试向后窥探第二个词
              while (iswspace(lexer->lookahead)) lexer->advance(lexer, false);
              char word2[64];
              scan_word(lexer, word2);

              for (int i = 0; i < PHRASE_COUNT; i++) {
                if (strcmp(word1, PHRASE_TERMINATORS[i].first) == 0 &&
                    strcmp(word2, PHRASE_TERMINATORS[i].second) == 0) {
                  matched = true;
                  break;
                }
              }
            }
          }

          if (matched) {
            // 特殊排除: SQL 里的 FOR UPDATE 不是 BDL 的终止符
            if (strcmp(word1, "FOR") == 0) {
              // 简单过滤空白探测下一个词
              while (iswspace(lexer->lookahead)) lexer->advance(lexer, false);
              char next_word[64];
              scan_word(lexer, next_word);
              if (strcmp(next_word, "UPDATE") == 0) {
                // 是 SQL 内部的 FOR UPDATE，不结束
              } else {
                lexer->result_symbol = SQL_BODY;
                return true;
              }
            } else {
              // 匹配到终止符，且满足空白边界和深度要求，返回 SQL_BODY
              lexer->result_symbol = SQL_BODY;
              return true;
            }
          }
        }
      } else {
        last_was_whitespace = false;
        lexer->advance(lexer, false);
      }
    } else {
      last_was_whitespace = false;
      lexer->advance(lexer, false);
    }
  }

  // 到达文件末尾
  lexer->mark_end(lexer);
  lexer->result_symbol = SQL_BODY;
  return true;
}

// 占位函数...
void *tree_sitter_bdl_external_scanner_create() { return NULL; }
void tree_sitter_bdl_external_scanner_destroy(void *p) {}
unsigned tree_sitter_bdl_external_scanner_serialize(void *p, char *b) {
  return 0;
}
void tree_sitter_bdl_external_scanner_deserialize(void *p, const char *b,
                                                  unsigned n) {}
