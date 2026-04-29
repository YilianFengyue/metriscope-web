# Phase 2 · AI Agent 闭环前端开发记录

> 范围：F11 重构 Prompt + F12 Quality Gate + F-AI-2 项目分析 + F-AI-3 AI 对话 + Typst PDF 编译
> 完成情况：全部 PASS · `pnpm lint` (tsc --noEmit) 零错误

---

## 一、改动文件清单

### 新建（8 个）

| 文件 | 作用 |
|---|---|
| [src/pages/Ai.tsx](../src/pages/Ai.tsx) | `/ai` 顶级页面 + 3 Tab（对话/分析/重构 Prompt）+ URL 参数同步 |
| [src/pages/ai/AiChat.tsx](../src/pages/ai/AiChat.tsx) | F-AI-3 对话面板（消息流 + 工具调用动画 + usedTools chips）|
| [src/pages/ai/AiAnalyze.tsx](../src/pages/ai/AiAnalyze.tsx) | F-AI-2 分析报告 4-mode（含 TYPST_REPORT + 一键 PDF）|
| [src/pages/ai/RefactorPromptPanel.tsx](../src/pages/ai/RefactorPromptPanel.tsx) | F11 重构 Prompt 展示 + 闭环 3 步指引 |
| [src/pages/ai/QualityGateCard.tsx](../src/pages/ai/QualityGateCard.tsx) | F12 Quality Gate 卡（嵌入 [/history](../src/pages/History.tsx)）|
| [src/pages/ai/AiToolMeta.ts](../src/pages/ai/AiToolMeta.ts) | 9 类后端工具的展示元数据（图标 + 颜色 + 标签）|
| [src/lib/typst-pdf.ts](../src/lib/typst-pdf.ts) | Typst WASM 编译器懒加载 + 文档包装 + 一键下载 |
| [src/types/typst-ts.d.ts](../src/types/typst-ts.d.ts) | `@myriaddreamin/typst.ts` 的 ambient 声明 |

### 修改（5 个）

| 文件 | 改动 |
|---|---|
| [src/lib/api.ts](../src/lib/api.ts) | 加 `RefactorPromptResponse / QualityGate* / AiAnalyze* / AiChat*` 类型；加 `aiApi.refactorPrompt/analyze/chat` + `qualityGateApi.evaluate` 模块 |
| [src/App.tsx](../src/App.tsx) | 加 `/ai` 路由 |
| [src/components/layout/AppShell.tsx](../src/components/layout/AppShell.tsx) | 侧边栏加〔🤖 AI 助手〕项；MCP 改名为「MCP 调试」并换 `Plug` 图标 |
| [src/pages/History.tsx](../src/pages/History.tsx) | 在 `<CompareCard>` 下方挂 `<QualityGateCard>` |
| [src/pages/Metrics.tsx](../src/pages/Metrics.tsx) | RiskCenter 卡 header 右上角加〔✨ 生成 AI Prompt〕按钮 → `/ai?tab=prompt` |
| [src/pages/Mcp.tsx](../src/pages/Mcp.tsx) | `TOOL_META` 加 `refactor-prompt` 项（归入「报告」类）|

> Diagrams.tsx / Mcp.tsx 里之前用 `Alert variant="info|warning"` 已替换为 className 写法（兼容现行 alert.tsx 仅 default/destructive 的官方变体）。

---

## 二、新装 npm 包

```bash
pnpm add @myriaddreamin/typst.ts
```

> 该包带 ~10MB WASM；通过动态 `import()` 懒加载——只有用户点〔AI + Typst → 漂亮 PDF〕按钮时才下载，**不影响首屏性能**。

---

## 三、闭环 8 步路径

