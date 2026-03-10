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
  va_start(arg, format);
  done = vprintf(format, arg);
  va_end(arg);
  return done;
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

static void scan_word(TSLexer *lexer, char *buf) {
  int i = 0;
  while (is_word_char(lexer->lookahead) && i < 63) {
    buf[i++] = (char)towupper(lexer->lookahead);
    lexer->advance(lexer, false);
  }
  buf[i] = '\0';
}

static bool handle_parens(TSLexer *lexer, int *paren_depth,
                          bool *last_was_whitespace) {
  if (lexer->lookahead == '(') {
    (*paren_depth)++;
    *last_was_whitespace = false;
    lexer->advance(lexer, false);
    return true;
  }
  if (lexer->lookahead == ')') {
    if (*paren_depth > 0)
      (*paren_depth)--;
    *last_was_whitespace = false;
    lexer->advance(lexer, false);
    return true;
  }
  return false;
}

static bool match_single_terminator(const char *word) {
  for (int i = 0; i < TERM_COUNT; i++) {
    if (strcmp(word, BDL_TERMINATORS[i]) == 0)
      return true;
  }
  return false;
}

static bool match_phrase_terminator(TSLexer *lexer, const char *word1) {
  bool possible_phrase_start = false;
  for (int i = 0; i < PHRASE_COUNT; i++) {
    if (strcmp(word1, PHRASE_TERMINATORS[i].first) == 0) {
      possible_phrase_start = true;
      break;
    }
  }

  if (!possible_phrase_start)
    return false;

  while (iswspace(lexer->lookahead))
    lexer->advance(lexer, false);

  char word2[64];
  scan_word(lexer, word2);

  for (int i = 0; i < PHRASE_COUNT; i++) {
    if (strcmp(word1, PHRASE_TERMINATORS[i].first) == 0 &&
        strcmp(word2, PHRASE_TERMINATORS[i].second) == 0) {
      return true;
    }
  }
  return false;
}

static bool match_terminator(TSLexer *lexer, const char *word1) {
  bool matched = match_single_terminator(word1);
  if (!matched)
    matched = match_phrase_terminator(lexer, word1);

  if (!matched)
    return false;

  if (strcmp(word1, "FOR") == 0) {
    while (iswspace(lexer->lookahead))
      lexer->advance(lexer, false);

    char next_word[64];
    scan_word(lexer, next_word);
    if (strcmp(next_word, "UPDATE") == 0)
      return false;
  }

  return true;
}

static bool skip_whitespace_and_comments(TSLexer *lexer,
                                         bool *last_was_whitespace,
                                         bool in_s_quote, bool in_d_quote) {
  if (iswspace(lexer->lookahead)) {
    *last_was_whitespace = true;
    lexer->advance(lexer, false);
    return true;
  }

  if (in_s_quote || in_d_quote)
    return false;

  if (lexer->lookahead == '-') {
    lexer->advance(lexer, false);
    if (lexer->lookahead == '-') {
      while (!lexer->eof(lexer) && lexer->lookahead != '\n') {
        lexer->advance(lexer, false);
      }
      *last_was_whitespace = true;
      return true;
    }
    *last_was_whitespace = false;
    return true;
  } else if (lexer->lookahead == '#') {
    while (!lexer->eof(lexer) && lexer->lookahead != '\n') {
      lexer->advance(lexer, false);
    }
    *last_was_whitespace = true;
    return true;
  } else if (lexer->lookahead == '{') {
    lexer->advance(lexer, false);
    while (!lexer->eof(lexer) && lexer->lookahead != '}') {
      lexer->advance(lexer, false);
    }
    if (lexer->lookahead == '}') {
      lexer->advance(lexer, false);
    }
    *last_was_whitespace = true;
    return true;
  }

  return false;
}

static bool handle_quotes(TSLexer *lexer, bool *in_s_quote, bool *in_d_quote,
                          bool *last_was_whitespace) {
  if (lexer->lookahead == '\'') {
    if (!*in_d_quote)
      *in_s_quote = !*in_s_quote;
    *last_was_whitespace = false;
    lexer->advance(lexer, false);
    return true;
  }
  if (lexer->lookahead == '"') {
    if (!*in_s_quote)
      *in_d_quote = !*in_d_quote;
    *last_was_whitespace = false;
    lexer->advance(lexer, false);
    return true;
  }
  return false;
}

// 判定是否为 BDL 语句块关键字（即 end 之后如果出现这些，则发生截断）
static bool is_bdl_block_keyword(const char *word) {
  // 涵盖 "case, if, function 等任何关键字"
  if (strcmp(word, "FUNCTION") == 0)
    return true;
  return match_single_terminator(word);
}

