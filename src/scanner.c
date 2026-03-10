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

  // 1. 跳过前置空白
  while (iswspace(lexer->lookahead))
    lexer->advance(lexer, true);

  lexer->mark_end(lexer);

  int paren_depth = 0;
  bool in_s_quote = false;
  bool in_d_quote = false;

  // 【核心优化1】：记录上一个处理的单元是否是“空白边界”（含前置跳过、纯空白、以及注释）
  // 初始为 true，因为前面已经跳过了前置空白，此时我们正处在一个空白边界上
  bool last_was_whitespace = true;

  while (!lexer->eof(lexer)) {
    // 只有在顶层且不在引号内时，记录“干净”的结束边界
    if (!in_s_quote && !in_d_quote && paren_depth == 0) {
      lexer->mark_end(lexer);
    }

    // --- 1. 显式处理空白符 ---
    if (iswspace(lexer->lookahead)) {
      last_was_whitespace = true;
      lexer->advance(lexer, false);
      continue;
    }

    // --- 2. 处理注释（过滤注释，跳过注释后相当于遇到空白边界） ---
    if (!in_s_quote && !in_d_quote) {
      // 处理行注释 --
      if (lexer->lookahead == '-') {
        lexer->advance(lexer, false);
        if (lexer->lookahead == '-') {
          while (!lexer->eof(lexer) && lexer->lookahead != '\n') {
            lexer->advance(lexer, false);
          }
          last_was_whitespace = true; // 注释结束相当于一个空白边界
          continue;
        }
        // 如果只是一个 '-' 符号（如减号运算），它不属于空白边界
        last_was_whitespace = false;
        continue; // 刚才已经 advance 了单减号，直接进入下一轮外层循环
      }
      // 处理行注释 #
      else if (lexer->lookahead == '#') {
        while (!lexer->eof(lexer) && lexer->lookahead != '\n') {
          lexer->advance(lexer, false);
        }
        last_was_whitespace = true;
        continue;
      }
      // 处理块注释 { ... }
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

    // --- 3. 处理字符串引号 ---
    if (lexer->lookahead == '\'') {
      if (!in_d_quote)
        in_s_quote = !in_s_quote;
      last_was_whitespace = false;
      lexer->advance(lexer, false);
      continue;
    } else if (lexer->lookahead == '"') {
      if (!in_s_quote)
        in_d_quote = !in_d_quote;
      last_was_whitespace = false;
      lexer->advance(lexer, false);
      continue;
    }

    // --- 4. 处理括号和内容单词 ---
    if (!in_s_quote && !in_d_quote) {
      if (lexer->lookahead == '(') {
        paren_depth++;
        last_was_whitespace = false;
        lexer->advance(lexer, false);
      } else if (lexer->lookahead == ')') {
        if (paren_depth > 0)
          paren_depth--;
        last_was_whitespace = false;
        lexer->advance(lexer, false);
      } else if (is_word_char(lexer->lookahead)) {

        // 【核心优化2】：只有在单词前面存在空白（或处于开头/注释后）时，才允许当作终止符
        bool can_be_terminator = last_was_whitespace;

        char word1[64];
        scan_word(lexer, word1);

        // 扫描完当前单词后，光标停留在单词后的字符上。对下一个 Token 来说，它前面的紧挨着的是个单词，不再是空白
        last_was_whitespace = false;

        // 【核心优化3】：加入了 can_be_terminator 条件拦截
        if (paren_depth == 0 && can_be_terminator) {
          bool matched = false;
          // 检查单单词终止符
          for (int i = 0; i < TERM_COUNT; i++) {
            if (strcmp(word1, BDL_TERMINATORS[i]) == 0) {
              matched = true;
              break;
            }
          }

          // 检查短语终止符
          if (!matched) {
            bool possible_phrase = false;

            for (int i = 0; i < PHRASE_COUNT; i++) {
              if (strcmp(word1, PHRASE_TERMINATORS[i].first) == 0) {
                possible_phrase = true;
                break;
              }
            }

            if (possible_phrase) {
              while (iswspace(lexer->lookahead)) {
                lexer->advance(lexer, false);
              }

              char word2[64];
              word2[0] = '\0';
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
            // 特殊处理 FOR UPDATE：SQL 里的 FOR UPDATE 不能作为终止符
            if (strcmp(word1, "FOR") == 0) {
              while (!lexer->eof(lexer)) {
                if (iswspace(lexer->lookahead)) {
                  lexer->advance(lexer, false);
                } else if (lexer->lookahead == '#') {
                  while (!lexer->eof(lexer) && lexer->lookahead != '\n')
                    lexer->advance(lexer, false);
                } else if (lexer->lookahead == '{') {
                  lexer->advance(lexer, false);
                  while (!lexer->eof(lexer) && lexer->lookahead != '}')
                    lexer->advance(lexer, false);
                  if (lexer->lookahead == '}')
                    lexer->advance(lexer, false);
                } else if (lexer->lookahead == '-') {
                  lexer->advance(lexer, false);
                  if (lexer->lookahead == '-') {
                    while (!lexer->eof(lexer) && lexer->lookahead != '\n')
                      lexer->advance(lexer, false);
                  } else {
                    break;
                  }
                } else {
                  break;
                }
              }

              char next_word[64];
              scan_word(lexer, next_word);

              if (strcmp(next_word, "UPDATE") == 0) {
                matched = false;
              } else {
                lexer->result_symbol = SQL_BODY;
                return true;
              }
            } else {
              lexer->result_symbol = SQL_BODY;
              return true;
            }
          }
        }
      } else {
        // 遇到其他未知字符（如 + * / 等算数运算符），直接跳过并取消空白状态
        last_was_whitespace = false;
        lexer->advance(lexer, false);
      }
    } else {
      // 在引号内时
      last_was_whitespace = false;
      lexer->advance(lexer, false);
    }
  }

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
