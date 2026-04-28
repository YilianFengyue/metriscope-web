# MetriScope Web

面向 Java 项目的软件度量平台前端 —— 单页应用（SPA），对接 Spring Boot 后端 `MetricForge`，覆盖项目管理、分析任务、CK / LK 指标可视化、历史快照对比、报告导出与项目估算的全流程。

> 软件质量保证课程课设 · v0.1.0
> 后端项目独立维护，详见根目录 [API接口文档.md](./API接口文档.md) 与 [完整项目设计.md](./完整项目设计.md)。

---

## 一、当前开发进度

8 个步骤的工作分解，目前 **Step 1-8 全部完成**：

| Step | 模块 | 状态 | 说明 |
| --- | --- | --- | --- |
| 1 | 基建（脚手架 + 依赖 + 主题） | ✅ | Vite + React 18 + TS + Tailwind v4 + shadcn/ui 手搓套件 |
| 2 | 应用骨架（Sidebar + Topbar + 后端心跳） | ✅ | `AppShell.tsx`，10 秒心跳 + 项目切换器 |
| 3 | 项目管理 `/projects` | ✅ | 新建 / 上传源码 / 上传 PUML / 导入历史 |
| 4 | 分析任务 `/analysis` | ✅ | 同步 / 异步分析 + 1.5s 轮询 + 队列状态 + 取消 / 重试 |
| 5 | 质量总览 `/metrics` | ✅ | 5 KPI · CK 雷达 · 复杂度分布 · 风险榜 Top 10 · 类 / 方法指标表 |
| 6 | 历史快照 `/history` | ✅ | 时间线 + 双快照对比 5 项 Δ + 双 Y 轴趋势折线 |
| 7 | 报告中心 `/reports` | ✅ | 普通 / AI Markdown 草稿 + 5 格式导出 + 4 模型估算（COCOMO / UCP / FP / FEP） |
| 8 | 设置 `/settings` | ✅ | baseUrl 配置 + 测试连接 + 应用信息 |

每页全部对接真实接口，**没有 mock 数据**。

---

## 二、技术栈

| 层 | 选型 | 备注 |
| --- | --- | --- |
| 构建 | Vite 5 | dev proxy 代理 `/api` 到后端，无 CORS 烦恼 |
| 框架 | React 18 + TypeScript 5 (`strict`) | |
| 路由 | React Router 6 HashRouter | 方便后续打包 Tauri 桌面端 |
| 样式 | Tailwind CSS v4（`@tailwindcss/vite` 插件） | CSS-first 主题，OKLCH 色彩 |
| 组件 | shadcn/ui new-york 风格手搓 + Radix UI 原语 | 见 `src/components/ui/` |
| 字体 | Geist Variable / Geist Mono Variable | `@fontsource-variable/geist*`，离线可用 |
| 数据层 | `@tanstack/react-query` | 缓存 + 自动重试 + 轮询 |
| 状态 | `zustand` + persist | 仅持久化 baseUrl 与当前项目 ID |
| 图表 | Recharts | 雷达 / 柱状 / 折线 |
| Markdown | `marked` | 报告草稿渲染 |
| 通知 | `sonner` | 顶部右侧 toast |
| 图标 | `lucide-react` | |

---

## 三、快速开始

### 1. 环境

- Node.js ≥ 18
- pnpm ≥ 8（或 npm ≥ 9）
- 后端 MetricForge 监听 `http://localhost:8080`（默认）

### 2. 安装与启动

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

打开浏览器访问 `http://localhost:5173/#/projects`。

### 3. 后端连通性

dev 模式下走 Vite proxy：前端发 `/api/v1/...` → Vite 转发到 `http://localhost:8080`。**无需改后端 CORS**。代理配置见 `vite.config.ts`：

```ts
server: {
  proxy: {
    "/api": { target: "http://localhost:8080", changeOrigin: true },
  },
}
```

