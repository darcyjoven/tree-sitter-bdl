package tree_sitter_bdl_test

import (
	"os"
	"path/filepath"
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_bdl "github.com/darcyjoven/tree-sitter-bdl/bindings/go"
)

// TestCanLoadGrammar 校验 grammar 能被 v0.25 绑定加载，且 ABI 至少为 15。
//
// go-tree-sitter v0.24 只支持到 ABI 14，加载 ABI 15 的 parser.c 会直接报
// "Incompatible language version 15"；这条断言用来防止有人把依赖降回去。
func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_bdl.Language())
	if language == nil {
		t.Fatal("加载 Genero BDL grammar 失败")
	}
	if abi := language.AbiVersion(); abi < 15 {
		t.Fatalf("ABI = %d，期望 >= 15（go-tree-sitter 需 v0.25.0）", abi)
	}
	if n := language.NodeKindCount(); n == 0 {
		t.Fatal("grammar 没有节点类型，Language() 可能返回了错误指针")
	}
}

// TestParsesRealFile 用真实 .4gl 文件跑完整解析，确认绑定和 grammar 一起工作。
//
// 只检查错误：ABI 不兼容时 Parse 会返回整棵 ERROR 树（或空树），
// 仅断言 "language != nil" 抓不到。
func TestParsesRealFile(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_bdl.Language())
	if language == nil {
		t.Fatal("加载 Genero BDL grammar 失败")
	}

	source, err := os.ReadFile(filepath.Join("testdata", "sample.4gl"))
	if err != nil {
		t.Fatalf("读取测试文件失败: %v", err)
	}

	parser := tree_sitter.NewParser()
	defer parser.Close()
	if err := parser.SetLanguage(language); err != nil {
		t.Fatalf("SetLanguage 失败: %v", err)
	}

	tree := parser.Parse(source, nil)
	if tree == nil {
		t.Fatal("Parse 返回 nil（grammar 与运行时 ABI 不兼容？）")
	}
	defer tree.Close()

	root := tree.RootNode()
	if root == nil {
		t.Fatal("语法树没有根节点")
	}
	if root.HasError() {
		t.Fatalf("解析 testdata/sample.4gl 出现错误节点:\n%s", root.ToSexp())
	}
	if root.NamedChildCount() == 0 {
		t.Fatalf("语法树没有任何命名子节点:\n%s", root.ToSexp())
	}
}