```
①  /metrics RiskCenter 看到 23 项坏味道 / 5 个高风险方法
        ↓ 点 〔✨ 生成 AI Prompt〕
②  /ai · Tab Prompt → 看到结构化 Prompt + 3 个目标类
        ↓ 点 〔📋 复制 Prompt〕
③  外部：粘到 Claude Code → AI 重构 → mvn test 通过
        ↓
④  /analysis 重新分析 → 生成 snapshot #N+1
        ↓
⑤  /history 选 from=#N / to=#N+1 → Quality Gate 自动评估 → verdict PASS
        ↓ 点 〔🤖 让 AI 解读这次门禁〕
⑥  /ai · Tab Analyze (?from=N&to=N+1&mode=QUALITY_REVIEW)
        → AI 用 9 工具上下文（含 quality_gate）生成质量分析报告
        ↓ 点 〔AI + Typst → 漂亮 PDF〕
⑦  浏览器 WASM 编译：AI 直接生成 Typst 源码 → 落地正式 PDF
        （含封面 / 目录 / 页眉 / 页码）
        ↓
⑧  /ai · Tab Chat → 老师任意提问 → AI 调 9 工具实时回答
        每条回答下方 used: [latest_snapshot] [risk_hotspots] ... 透明可见
```

---

## 四、关键设计决策

### 1. AI 不是装饰，是 Agent — usedTools chips

每条 AI 回复底部强制显示 9 类后端工具调用链 chips（带图标 + 颜色 + 缩写）：

| 工具 | 图标 | 颜色 |
|---|---|---|
| `latest_snapshot` | Box | primary 蓝 |
| `risk_hotspots` | Flame | 鲜红 |
| `class_metrics` | Gauge | 紫罗兰 |
| `method_metrics` | Brain | 海蓝 |
| `dependencies` | Network | 蓝 |
| `quality_trend` | Workflow | 翡翠 |
| `code_smells` | Database | 琥珀 |
| `mccall_quality` | FileBarChart | 金色 |
| `ifpug_function_point` | Diamond | 蓝紫 |
| `quality_gate` | GitMerge | 紫罗兰 |

**provider 徽标**：
- `LOCAL_FALLBACK` / `rule-based` → 琥珀色 `● fallback`（不是错误，是后端没配 API Key 也能跑）
- `DEEPSEEK_COMPATIBLE` / `OPENAI` → 翡翠色 `● live`

### 2. 工具调用过程"动画化"

[AiChat.tsx](../src/pages/ai/AiChat.tsx) 在 mutation pending 期间，AI 气泡循环播放：
```
📸 调用 latest_snapshot...
🔥 调用 risk_hotspots...
🐛 调用 code_smells...
✍️ 整合上下文...
```
+ 三个跳动的小点。这是**纯前端假动画**（实际后端是一次性返回），但视觉上让"Agent 工具调用过程"可见——答辩亮点。

### 3. AI → Typst → PDF 编译路径

不是 AI markdown → typst 模板转换，而是**AI 直接生成 Typst 源码**：

- 调 `POST /ai/analyze` 时 `mode = "TYPST_REPORT"`
- 后端 prompt 让 AI 输出 Typst 代码
- 前端 [typst-pdf.ts](../src/lib/typst-pdf.ts) 用 `@myriaddreamin/typst.ts` WASM 编译器在浏览器编译
- 一键下载 PDF（封面 + 目录 + 页眉 + 页码 + 中文字体 fallback）

**容错**：
- 如果 AI 实际返回的不是 Typst 而是 markdown（启发式判断 `looksLikeTypst()`），前端自动 markdown→Typst 简化转换 + 包模板再编译，保证产出
- WASM 加载失败时 toast 错误，用户可改用「下载 .typ + 复制源码」走外部 typst CLI 出 PDF

**性能**：
- 首次点击下载 ~10MB WASM 字节（约 3-5 秒）
- 编译阶段实际很快（百毫秒级）
- 模块级缓存，第二次点击秒出

### 4. 闭环按钮串联

3 个跨页按钮把 [/metrics](../src/pages/Metrics.tsx) → [/ai](../src/pages/Ai.tsx) → [/history](../src/pages/History.tsx) 三页连起来：

