# metriscope-web

MetriScope 桌面客户端的图表/可视化面板。被 [MetriScopeApp](../MetriScopeApp/) 的 WinUI3 主壳通过 WebView2 嵌入。

## 技术栈

- Vite 5 + React 18 + TypeScript
- Tailwind CSS v4（`@tailwindcss/vite` 插件，CSS-first 主题）
- shadcn/ui 风格（`components.json` 已就绪，按需 `pnpm dlx shadcn@latest add button` 等）
- Recharts 用于图表（雷达 / 柱状 / 折线）
- React Router（HashRouter，方便 WebView 直接 `index.html#/dashboard`）

## 开发流程

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

WinUI 端在「设置 → 前端 WebView」打开「使用 Vite 开发服务器」开关后，WebView2 会直接连 `http://localhost:5173`，享受热重载。

## 构建嵌入

```bash
pnpm build        # 产物在 dist/
```

发布版 WinUI 通过 `MetriScopeApp.csproj` 的 `<Content Include="..\metriscope-web\dist\**" />` 把 `dist/` 拷到 `bin/.../web/`，启动时用 `CoreWebView2.SetVirtualHostNameToFolderMapping("metriscope.web", webPath, ...)` 加载 `https://metriscope.web/index.html#/dashboard`。

## 后端联调

默认打 `http://localhost:8080`。通过 `.env.local` 的 `VITE_API_BASE_URL` 覆盖：

```
VITE_API_BASE_URL=http://192.168.1.10:8080
```

`src/lib/api.ts` 封装了统一的 `{code, message, data}` 解包；`code !== "0"` 抛 `ApiError`。

## 与 WinUI 的通信

页面间切换不靠 postMessage，靠 URL hash 参数：WinUI 调 `WebView2.CoreWebView2.Navigate(...)` 切换路由 + 传 `projectId`，比如 `index.html#/dashboard?projectId=1`。`src/lib/api.ts` 里有 `useProjectIdFromQuery()` 读取。

需要原生 → web 单向通知（如主题切换）时，再上 `PostWebMessageAsJson` + `window.chrome.webview.addEventListener("message", ...)`。

## 目录

```
src/
├── App.tsx             路由
├── main.tsx
├── index.css           Tailwind v4 + 主题变量
├── lib/
│   ├── api.ts          fetch 封装
│   └── utils.ts        cn() helper（shadcn 用）
├── pages/
│   ├── Dashboard.tsx       CK 雷达 + 复杂度分布
│   └── DependencyGraph.tsx 依赖图占位
└── components/ui/      shadcn 组件落点
```
