# tree-sitter-bdl 待办与待确认清单

> 维护于 2026-10-16（`refactor/grammar`，提交 a00b1e8）
> 全量基线：topprod 7699 个 `.4gl` → pass 7666 / fail 33 / ERROR 3009 / MISSING 4
> 验证方式：`tree-sitter test`（corpus 118/118）+ `bdl-lint/validate100.sh`（100/100）

## A. 待办（用户已确认语法合法，暂不实现）

| 项 | 示例 | 出现处 | 说明 |
|---|---|---|---|
| `GET_FLDBUF(<界面字段名>)` | `LET ps_value = GET_FLDBUF(count)` | asft700_tch3.4gl:483、asft700_tch4.4gl:580 | 参数是**界面字段名**（非字符串/普通表达式），需特殊处理 |
| `SET EXPLAIN ON` | `SET EXPLAIN ON` | cl_ui_init.4gl:243 | 特殊 SQL 语法 |
| `INTERVAL` 带精度 | `DEFINE l_vnd11 INTERVAL SECOND(5) TO SECOND` | apsi311.4gl:78、apsp500.4gl:307、cimi995.4gl:269（`DAY(5) TO MINUTE`） | 类型限定符 `qual(scale) TO qual` |
| `java.lang.X.method()` | `java.lang.Byte.valueOf(l_digest.digest()[l_i])` | salmi621.4gl:556、apci060.4gl:2050 | 非限定 java 类调用，结果为 java 数组，再取元素 |
| `UPDATE STATISTICS` | `UPDATE STATISTICS FOR TABLE sta_file` | asdp010.4gl:103 | 合法 SQL，边界处理 |

## B. 待用户确认（已提供证据）

| 项 | 位置 | 证据 / 判断 |
|---|---|---|
| **孤立 `END IF`** | cxcq761.4gl:287 | L280 的 `IF ... THEN NEXT FIELD type END IF` 已内联闭合、L284 的 `IF` 在 L286 闭合；L287 的 `END IF` **无对应 IF** → 疑为源文件多余语句 |
| **`DISPLAY ARRAY x TO s.*(COUNT=…,UNBUFFERED)`** | csft511.4gl:1917 | ERROR 落在 `.`(col40) 与 `COUNT`(col47-51)；`TO rec.*` 后紧跟 `(属性表)` 未被支持 |
| **`CASE…END CASE` / `END IF` 作 SQL 表达式** | cws_get_start_works.4gl:215、sapmt720_sub.4gl:7892 | 二者都在 `SELECT <列表> … INTO` 内：前者以 `... END CASE`（SQL 应为 `END`）、后者以 `... END IF` 结尾；扫描器把 `END <块关键字>` 判为 sql_body 终止符 |
| **safi501 `END INPUT`** | INPUT 头 **L7850**，`END INPUT` **L11832** | ⚠️ 非文件错误：树中 `menu` 节点从 **L10806 行尾**起误吞至 L11831（首个子节点是 L10808 `AFTER FIELD sfs930` 被当作 MENU 分支），导致 input 节点延到 L12108、`END INPUT` 失去配对。属 **INPUT 分支 与 MENU 分支的 GLR 歧义**。次生错误 L11918-11919 |
| **`DECLARE … CURSOR FROM SELECT …`** | sghri056.4gl:194、197 | 手册仅定义 `DECLARE cid CURSOR FROM expr`（expr 为 SQL 字符串）；此处 `FROM` 后直接跟 `SELECT` 语句，疑应为 `FOR`。仅此 1 文件 2 处 |

## C. 文件首 `#`/BOM 整文件级 ERROR（请重新确认）

| 文件 | 行数 | 现象 |
|---|---|---|
| `tiptop/ghr/4gl/ghri0431.4gl` | 595 | 整文件一个 ERROR；文件**在 L595 `IF l_n !=0 THEN` 处截断**（未闭合） |
| `tiptop/ghr/4gl/ghri0471.4gl` | — | 文件仅 **3 字节** `e9 94 98`（U+9518 `锘`，BOM 乱码残留），无换行 |
| `tiptop/apm/4gl/sapmt540 (3).4gl` | 19814 | 整文件 ERROR；内部错误点 L19669 `IF g_pmm.pmm18!='Y' THEN` / L19671 `END IF` |
| `topcust/cxm/4gl/saxmt400.4gl` | 2399 | 整文件 ERROR，无内部 ERROR/MISSING 节点 |

## D. 已忽略（用户裁定）

- `csfi510.4gl:4151` —— L4150 行尾续接逗号被同行 `--` 行注释吞掉，属文件错误。
- `TX_asfi301_1/2/3.4gl` —— 异常文件。
- `ON ACTION <中文动作名>`（p_formulaedit / p_textedit）——**应报错**，不合法语法。
- `&&`（cs_restful.4gl:37）—— 文件错误。
- `DEFINE x LIKE STRING`（aglr100_test.4gl:597）—— 文件错误。
- `csfq012.4gl:23` —— `sum_3 LIKE img_file.img10` 行末缺逗号，文件错误。

## E. 本轮已修复（提交 c66cde8 / a00b1e8）

`SET LOCK MODE TO WAIT`（秒数可选）、`PUT … FROM` 接受字面值、`INTO rec.a THRU rec.z`、
`TRUNCATE TABLE/TRUNCATE x`、`HIDE/SHOW OPTION`、`EXTEND(dt, qual TO qual)`、
扫描器 U+3000 视为空白、`INITIALIZE … LIKE t.c1,t.c2`、`RECORD LIKE t.col`、
`WITH FORM` / `OPEN FORM FROM` 接受表达式。
