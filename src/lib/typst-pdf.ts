/**
 * Typst PDF 编译工具：把 AI 生成的 Typst 源码编译为 PDF 并触发下载。
 *
 * 设计要点：
 * - 浏览器 WASM 编译：用 @myriaddreamin/typst.ts，懒加载（用户点按钮才下载 WASM）
 * - 容错：如果 AI 返回的不是合法 Typst（看起来像 markdown），自动包一层 Typst 模板再编译
 * - 模板内置封面 / 页眉 / 页码，保证产出"漂亮"
 */

interface TypstSnippetApi {
  pdf: (opts: { mainContent: string }) => Promise<Uint8Array>;
  svg: (opts: { mainContent: string }) => Promise<string>;
}

let cachedApi: TypstSnippetApi | null = null;

async function loadTypstApi(): Promise<TypstSnippetApi> {
  if (cachedApi) return cachedApi;
  // 动态 import：首次点击时才加载 WASM。
  const mod: any = await import(
    /* @vite-ignore */
    "@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs"
  );
  cachedApi = mod.$typst as TypstSnippetApi;
  return cachedApi;
}

/**
 * 启发式：判断 AI 返回的是 Typst 源码还是 markdown。
 * Typst 源码常见特征：以 `#set` / `#import` / `#show` 开头，或包含 `#text(`、`#page(` 等指令。
 */
