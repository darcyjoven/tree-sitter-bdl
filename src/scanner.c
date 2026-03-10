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

  while (!lexer->eof(lexer)) {
    // 只有在顶层且不在引号内时，记录“干净”的结束边界
    if (!in_s_quote && !in_d_quote && paren_depth == 0) {
      lexer->mark_end(lexer);
    }

    // --- 新增：过滤注释。确保我们不在引号中时，直接吞掉注释 ---
    if (!in_s_quote && !in_d_quote) {
      // 处理行注释 --
      if (lexer->lookahead == '-') {
        lexer->advance(lexer, false);
        if (lexer->lookahead == '-') {
          while (!lexer->eof(lexer) && lexer->lookahead != '\n') {
            lexer->advance(lexer, false);
          }
          continue; // 注释结束，直接进入下一轮外层循环
        }
        continue; // 只是一个 '-' 符号，继续正常处理
      }
      // 处理行注释 #
      else if (lexer->lookahead == '#') {
        while (!lexer->eof(lexer) && lexer->lookahead != '\n') {
          lexer->advance(lexer, false);
        }
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
        continue;
      }
    }

    if (lexer->lookahead == '\'') {
      if (!in_d_quote)
        in_s_quote = !in_s_quote;
      lexer->advance(lexer, false);
    } else if (lexer->lookahead == '"') {
      if (!in_s_quote)
        in_d_quote = !in_d_quote;
      lexer->advance(lexer, false);
    } else if (!in_s_quote && !in_d_quote) {
      if (lexer->lookahead == '(') {
        paren_depth++;
        lexer->advance(lexer, false);
      } else if (lexer->lookahead == ')') {
        if (paren_depth > 0)
          paren_depth--;
        lexer->advance(lexer, false);
      } else if (paren_depth == 0 && is_word_char(lexer->lookahead)) {

        char word1[64];
        scan_word(lexer, word1);

        // --- DEBUG: 扫描到单词 ---
        // printfLog("  [Word] Checking: %s\n", word1);

        bool matched = false;
        // 检查单单词终止符
        for (int i = 0; i < TERM_COUNT; i++) {
          if (strcmp(word1, BDL_TERMINATORS[i]) == 0) {
            printfLog("    [Match] Single Terminator: %s\n", word1);
            matched = true;
            break;
          }
        }

        // 检查短语终止符
        if (!matched) {
          bool possible_phrase = false;

          // 1. 先扫描一遍，看看 word1 是否有可能是任何一个短语的开头
          for (int i = 0; i < PHRASE_COUNT; i++) {
            if (strcmp(word1, PHRASE_TERMINATORS[i].first) == 0) {
              possible_phrase = true;
              break; // 只要确认它是短语开头之一，就跳出循环
            }
          }

          // 2. 如果 word1 是短语开头，我们去取 word2（只取一次！）
          if (possible_phrase) {
            // 暂时保存位置，尝试匹配第二个词
            while (iswspace(lexer->lookahead)) {
              lexer->advance(lexer, false);
            }

            char word2[64];
            word2[0] = '\0';         // 养成好习惯，初始化字符串
            scan_word(lexer, word2); // 整个过程只消耗一次流来获取 word2

            // 3. 拿着固定的 word1 和 word2 去匹配具体的终止符
            for (int i = 0; i < PHRASE_COUNT; i++) {
              if (strcmp(word1, PHRASE_TERMINATORS[i].first) == 0) {
                printfLog("    [Matching] Phrase Terminator 2nd: %s vs %s \n",
                          word2, PHRASE_TERMINATORS[i].second);

                if (strcmp(word2, PHRASE_TERMINATORS[i].second) == 0) {
                  printfLog("    [Match] Phrase: %s %s\n", word1, word2);
                  matched = true;

                  // 注意：如果你使用的是 Tree-sitter，这里可能需要调用
                  // lexer->mark_end(lexer); 来标记 token 结束的准确位置。

                  break;
                }
              }
            }

            // 重要提示：如果走到了这里 matched 依然是 false (比如遇到了 "ON
            // SOMETHING")， 输入流已经被你消耗掉了 word2。 在 Tree-sitter
            // 中，如果你最终 scanner 返回 false，状态会自动回滚，这没问题。
            // 但如果是你自己手写的 Lexer，你可能需要实现一个 "unget"
            // 或者状态回退的机制。
          }
        }

        if (matched) {
          // 特殊处理 FOR UPDATE：SQL 里的 FOR UPDATE 不能作为终止符
          if (strcmp(word1, "FOR") == 0) {
            // 不仅跳过空白，也要跳过可能的注释，防 FOR {注释} UPDATE
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
                  break; // 是单个 '-'，跳出
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
      } else {
        lexer->advance(lexer, false);
      }
    } else {
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