// 定义用于追踪嵌套深度的栈最大容量与栈帧结构
#define MAX_CASE_DEPTH 128
typedef struct {
  int depth; // 深度
  // Tree-sitter 没有自由设定偏移的方法，其物理位置的回退依靠控制 mark_end
  // 的调用时机实现。
} CaseFrame;

bool tree_sitter_bdl_external_scanner_scan(void *payload, TSLexer *lexer,
                                           const bool *valid_symbols) {
  if (valid_symbols[ERROR_SENTINEL])
    return false;

  if (!valid_symbols[SQL_BODY])
    return false;

  while (iswspace(lexer->lookahead))
    lexer->advance(lexer, true);

  lexer->mark_end(lexer);

  int paren_depth = 0;

  // 初始化栈结构以维护每层 CASE 的深度，满足空间 O(k) 要求
  CaseFrame case_stack[MAX_CASE_DEPTH];
  int case_top = 0;

  bool in_s_quote = false;
  bool in_d_quote = false;
  bool last_was_whitespace = true;
  bool pending_case_end = false;

  while (!lexer->eof(lexer)) {
    // 只有在非嵌套（包含 CASE 的非嵌套）时才更新物理游标。
    // 这保证了在进入 CASE 层级后，最后一次的安全点永远停留在 CASE 开始之前。
    if (!in_s_quote && !in_d_quote && paren_depth == 0 && case_top == 0) {
      lexer->mark_end(lexer);
    }

    if (skip_whitespace_and_comments(lexer, &last_was_whitespace, in_s_quote,
                                     in_d_quote)) {
      continue;
    }

    // --- 优先处理处于 Pending 状态的 END ---
    if (pending_case_end) {
      if (is_word_char(lexer->lookahead)) {
        bool can_be_terminator = last_was_whitespace;
        char word1[64];
        scan_word(lexer, word1);
        last_was_whitespace = false;

        if (is_bdl_block_keyword(word1)) {
          // 【核心逻辑】：遇到 END <CASE/IF/FUNCTION 等>。
          // 立即终止，不调用 mark_end，直接返回。
          // Tree-sitter 强制截断到最外层 CASE 前的历史记录点 (exclusive)。
          lexer->result_symbol = SQL_BODY;
          return true;
        }

        // 遇到普通 END，其后接的是非块状关键字（例如 FROM, WHERE），属于合法
        // SQL CASE。
        pending_case_end = false;
        if (case_top > 0)
          case_top--; // 闭合当前层栈顶，恢复正常层级

        // 继续对刚扫到的 word1 正常入栈与判定检查
        if (strcmp(word1, "CASE") == 0) {
          if (case_top < MAX_CASE_DEPTH) {
            case_stack[case_top].depth = case_top + 1;
            case_top++;
          }
        } else if (strcmp(word1, "END") == 0 && case_top > 0) {
          pending_case_end = true;
        }

        if (can_be_terminator && paren_depth == 0 && case_top == 0 &&
            !pending_case_end) {
          if (match_terminator(lexer, word1)) {
            lexer->result_symbol = SQL_BODY;
            return true;
          }
        }
        continue; // 此词已走完判断，跳入下个循环
      } else {
        // END 后接非字母词（例如逗号，括号等），认定为合法 SQL CASE。
        pending_case_end = false;
        if (case_top > 0)
          case_top--;
      }
    }

    if (handle_quotes(lexer, &in_s_quote, &in_d_quote, &last_was_whitespace)) {
      continue;
    }

    if (!in_s_quote && !in_d_quote) {
      if (handle_parens(lexer, &paren_depth, &last_was_whitespace)) {
        continue;
      }

      if (is_word_char(lexer->lookahead)) {
        bool can_be_terminator = last_was_whitespace;
        char word1[64];
        scan_word(lexer, word1);
        last_was_whitespace = false;

        // --- 追踪 CASE 层级 ---
        if (strcmp(word1, "CASE") == 0) {
          if (case_top < MAX_CASE_DEPTH) {
            case_stack[case_top].depth = case_top + 1; // 新 case 入栈，记录深度
            case_top++;
          }
        } else if (strcmp(word1, "END") == 0 && case_top > 0) {
          // 只打标记，延后到下一个非空 token 判明真身
          pending_case_end = true;
        }

        // --- 常规 SQL_BODY 终止符判定 ---
        if (can_be_terminator && paren_depth == 0 && case_top == 0 &&
            !pending_case_end) {
          if (match_terminator(lexer, word1)) {
            lexer->result_symbol = SQL_BODY;
            return true;
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

void *tree_sitter_bdl_external_scanner_create() { return NULL; }
void tree_sitter_bdl_external_scanner_destroy(void *p) {}
unsigned tree_sitter_bdl_external_scanner_serialize(void *p, char *b) {
  return 0;
}
void tree_sitter_bdl_external_scanner_deserialize(void *p, const char *b,
                                                  unsigned n) {}