如需指向其他后端：去 `/settings` 页填写 `Base URL`（生产 / Tauri 场景），或直接修 `vite.config.ts` 的 target。

### 4. 推荐验收路径（10 步走完闭环）

```
1) /projects   ── 新建项目 backend-test-demo
2) /projects   ── 卡片「上传源码」→ 点「填入测试样例路径」→ 上传
3) /projects   ── 卡片「上传图」→ 点「填入类图」→ 上传
4) /analysis   ── 「异步分析」→ 等到 FINISHED
5) /metrics    ── 看 KPI / 雷达 / 风险榜 / 表格
6) /analysis   ── 再点一次「异步分析」凑出第二个快照
7) /history    ── 选两个快照对比 + 看趋势折线
8) /reports    ── Tab「报告草稿」看 Markdown 预览
9) /reports    ── Tab「导出」点 HTML / PDF
10) /reports   ── Tab「估算」选 COCOMO → 提交
```

测试样例路径已硬编码在「上传源码 / 上传图」对话框的快捷按钮里，对应 [`API接口文档.md`](./API接口文档.md) 第 2 节给出的 `phase1-java-demo`。

---

## 四、模块讲解（让别人 5 分钟看懂）

### 4.1 数据流

```
┌──────────────────────────────────────────────────────────────┐
│  pages/*.tsx                                                 │
│    ├── 通过 useApp() 读全局：当前 projectId / baseUrl        │
│    ├── 通过 useQuery / useMutation 拉数据                    │
│    └── 渲染 components/ui/* 组件                             │
└──────────────────────────────────────────────────────────────┘
              ↓ 调用业务方法
┌──────────────────────────────────────────────────────────────┐
│  lib/api.ts  ── 6 个业务模块                                 │
│    systemApi / projectsApi / analysisApi /                   │
│    metricsApi / snapshotsApi / reportsApi /                  │
│    exportsApi / estimateApi                                  │
└──────────────────────────────────────────────────────────────┘
              ↓ 统一 fetch
┌──────────────────────────────────────────────────────────────┐
│  request<T>()                                                │
│    ├── 拼 baseUrl（来自 zustand 持久化 store）                │
│    ├── 解 {code, message, data}                              │
│    ├── code !== "0" → throw ApiError + sonner toast          │
│    └── silent 选项：跳过 toast（页面用空状态展示错误）       │
└──────────────────────────────────────────────────────────────┘
              ↓ HTTP
┌──────────────────────────────────────────────────────────────┐
│  Vite dev proxy → http://localhost:8080                      │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 全局状态（`src/stores/app.ts`）

只有两个字段，最小化设计：

```ts
{
  baseUrl: string;          // "" 表示走 dev proxy；生产填真实地址
  currentProjectId: number | null;
}
```

通过 zustand `persist` 中间件存到 `localStorage["metriscope"]`，刷新不丢。

### 4.3 路由 / 导航

`HashRouter` 包裹于 `main.tsx`；`App.tsx` 把 6 个业务路由嵌套在 `AppShell` 下，形成 `Sidebar + Topbar + Outlet` 布局。

| 路由 | 页面 | 主接口 |
| --- | --- | --- |
| `/projects` | `Projects.tsx` | `GET POST /projects`、`/upload-source`、`/upload-diagram`、`/imports` |
| `/analysis` | `Analysis.tsx` | `/analyze{,-async}`、`/tasks`、`/cancel`、`/retry`、`/analysis-queue` |
| `/metrics` | `Metrics.tsx` | `/overview`、`/classes`、`/methods`、`/risks`、`/dependencies` |
| `/history` | `History.tsx` | `/snapshots`、`/snapshots/compare`、`/trend` |
| `/reports` | `Reports.tsx` | `/report-draft{,-ai}`、`/snapshots/{id}/export/*`、`/estimate` |
| `/settings` | `Settings.tsx` | `/system/ping`（直接 fetch，绕过 store baseUrl 测试草稿值） |

### 4.4 设计语言

- **light only**：去掉了 dark mode 自动切换，避免投影仪上色彩不可控
- **OKLCH 色彩**：`index.css` 中 `@theme` 定义全部 token，包括 `--color-{background,foreground,card,popover,primary,secondary,muted,accent,destructive,border,input,ring}`
- **font-sans = Geist Variable**：英文走可变字体；中文回退到 PingFang SC / 微软雅黑
- **shadcn/ui new-york 规范**：`rounded-xl border bg-card shadow-sm`，强调克制 + 数据密度
- **风险等级语义色**：`success` / `warning` / `danger` / `info` 在 `Badge` 组件里固定色，避免随意发挥

---

## 五、文件结构

```
metriscope-web/
├── package.json                     依赖与脚本
├── pnpm-lock.yaml
├── vite.config.ts                   @ 别名 + dev proxy → 8080
├── tsconfig{,.app,.node}.json       strict + paths
├── components.json                  shadcn 配置（new-york / slate）
├── index.html
├── README.md                        本文件
├── HANDOFF.md                       项目交接文档（接手时读这个）
├── API接口文档.md                   后端 API 全量文档
├── 完整项目设计.md                  整体设计稿（V1.0）
├── SKILL.md                         frontend-design skill 说明
└── src/
    ├── main.tsx                     入口：QueryClient + HashRouter + Toaster
    ├── App.tsx                      路由：6 业务页嵌套 AppShell
    ├── index.css                    Tailwind v4 import + Geist 字体 + @theme tokens
    ├── vite-env.d.ts
    │
    ├── lib/
    │   ├── api.ts                   ⭐ 数据层核心：fetch 封装 + 6 业务模块 + 16 类型
    │   └── utils.ts                 cn() 合并 className
    │
    ├── stores/
    │   └── app.ts                   zustand 全局状态（baseUrl + currentProjectId）
    │
    ├── components/
    │   ├── layout/
    │   │   └── AppShell.tsx         Sidebar 6 项 + Topbar 项目选择 + 后端心跳
    │   └── ui/                      手搓 shadcn-style 12 个组件
    │       ├── button.tsx              CVA 6 变体 × 4 尺寸
    │       ├── card.tsx                Card / Header / Title / Description / Content / Footer
    │       ├── input.tsx
    │       ├── label.tsx               Radix Label
    │       ├── dialog.tsx              Radix Dialog（含 Portal/Overlay/Close）
    │       ├── select.tsx              Radix Select
    │       ├── table.tsx               原生 table，shadcn 样式
    │       ├── tabs.tsx                Radix Tabs
    │       ├── badge.tsx               7 变体（含语义色 success/warning/danger/info）
    │       ├── skeleton.tsx
    │       ├── separator.tsx
    │       └── sonner.tsx              Toaster wrapper
    │
    └── pages/
        ├── Projects.tsx             Step 3：项目卡片网格 + 3 个 Dialog
        ├── Analysis.tsx             Step 4：同步/异步分析 + 任务表 + 1.5s 轮询
        ├── Metrics.tsx              Step 5：质量总览主秀
        ├── History.tsx              Step 6：快照时间线 + 对比 + 趋势
        ├── Reports.tsx              Step 7：Markdown 报告 + 导出 + 估算
        └── Settings.tsx             Step 8：baseUrl + ping 测速 + 关于
```

### 关键文件深度

| 文件 | 行数 | 职责 |
| --- | --- | --- |
| `src/lib/api.ts` | ~480 | 全部后端调用、TS 类型、错误处理 |
| `src/pages/Reports.tsx` | ~580 | 三大功能 Tabs（报告 / 导出 / 估算）+ 4 估算模型表单 |
| `src/pages/Metrics.tsx` | ~460 | 5 KPI + CK 雷达 + 直方图 + 风险榜 + 类 / 方法表 |
| `src/pages/History.tsx` | ~350 | 时间线 + 对比 Δ + 趋势折线 |
| `src/components/layout/AppShell.tsx` | ~150 | 应用布局，所有页面公用 |

---

## 六、依赖配置

### 运行时依赖

```jsonc
{
  "@fontsource-variable/geist": "^5.1.0",       // 英文可变字体（自托管）
  "@fontsource-variable/geist-mono": "^5.1.0",  // 等宽
  "@radix-ui/react-dialog": "^1.1.2",
  "@radix-ui/react-label": "^2.1.0",
  "@radix-ui/react-select": "^2.1.2",
  "@radix-ui/react-slot": "^1.1.0",
  "@radix-ui/react-tabs": "^1.1.1",
  "@tanstack/react-query": "^5.59.16",          // 数据获取与缓存
  "class-variance-authority": "^0.7.0",         // CVA：变体管理
  "clsx": "^2.1.1",
  "lucide-react": "^0.460.0",                   // 图标
  "marked": "^18.0.2",                          // Markdown 报告渲染
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.28.0",
  "recharts": "^2.13.3",                        // 图表
  "sonner": "^1.7.0",                           // toast
  "tailwind-merge": "^2.5.4",                   // cn() 合并冲突 class
  "zustand": "^5.0.1"                           // 全局状态
}
```

### 开发依赖

```jsonc
{
  "@tailwindcss/vite": "^4.0.0",
  "@types/node": "^22.9.0",
  "@types/react": "^18.3.12",
  "@types/react-dom": "^18.3.1",
  "@vitejs/plugin-react": "^4.3.3",
  "tailwindcss": "^4.0.0",
  "typescript": "^5.6.3",
  "vite": "^5.4.10"
}
```

### pnpm v10 注意事项

`package.json` 已声明：

```jsonc
"pnpm": {
  "onlyBuiltDependencies": ["esbuild"]
}
```

避免 pnpm v10 默认拦截 esbuild 的 postinstall 脚本（拦了 vite 起不来）。

### 脚本

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动 dev server（5173，HMR） |
| `pnpm build` | TS 编译 + Vite 生产构建到 `dist/` |
| `pnpm preview` | 预览生产构建产物 |
| `pnpm lint` | `tsc --noEmit` 类型检查 |

---

## 七、开发约定

1. **不写 mock**：每个页面第一次提交就连真接口，前端要的字段后端没给就开 issue 而不是塞假数据
2. **错误处理统一**：API 调用 throw `ApiError`，全局 `sonner` toast；用 `silent: true` 在页面用空状态展示错误（如 `PROJECT_NOT_ANALYZED`）
3. **类型先行**：所有响应 / 请求都有对应 TS interface（见 `src/lib/api.ts`）
4. **shadcn 命名**：`components/ui/*` 按官方 new-york 风格，方便将来需要时直接 `pnpm dlx shadcn@latest add` 替换
5. **不引入 Next.js**：纯 SPA，不需要 SSR / RSC

---

## 八、后续可做

- **依赖关系图**：用 D3 / vis-network 把 `/dependencies` 渲染成节点-边图
- **类详情页**：点击类指标表跳详情页，展示该类的方法分布 + CK 雷达 vs 项目均值 + 依赖出入边
- **图一致性页**：对接 `/diagram-consistency` / `/diagram-insights` / `/diagram-summary`
- **Tauri 打包**：`pnpm create tauri-app` 包成离线 .exe（约 30 分钟工作量）
- **MCP 演示页**：调用 `/mcp/tools/*` 演示给 Agent 用的结构化输出

---

## 九、参考

- 后端 API：[`API接口文档.md`](./API接口文档.md)
- 整体设计稿：[`完整项目设计.md`](./完整项目设计.md)
- 接手指南：[`HANDOFF.md`](./HANDOFF.md)
- shadcn/ui 官方：<https://ui.shadcn.com>
- Radix UI Primitives：<https://www.radix-ui.com>
