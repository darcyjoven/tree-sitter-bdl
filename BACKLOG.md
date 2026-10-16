# tree-sitter-bdl 待办与待确认清单

> 维护于 2026-10-16（`refactor/grammar`，提交 4ecc884）
> 全量基线：topprod 7699 个 `.4gl` → pass 7671 / fail 28 / ERROR 2980 / MISSING 4
> 验证方式：`tree-sitter test`（corpus 121/121）+ `bdl-lint/validate100.sh`（100/100）

## A. 待办（用户已确认语法合法，暂不实现）

| 项 | 示例 | 出现处 | 说明 |
|---|---|---|---|
| `CASE … END CASE` / `END IF` 作 SQL 表达式 | `SELECT …,CASE ta_ecd03 WHEN 'N' THEN 1 ELSE sfbud10 END CASE … INTO` | cws_get_start_works.4gl:215、sapmt720_sub.4gl:7892 | 二者都在 `SELECT <列表> … INTO` 内。扫描器把 `END <块关键字>` 判为 sql_body 终止符，需能识别 SQL 内的 `END CASE` |
| `SET EXPLAIN ON` | `SET EXPLAIN ON` | cl_ui_init.4gl:243 | 特殊 SQL 语法 |
| `INTERVAL` 带精度 | `DEFINE l_vnd11 INTERVAL SECOND(5) TO SECOND` | apsi311.4gl:78、apsp500.4gl:307、cimi995.4gl:269（`DAY(5) TO MINUTE`） | 类型限定符 `qual(scale) TO qual` |
| `java.lang.X.method()` | `java.lang.Byte.valueOf(l_digest.digest()[l_i])` | salmi621.4gl:556、apci060.4gl:2050 | 非限定 java 类调用，结果为 java 数组，再取元素 |
| `UPDATE STATISTICS` | `UPDATE STATISTICS FOR TABLE sta_file` | asdp010.4gl:103 | 合法 SQL，边界处理 |

> `GET_FLDBUF(<字段名>)` 原为待办项，现已**自然解决**：它此前失败的唯一原因是参数
> `count` 被 `kw("COUNT")` 抢成关键字；关键字让位修复后 asft700_tch3/tch4 已通过。

## B. 待用户确认

| 项 | 位置 | 证据 / 判断 |
|---|---|---|
| 文件首 `#`/BOM 整文件级 ERROR（4 文件） | ghri0431.4gl、ghri0471.4gl、sapmt540 (3).4gl、saxmt400.4gl | 真实成因：ghri0431 在 **L595 `IF l_n !=0 THEN` 处截断**；ghri0471 **仅 3 字节** `e9 94 98`（U+9518 `锘`）；sapmt540(3) **L19666 `END RECORD,` 尾逗号多余**（其后直接是 `IF`）；saxmt400 **在 L2399 截断** |
| safi501 残余 4 错 | safi501.4gl:15536 | 补掉缺失的 `END IF` 后仅剩 `WHEN (l_action_flag = "page_list")` 分支体里的 `EXIT DISPLAY` 报错 |

## C. 已忽略（用户裁定为文件错误 / 非法语法）

- **孤立 `END IF`** — cxcq761.4gl:287。L280 的 IF 已内联闭合、L284 的 IF 在 L286 闭合，L287 的 `END IF` 无对应 IF。
- **`DISPLAY ARRAY x TO s.*(COUNT=…,UNBUFFERED)`** — csft511.4gl:1917。判为文件错误。
- **多行字符串赋值缺逗号** — baofei.4gl:3163、findidx.4gl:90。
- **ghrr104 `CLIPPED` 拼接** — ghrr104.4gl。**无需语法改动**：`CLIPPED` 的优先级(`PREC.ascii=1`)本就高于逗号拼接(`-1`)，探针 `" where ",tm.wc CLIPPED," and …` 通过。真实成因是 **L458 行尾缺逗号**（`" inner join hrao_file e on e.hrat04=e.hrao01"` 后面没有 `,`），实测补上逗号后该文件 0 错误。
- **safi501.4gl 554 错** — **文件错误：缺一个 `END IF`**。`AFTER FIELD sfs32` 分支内 **L10731 `IF g_sfp.sfp06 MATCHES '[13]' THEN` 未闭合**（IF/END IF 计数 13/13，但其中 L10731 无配对）。在 L10807 后补一个 `END IF` 即从 554 错降到 4 错。树中 `menu [L10806..L11831]` 与 `MISSING "MENU"` 均为 tree-sitter 的**恢复伪影**，非 INPUT/MENU 分支歧义。
- `csfi510.4gl:4151` —— L4150 行尾续接逗号被同行 `--` 行注释吞掉。
- `TX_asfi301_1/2/3.4gl` —— 异常文件。
- `ON ACTION <中文动作名>`（p_formulaedit / p_textedit）—— 应报错，不合法语法。
- `&&`（cs_restful.4gl:37）—— 文件错误。
- `DEFINE x LIKE STRING`（aglr100_test.4gl:597）—— 文件错误。
- `csfq012.4gl:23` —— `sum_3 LIKE img_file.img10` 行末缺逗号。

## D. 本轮已修复（4ecc884）

- 关键字词可作变量名（`DEFINE count,index …`、`IF count > 36`、`FOR index = 1 TO count`）：
  `report_aggregate` 的聚合名改由 `identifier` 承接。
  **关键结论：`kw()` 生成的是单模式 token，其 `prec` 不生效**，无法用低优先级让位给标识符；
  必须让该关键字**在表达式位置不再是候选 token**。
- `DISPLAY BY NAME a THRU z` 字段范围（新增 `_field_range`）。
- `DECLARE c CURSOR FROM <静态SQL>`（动态 SQL 串仍只能用 `FROM`）。

## E. 更早已修复

`SET LOCK MODE TO WAIT`（秒数可选）、`PUT … FROM` 接受字面值、`INTO rec.a THRU rec.z`、
`TRUNCATE TABLE/TRUNCATE x`、`HIDE/SHOW OPTION`、`EXTEND(dt, qual TO qual)`、
扫描器 U+3000 视为空白、`INITIALIZE … LIKE t.c1,t.c2`、`RECORD LIKE t.col`、
`WITH FORM` / `OPEN FORM FROM` 接受表达式。