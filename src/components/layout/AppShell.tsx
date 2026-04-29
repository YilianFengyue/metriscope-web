import { useEffect } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  Activity,
  BarChart3,
  Bot,
  FileText,
  FolderKanban,
  GitBranch,
  GitCompare,
  History,
  Settings,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { projectsApi, systemApi } from "@/lib/api";
import { useApp } from "@/stores/app";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const navItems = [
  { to: "/projects", label: "项目", icon: FolderKanban },
  { to: "/analysis", label: "分析", icon: Activity },
  { to: "/metrics", label: "指标", icon: BarChart3 },
  { to: "/diagrams", label: "图分析", icon: GitCompare },
  { to: "/history", label: "历史", icon: History },
  { to: "/reports", label: "报告", icon: FileText },
  { to: "/mcp", label: "MCP", icon: Bot },
  { to: "/settings", label: "设置", icon: Settings },
] as const;

export function AppShell() {
  const currentProjectId = useApp((s) => s.currentProjectId);
  const setCurrentProjectId = useApp((s) => s.setCurrentProjectId);

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
  });

  const pingQuery = useQuery({
    queryKey: ["system-ping"],
    queryFn: () => systemApi.ping(),
    refetchInterval: 15_000,
    retry: 0,
  });

  const projects = projectsQuery.data ?? [];

  useEffect(() => {
    if (!projectsQuery.data) return;
    if (currentProjectId == null && projectsQuery.data.length > 0) {
      setCurrentProjectId(projectsQuery.data[0].id);
    } else if (
      currentProjectId != null &&
      !projectsQuery.data.find((p) => p.id === currentProjectId)
    ) {
      setCurrentProjectId(projectsQuery.data[0]?.id ?? null);
    }
  }, [projectsQuery.data, currentProjectId, setCurrentProjectId]);

  const backendUp = pingQuery.data?.status === "UP";

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-60 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="h-14 flex items-center px-5 border-b border-border">
          <Link
            to="/projects"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <GitBranch className="h-5 w-5 text-primary" />
            <span>MetriScope</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border text-[11px] text-muted-foreground tracking-wide">
          软件度量平台 · v0.1
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 border-b border-border bg-card flex items-center px-6 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">当前项目</span>
            <div className="w-56">
              <Select
                value={currentProjectId != null ? String(currentProjectId) : undefined}
                onValueChange={(v) => setCurrentProjectId(v ? Number(v) : null)}
                disabled={projects.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      projectsQuery.isLoading
                        ? "加载中…"
                        : projects.length === 0
                          ? "暂无项目"
                          : "未选择"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <span className="font-mono text-xs text-muted-foreground mr-1.5">
                        #{p.id}
                      </span>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                backendUp
                  ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]"
                  : "bg-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.18)]",
              )}
            />
            <span className="tabular-nums">
              {pingQuery.data
                ? `${pingQuery.data.appName} · ${pingQuery.data.status}`
                : pingQuery.isLoading
                  ? "探测后端…"
                  : "后端不可达"}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
