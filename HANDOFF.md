# MetriScope 前端开发交接 (HANDOFF)

> 给新会话/新接手的人。读这一份就能续。

## 一、项目一句话

**面向 Java 项目的软件度量平台**（软件质量保证课程课设）。后端是 Spring Boot 已完成，前端要做一个能查项目、跑分析、看 LK/CK/复杂度/风险、对比快照、导出报告的桌面级 dashboard。

## 二、当前架构决策（已锁）

- **前端：Vite + React 18 + TypeScript + Tailwind v4 + shadcn/ui + Recharts**，纯 SPA
- **路由：React Router HashRouter**（方便将来用 Tauri 打包成 .exe）
- **后端：Spring Boot 监听 `http://localhost:8080`**（已存在，不动）
- **WinUI3 工程作废**：[MetriScopeApp/](MetriScopeApp/) 保留但不再开发；以后想要原生 .exe 用 Tauri 包 metriscope-web 即可
- **不要选 Next.js**：用不上 SSR/RSC/file-routing，shadcn 在 Next 里要堆 `"use client"`，更慢

## 三、后端 API（必读 [API接口文档.md](API接口文档.md)）

- 前缀：`/api/v1`
- 统一返回：`{ "code": "0", "message": "OK", "data": {...} }`，`code !== "0"` 视为错误
- 所有路径见 [API接口文档.md](API接口文档.md)，前端封装成功失败统一处理

## 四、已搭好的脚手架（[metriscope-web/](metriscope-web/)）

```
metriscope-web/
├── package.json          Vite 5 / React 18 / TS 5 / Tailwind v4 / Recharts / react-router-dom 6 / lucide-react / clsx / tailwind-merge / class-variance-authority
├── vite.config.ts        @ → src，端口 5173
├── tsconfig.{,app,node}.json   strict 模式 + paths
├── components.json       shadcn 配置（new-york 风格，base color slate）
├── index.html
└── src/
    ├── main.tsx          HashRouter 包裹
    ├── App.tsx           路由声明（已有 dashboard / dependency-graph 占位）
    ├── index.css         Tailwind v4 + @theme block（深色自动跟系统）
    ├── lib/
    │   ├── api.ts        fetch 封装，自动解 {code,message,data}，VITE_API_BASE_URL 覆盖
    │   └── utils.ts      cn() helper（shadcn 用）
    ├── pages/
    │   ├── Dashboard.tsx        Recharts 雷达 + 柱状（demo 数据，要换真实数据）
    │   └── DependencyGraph.tsx  占位
    └── components/ui/    shadcn 组件落点（空，按需加）
```

启动：

```bash
cd metriscope-web
pnpm install        # 或 npm install
pnpm dev            # http://localhost:5173
```

## 五、要做的 6 个页面 × API 映射

| 页面路由 | 内容 | 用到的接口 |
|---|---|---|
| `/projects` | 项目列表 / 新建 / 上传源码 / 上传 PlantUML | `GET POST /projects`、`POST /projects/{id}/upload-source`、`POST /upload-diagram`、`GET /imports` |
| `/analysis` | 启动分析 / 任务列表 / 状态轮询 / 队列状态 | `POST /analyze`、`POST /analyze-async`、`GET /tasks`、`GET /tasks/{taskId}`、`POST /cancel`、`GET /analysis-queue` |
| `/metrics` | 项目总览 KPI / 类指标表 / 方法指标表 / 风险榜 / 依赖图 / **CK 雷达 + 复杂度分布**（Recharts） | `GET /overview`、`GET /classes`、`GET /methods`、`GET /risks`、`GET /dependencies` |
| `/history` | 快照列表 / 双快照对比 / 趋势 KPI | `GET /snapshots`、`GET /snapshots/compare?from=&to=`、`GET /trend` |
| `/reports` | 报告草稿 + AI 草稿 / 导出 JSON·CSV·HTML·PDF·Typst / 估算 | `GET /report-draft{,-ai}`、`POST /snapshots/{id}/export/{json,csv,html,pdf,pdf-typst}`、`POST /estimate` |
| `/settings` | 后端 URL / 测试连接 / 主题 | `GET /system/ping` |