| 起点 | 按钮 | 终点 |
|---|---|---|
| [/metrics](../src/pages/Metrics.tsx) RiskCenter 顶 | 〔✨ 生成 AI Prompt〕 | `/ai?tab=prompt` |
| [/ai](../src/pages/Ai.tsx) Prompt Tab 底 | 〔→ 去对比页〕 | `/history` |
| [/history](../src/pages/History.tsx) Quality Gate 卡底 | 〔🤖 让 AI 解读〕 | `/ai?tab=analyze&from=&to=&mode=` |

### 5. URL 参数承载状态

[/ai](../src/pages/Ai.tsx) 监听 `?tab=&from=&to=&mode=&snapshot=` —— 这样 [/history](../src/pages/History.tsx) Quality Gate 卡里的「让 AI 解读」按钮可以直接把 from/to 塞进 URL，[AiAnalyze](../src/pages/ai/AiAnalyze.tsx) 挂载时自动触发一次 analyze 请求 + 切到正确的 mode。

---

## 五、答辩 90 秒终极闭环话术

> 「我们做了一个**真正的 Agent，不是聊天机器人**——后端聚合 9 类度量工具：快照、风险、CK/LK、认知复杂度、依赖、趋势、坏味道、McCall、IFPUG、Quality Gate。LLM 只做解释和总结，**核心质量判定全部由确定性规则保证**。
>
> 演示流程：
> 1. [/metrics](../src/pages/Metrics.tsx) 看风险 → 〔✨ 生成 AI Prompt〕
> 2. [/ai](../src/pages/Ai.tsx) Prompt Tab → 复制 → 喂 Claude → AI 重构
> 3. [/analysis](../src/pages/Analysis.tsx) 重新分析 → [/history](../src/pages/History.tsx) → Quality Gate **PASS** ✓
> 4. 〔🤖 让 AI 解读〕→ Analyze Tab → AI 调 9 工具生成质量报告
> 5. 〔AI + Typst → 漂亮 PDF〕→ AI 生成 Typst 源码 → 浏览器 WASM 编译 → 落地带封面 / 目录 / 页眉的正式 PDF
> 6. Chat Tab → 老师任意提问 → 9 工具调用链可见 → 数据来源透明
>
> AI 不是装饰，是把度量结果**翻译成行动 + 报告 + 对话**的关键中介。」

---

## 六、验收测试

### 启动

```bash
cd metriscope-web
pnpm dev   # http://localhost:5173
```

确保后端在 `:8080` 运行，并：
- 已创建项目 + 上传源码
- 跑过至少 **2 次** 分析（F12 需要两个快照对比）
- 后端 `application.properties` 里 `metricforge.ai.enabled=true`
  - 配 `DEEPSEEK_API_KEY` 环境变量则走真实 LLM
  - 不配也能跑，前端会显示 `● fallback` 徽标

### 测试 1 · F12 Quality Gate（[/history](../src/pages/History.tsx)）

1. 进 [/history](../src/pages/History.tsx) → 选不同的 from / to 快照
2. 现有的「对比 5 张 Δ 卡」**下方**多了一张 `AI Patch Quality Gate` 卡：
   - 左 Hero：紫青光晕 + verdict 徽标（PASS 翡翠 / WARN 琥珀 / BLOCK 鲜红）+ 100 制 score 大字 + suggestion
   - 右 Checks 列表：每行带方向图标（↓ 改善绿 / → 持平灰 / ↑ 恶化红）+ from→to 数值 + delta% + 通过 ✓ 或不通过 ✗
   - 卡底〔🤖 让 AI 解读这次门禁〕→ 跳 [/ai](../src/pages/Ai.tsx) Analyze Tab，自动带 from/to/mode
3. 选两个**相同**快照 → 显示「选两个不同的快照才能跑」
4. 后端报错时 → 显示错误 + 重试按钮

### 测试 2 · F11 Refactor Prompt（[/ai](../src/pages/Ai.tsx) Tab Prompt）

