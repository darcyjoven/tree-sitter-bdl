#include "tree_sitter/parser.h"
#include <stdbool.h>
#include <string.h>
#include <wctype.h>

enum TokenType {
  INSERT_SQL,
  UPDATE_SQL,
  SELECT_SQL,
  DELETE_SQL,
  CREATE_SQL,
  ALTER_SQL,
  DROP_SQL,
  ERROR_SENTINEL
};

typedef struct {
  const char *keword;
  enum TokenType type;
} SqlRule;

// --- 配置区 ---

static const SqlRule SQL_RULES[] = {
    {"SELECT", SELECT_SQL}, {"INSERT", INSERT_SQL}, {"DELETE", DELETE_SQL},
    {"UPDATE", UPDATE_SQL}, {"CREATE", CREATE_SQL}, {"ALTER", ALTER_SQL},
    {"DROP", DROP_SQL},
};
#define SQL_RULE_COUNT (sizeof(SQL_RULES) / sizeof(SQL_RULES[0]))

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
  while (is_word_char(lexer->lookahead) && i < 63) {
    starter[i++] = (char)towupper(lexer->lookahead);
    lexer->advance(lexer, false);
  }
  starter[i] = '\0';

  int current_type = -1;

  for (int r = 0; r < SQL_RULE_COUNT; r++) {
    const SqlRule *rule = &SQL_RULES[r];

    // 没匹配到退出
    if (strcmp(starter, rule->keword) != 0)
      continue;
    // 关键字未定义退出
    if (!valid_symbols[rule->type])
      continue;
    current_type = rule->type;
  }

  if (current_type == -1)
    return false;

  // 3. 核心循环：寻找边界
  int paren_depth = 0;
  bool in_s_quote = false;
  bool in_d_quote = false;

  while (!lexer->eof(lexer)) {
    // ---【关键：仅在深度为0且不在引号内时，记录当前的“干净边界”】---
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

        // 探测接下来的单词，但注意：我们已经在上面 mark_end 了
        char word1[64];
        scan_word(lexer, word1);

        // 检查单词终止
        bool matched = false;
        for (int i = 0; i < TERM_COUNT; i++) {
          if (strcmp(word1, BDL_TERMINATORS[i]) == 0) {
            matched = true;
            break;
          }
        }

        // 检查短语终止
        if (!matched) {
          for (int i = 0; i < PHRASE_COUNT; i++) {
            if (strcmp(word1, PHRASE_TERMINATORS[i].first) == 0) {
              while (iswspace(lexer->lookahead))
                lexer->advance(lexer, false);
              char word2[64];
              scan_word(lexer, word2);
              if (strcmp(word2, PHRASE_TERMINATORS[i].second) == 0) {
                matched = true;
                break;
              }
            }
          }
        }

        if (matched) {
          // --- 特殊处理：FOR UPDATE 不应视为 SELECT 的结束 ---
          if (current_type == SELECT_SQL && strcmp(word1, "FOR") == 0) {

            // 新增：不仅跳过空白，也要跳过可能的注释，防 FOR {注释} UPDATE
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
              lexer->result_symbol = current_type;
              return true;
            }
          } else {
            lexer->result_symbol = current_type;
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
  lexer->result_symbol = current_type;
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