## 六、需要的全局状态

只有一个：**当前选中的项目 ID**（多页共享）。

推荐 **zustand**（5 KB，比 Redux/Pinia 简洁）：

```bash
pnpm add zustand
```

```ts
// src/stores/app.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export const useApp = create(persist<{
  baseUrl: string;
  currentProjectId: number | null;
  setProject: (id: number | null) => void;
}>((set) => ({
  baseUrl: 'http://localhost:8080',
  currentProjectId: null,
  setProject: (id) => set({ currentProjectId: id }),
}), { name: 'metriscope' }));
```

## 七、shadcn 组件按需添加

```bash
pnpm dlx shadcn@latest init       # 首次（components.json 已存在直接走）
pnpm dlx shadcn@latest add button card input dialog table tabs select badge sonner skeleton tooltip dropdown-menu
```

## 八、设计语言（避免"AI slop"美学）

- 字体：CJK 用 PingFang SC / 微软雅黑 fallback；英文别用 Inter，可以 IBM Plex Sans / Geist
- 主色克制：用 Tailwind v4 `@theme` 里的 `--color-primary` 一种强调色
- 卡片：圆角 `rounded-xl` + `border` + `bg-card` + 适度 shadow
- 数据密度：仪表盘用大数字 + 小标签 + 配色 pill（low/medium/high/critical = green/amber/orange/red）
- 深色：自动跟系统（已在 index.css 配好 oklch 变量）

## 九、测试样例数据（后端要的路径）

- 源码：`F:/Desktop/大三下/软件度量应用/项目设计/MetriScope/sample-data/phase1-java-demo/src/main/java`
- 类图：`F:/.../diagram/class-diagram.puml`
- 用例图：`F:/.../diagram/use-case-diagram.puml`
- 活动图：`F:/.../diagram/activity-diagram.puml`

## 十、用户偏好（必须遵守，前面已经踩雷）

1. **不要 mock / 假数据 / 占位 UI**——每页直接对接真接口，写完就能用
2. **写一段验一段**：每加一个页面就 `pnpm dev` 看能不能跑，**不要堆 6 页一次性交付**
3. **不浪费 token**：用户花 4 小时被 WinUI3 坑过，不再容忍"build 通过但运行时炸"。Web 栈 HMR 立刻报错，应该不会再有这问题
4. **真出 bug 就在原文件 debug**，不要砍成最小版去"隔离测试"——会把已写好的工作弄丢
5. **答辩可见**：UI 要能撑场，雷达图 + 趋势 + 风险榜单是答辩主秀

## 十一、推荐执行顺序

1. `pnpm install && pnpm dev`，确认 `http://localhost:5173/#/dashboard` 能看到雷达图
2. `pnpm add zustand` + 写 `src/stores/app.ts`
3. shadcn 装一批基础组件（见第七节）
4. 做一个共享 Layout：左侧 Sidebar（5 项 + Settings）+ 右侧主内容区
5. **先写 [/projects](metriscope-web/src/pages/) 页**：列表 + 新建 dialog + 上传源码 dialog——能看到真实的项目列表后再继续
6. 一页页加：projects → analysis → metrics → history → reports → settings
7. 后期可选：Tauri 包成桌面 .exe（`pnpm create tauri-app`，30 分钟）

## 十二、关键文件参考

- 接口文档：[API接口文档.md](API接口文档.md)
- 完整设计稿：[完整项目设计.md](完整项目设计.md)
- web 脚手架 README：[metriscope-web/README.md](metriscope-web/README.md)
- 现有 API client（已经写好 fetch + 错误处理）：[metriscope-web/src/lib/api.ts](metriscope-web/src/lib/api.ts)

---

**新窗口起手式**：

```
读 f:/Desktop/大三下/软件度量应用/项目设计/HANDOFF.md，按里面的"推荐执行顺序"开始。
先做项目列表页，做完一页停一下让我看，不要一次堆多页。
```