export function looksLikeTypst(content: string): boolean {
  const sample = content.slice(0, 800);
  if (/^\s*#(set|import|show|let)\s/m.test(sample)) return true;
  if (/#(page|text|heading|outline|stack|grid|figure|columns)\s*\(/.test(sample))
    return true;
  return false;
}

/**
 * 包一层模板，把 markdown 内容塞进去。
 * 用 cmarker 包是不行的（typst.ts 默认不带 packages），所以我们手动转换最常见的 markdown 元素。
 *
 * 简化转换规则：
 *   # H1   → = H1
 *   ## H2  → == H2
 *   ### H3 → === H3
 *   - / *  → -（保留）
 *   **bold** → *bold*
 *   *italic* → _italic_
 *   `code`   → `code`（Typst 也支持反引号）
 *   ```lang...```  → ```lang ... ```（Typst 也支持，简化保留）
 *   表格    → 用纯文本保留（Typst 表格语法复杂，第一版降级）
 */
function markdownToTypstBody(md: string): string {
  let s = md;
  // 标题：# / ## / ### → = / == / ===
  s = s.replace(/^(#{1,6})\s+(.+?)\s*#*\s*$/gm, (_, hashes: string, title: string) => {
    const level = hashes.length;
    return `${"=".repeat(level)} ${title}`;
  });
  // **bold** -> *bold*
  s = s.replace(/\*\*([^*\n]+)\*\*/g, "*$1*");
  // 列表保留 - / *
  // 段落保留（双换行）
  return s;
}

/** 转义 Typst 字符串字面量里的特殊字符（做 raw 嵌入时用）*/
function escapeTypstStr(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

interface PdfOptions {
  /** AI 返回的原始内容（可能是 Typst 也可能是 markdown）*/
  content: string;
  /** PDF 元数据 */
  meta: {
    title: string;
    projectName: string;
    snapshotId: number;
    mode: string;
    provider: string;
    model: string;
    generatedAt: string;
    summary?: string;
    suggestions?: string[];
  };
}

/** 包装一个统一的 Typst 文档：封面 + 页眉/页码 + 内容 */
export function wrapTypstDocument({ content, meta }: PdfOptions): string {
  const looksTypst = looksLikeTypst(content);
  // 文档头：通用样式（页眉/页码/字体）
  const preamble = `
#set page(
  paper: "a4",
  margin: (top: 2.4cm, bottom: 2.2cm, left: 2cm, right: 2cm),
  header: locate(loc => {
    if loc.page() > 1 {
      set text(size: 9pt, fill: rgb(120, 120, 130))
      grid(columns: (1fr, auto),
        align: (left, right),
        [#text(weight: "medium")[#"${escapeTypstStr(meta.projectName)}"] · ${escapeTypstStr(meta.title)}],
        [snapshot ##${meta.snapshotId} · ${escapeTypstStr(meta.mode)}]
      )
      v(-0.4em)
      line(length: 100%, stroke: 0.4pt + rgb(220, 220, 225))
    }
  }),
  footer: locate(loc => {
    set text(size: 9pt, fill: rgb(140, 140, 150))
    align(center)[#counter(page).display("1 / 1", both: true)]
  }),
)

#set text(
  font: ("Times New Roman", "Songti SC", "SimSun", "Source Han Serif SC", "Noto Serif CJK SC"),
  size: 10.5pt,
  lang: "zh"
)

#set heading(numbering: "1.1")

#show heading.where(level: 1): it => {
  v(0.6em)
  set text(size: 18pt, weight: "bold", fill: rgb(56, 70, 130))
  it
  v(0.2em)
}

#show heading.where(level: 2): it => {
  v(0.4em)
  set text(size: 14pt, weight: "bold", fill: rgb(80, 80, 100))
  it
}

#show heading.where(level: 3): it => {
  set text(size: 12pt, weight: "bold")
  it
}

#show raw.where(block: true): it => {
  block(
    fill: rgb(245, 246, 250),
    inset: 10pt,
    radius: 4pt,
    stroke: 0.5pt + rgb(220, 222, 230),
    width: 100%,
    text(size: 9pt, font: ("Menlo", "Consolas", "JetBrains Mono", "Source Han Mono SC"), it)
  )
}

#show link: it => text(fill: rgb(56, 70, 180), it)
`.trim();

  // 封面
  const cover = `
#page(margin: 0pt, header: none, footer: none)[
  #set page(fill: gradient.linear(
    rgb(245, 244, 255),
    rgb(232, 240, 255),
    angle: 135deg
  ))
  #set text(font: "Times New Roman", lang: "zh")
  #v(20%)
  #align(center)[
    #block(
      fill: white,
      inset: (x: 32pt, y: 28pt),
      radius: 12pt,
      stroke: 0.6pt + rgb(220, 220, 230),
    )[
      #text(size: 12pt, fill: rgb(120, 120, 140), tracking: 2pt)[
        METRISCOPE · AI QUALITY REPORT
      ]
      #v(8pt)
      #text(size: 26pt, weight: "bold", fill: rgb(40, 50, 100))[
        ${escapeTypstStr(meta.title)}
      ]
      #v(6pt)
      #text(size: 14pt, fill: rgb(80, 80, 100))[
        ${escapeTypstStr(meta.projectName)}
      ]
      #v(20pt)
      #grid(
        columns: (auto, auto),
        gutter: 12pt,
        align: (right, left),
        text(size: 10pt, fill: rgb(150, 150, 160))[模式], text(size: 10pt)[#raw("${escapeTypstStr(meta.mode)}")],
        text(size: 10pt, fill: rgb(150, 150, 160))[快照], text(size: 10pt)[\\##${meta.snapshotId}],
        text(size: 10pt, fill: rgb(150, 150, 160))[模型], text(size: 10pt)[#raw("${escapeTypstStr(meta.provider)} · ${escapeTypstStr(meta.model)}")],
        text(size: 10pt, fill: rgb(150, 150, 160))[生成时间], text(size: 10pt)[${escapeTypstStr(formatDate(meta.generatedAt))}],
      )
    ]
  ]
  #v(1fr)
  #align(center)[
    #text(size: 9pt, fill: rgb(160, 160, 170))[
      由 MetriScope 软件度量平台 + AI Agent 自动生成 · 答辩展示用
    ]
  ]
]
#pagebreak()
`.trim();

  // 摘要 + 建议块（如果有）
  const summaryBlock = meta.summary
    ? `
#block(
  fill: rgb(248, 250, 255),
  stroke: 0.5pt + rgb(200, 215, 240),
  radius: 6pt,
  inset: 12pt,
  width: 100%,
)[
  #text(size: 9pt, fill: rgb(120, 120, 140), tracking: 1pt)[摘要]
  #v(4pt)
  #text(size: 11pt)[${escapeTypstStr(meta.summary)}]
]
#v(0.6em)
`.trim()
    : "";

  const suggestionsBlock =
    meta.suggestions && meta.suggestions.length > 0
      ? `
#heading(level: 2)[改进建议]
${meta.suggestions
  .map(
    (s, i) => `+ ${escapeTypstSuggestion(s)}`,
  )
  .join("\n")}
`.trim()
      : "";

  // 主体
  const body = looksTypst ? content : markdownToTypstBody(content);
  // 目录
  const outline = `#outline(title: "目录", indent: auto, depth: 3)\n#pagebreak()`;

  return [preamble, cover, outline, summaryBlock, body, "", suggestionsBlock].join("\n\n");
}

function escapeTypstSuggestion(s: string): string {
  // 列表项里 # 等需要保留为字面，简单 escape
  return s.replace(/\*/g, "\\*").replace(/_/g, "\\_");
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return iso;
  }
}

/**
 * 编译 Typst 源码为 PDF Uint8Array。
 * 失败时抛 Error，调用方处理。
 */
export async function compileTypstToPdf(typstSource: string): Promise<Uint8Array> {
  const api = await loadTypstApi();
  return await api.pdf({ mainContent: typstSource });
}

/**
 * 一站式：包装 → 编译 → 触发下载。
 * @returns 编译后的 Typst 源码（用于"复制源码"按钮）
 */
export async function generateAndDownloadPdf(opts: PdfOptions): Promise<{
  typstSource: string;
  filename: string;
}> {
  const typstSource = wrapTypstDocument(opts);
  const pdfBytes = await compileTypstToPdf(typstSource);
  const safeName = opts.meta.projectName.replace(/[^\w一-龥-]/g, "_");
  const filename = `${safeName}_AI_Report_snapshot${opts.meta.snapshotId}_${opts.meta.mode}.pdf`;
  triggerDownload(pdfBytes, filename);
  return { typstSource, filename };
}

function triggerDownload(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