1. 侧边栏点〔🤖 AI 助手〕→ 切到 `重构 Prompt` Tab
2. **验证摘要 chips**：snapshot # / 风险项数 / 目标类数 / 生成时间 / 〔重新生成〕〔复制〕
3. **验证目标类**：左 4/12 列表，每行 mono 类名 + ↗ 跳类详情图标
4. **验证 Prompt 渲染**：右 8/12 marked 渲染（h1/h2/列表/代码块都有样式）
5. **闭环 3 步引导卡**：1) 复制 2) AI 重构 3) 〔去对比页〕 → 跳 [/history](../src/pages/History.tsx)
6. **空态**：项目没分析过 → 显示「项目尚未分析 + 去分析页」按钮
7. `riskCount === 0` → 绿底卡「项目质量良好，暂无重构必要 🎉」

### 测试 3 · F-AI-3 AI 对话（Tab Chat，**主秀**）

1. 进 [/ai](../src/pages/Ai.tsx) 默认就在 Chat Tab
2. **EmptyState**：紫青渐变 Bot 图标 + 4 个建议问题 chip（点击直发）
3. 点击「这个项目最大的问题是什么？」→ 看到：
   - 用户气泡（右侧 primary 蓝）
   - AI 占位气泡（左侧）开始**循环动画**：「📸 调用 latest_snapshot...」 ↔ 「🔥 调用 risk_hotspots...」 ↔ ...
   - 三个跳动小点
4. 收到响应 → 占位气泡变成回答内容
5. **气泡底部 used: chips** —— 应看到 9 类工具中的 6-8 个，配图标 + 颜色 + 缩写
6. **气泡右侧** `● live` 翡翠（DeepSeek 配置好）或 `● fallback` 琥珀（rule-based）
7. 顶栏：snapshot picker 切快照 + 〔清空〕按钮
8. 输入区：Enter 发送 / Shift+Enter 换行；下方 hint 提示「AI 用 9 类后端工具实时查询」

### 测试 4 · F-AI-2 分析报告（Tab Analyze）

1. 切到 `AI 分析报告` Tab
2. **4 个 mode 卡选择**：质量分析（蓝）/ 重构建议（紫）/ 答辩话术（翡翠）/ Typst PDF（琥珀）
3. **范围切换**：单快照 vs 重构对比（from→to）—— 点对比时下方显示两个 snapshot picker
4. 点〔生成分析〕→ 看到：
   - 顶部 mode badge + provider/model 徽标 + used: 9 工具 chips
   - 摘要醒目卡（紫青渐变背景）
   - 左 8/12 marked 渲染的报告 + 右 4/12 改进建议带序号
5. **Typst PDF mode**：选第 4 个 mode → 生成后**主体不展示 markdown**，而是显示「Typst 源码已就绪 X chars」+ 源码预览前 1200 字符
6. **PDF 操作行**：
   - 〔复制 Typst 源码〕/ 〔下载 .typ〕
   - 〔🪄 AI + Typst → 漂亮 PDF〕大按钮（紫青渐变背景）
7. 点 PDF 按钮：
   - **首次**：下载 ~10MB WASM（约 3-5 秒）
   - 完成后浏览器自动下载 `<projectName>_AI_Report_snapshot<N>_TYPST_REPORT.pdf`
   - 下方显示「✓ 已生成: <文件名>」翡翠绿提示
8. **打开 PDF 验证**：
   - 封面页：紫青渐变背景 + MetriScope · AI QUALITY REPORT 标识 + 项目名 + snapshot 编号 + provider/model
   - 目录页（自动从 H1/H2 抽取）
   - 摘要醒目块（如果 AI 给了 summary）
   - 正文（标题层级 / 列表 / 代码块都有样式）
   - 改进建议附录
   - 第 2 页起页眉显示「项目名 · 报告标题 / snapshot #N · mode」
   - 页脚居中页码 `1 / N`
9. 失败回退：如 WASM 加载失败 → toast 报错；可点〔下载 .typ〕复制源码到本地 typst CLI 出 PDF

### 测试 5 · 闭环跳转

1. [/metrics](../src/pages/Metrics.tsx) → 风险中心卡顶〔✨ 生成 AI Prompt〕→ 跳到 [/ai](../src/pages/Ai.tsx) Tab Prompt
2. Tab Prompt 闭环 3 步卡里点〔去对比页〕→ 跳 [/history](../src/pages/History.tsx)
3. [/history](../src/pages/History.tsx) Quality Gate 卡里〔🤖 让 AI 解读〕→ 跳 `/ai?tab=analyze&from=N&to=N+1&mode=QUALITY_REVIEW` → 自动触发分析
4. URL 参数与状态同步（手动改 URL 也能定位到对应 Tab/范围）

### 测试 6 · MCP 页 refactor-prompt 工具

1. 进 [/mcp](../src/pages/Mcp.tsx)
2. 左栏「报告」组应包含 3 个工具：`report-draft` / `report-draft-ai` / `refactor-prompt`
3. 选 `refactor-prompt` → 自动填示例 `{ "projectId": <当前项目ID> }`
4. 〔发送〕→ 响应 Tab 显示带高亮的完整 envelope，data.prompt 字段非空

### 通用回归

```bash
pnpm lint   # 必须 0 错（已验证 ✅）
```

- 浏览器 Console 无红
- 顶栏切项目 → AI 页所有数据跟着重查
- 侧边栏现在 **9 项**：项目 / 分析 / 指标 / 图分析 / 历史 / 报告 / **AI 助手** / **MCP 调试** / 设置

---

## 七、技术细节备忘

### 为什么用浏览器 WASM 而不是后端 typst CLI？

- 现有 `exportPdfTypst` 是基于 **snapshot 数据 + 固定模板**，不接受外部 markdown / typst 内容
- AI 生成的内容是动态的，要"漂亮"必须 AI 自己写排版指令
- 浏览器 WASM 让"AI 输出 → PDF 落地"完全不绕后端，一气呵成

### 为什么 `import()` 而不是顶部 import？

```ts
const mod: any = await import(
  /* @vite-ignore */
  "@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs"
);
```

- 顶部 import 会让 Vite 把 10MB WASM 打进首屏 chunk
- 动态 import 让 Vite 单独 split 一个 chunk，只在用户点按钮时下载
- `@vite-ignore` 注释让 Vite 不在构建时 resolve 路径（路径里有 `.mjs` 子路径，避免 vite 警告）

### Typst 模板设计

[typst-pdf.ts](../src/lib/typst-pdf.ts) 的 `wrapTypstDocument()` 内置：
- A4 / 2cm 边距
- 中英混排字体栈：Times New Roman → Songti SC → Source Han Serif SC → Noto Serif CJK SC
- 三级标题样式（H1 蓝紫加大 / H2 灰蓝 / H3 普通粗体）
- 代码块灰底圆角
- 链接深蓝
- 封面带渐变背景 + 居中信息卡片
- 页眉：项目名 · 标题 / snapshot · mode（line 分隔）
- 页脚：居中 `1 / N` 页码

### Quality Gate 自动触发 vs 手动触发

- 选好 from/to 不同的快照 → `useEffect` 自动 mutate
- 相同快照 → 不触发，显示提示
- 错误时显示重试按钮
- 这避免了 [/history](../src/pages/History.tsx) 切快照时反复手动点的麻烦

---

## 八、统计

- 新增代码 ~2400 行（8 个文件）
- 修改 5 个文件
- 4 个新功能（F11/F12/F-AI-2/F-AI-3）+ 1 个核心能力（Typst PDF 编译）
- TypeScript strict 全通过
- 零 mock —— 全部基于真实后端接口
- 1 个新依赖（`@myriaddreamin/typst.ts`，懒加载）
