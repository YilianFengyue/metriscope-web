import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ChevronRight,
  FileImage,
  FileText,
  FolderUp,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  projectsApi,
  type DiagramType,
  type ProjectResponse, systemApi,
} from "@/lib/api";
import { useApp } from "@/stores/app";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const SAMPLE_SOURCE =
  "F:/Desktop/大三下/软件度量应用/项目设计/MetriScope/sample-data/phase1-java-demo/src/main/java";

const SAMPLE_DIAGRAMS: { label: string; type: DiagramType; path: string }[] = [
  {
    label: "类图",
    type: "CLASS",
    path: "F:/Desktop/大三下/软件度量应用/项目设计/MetriScope/sample-data/phase1-java-demo/diagram/class-diagram.puml",
  },
  {
    label: "用例图",
    type: "USE_CASE",
    path: "F:/Desktop/大三下/软件度量应用/项目设计/MetriScope/sample-data/phase1-java-demo/diagram/use-case-diagram.puml",
  },
  {
    label: "活动图",
    type: "ACTIVITY",
    path: "F:/Desktop/大三下/软件度量应用/项目设计/MetriScope/sample-data/phase1-java-demo/diagram/activity-diagram.puml",
  },
];

export default function ProjectsPage() {
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: projectsApi.list,
  });
  const projects = projectsQuery.data ?? [];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">项目</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理待度量的 Java 项目，每个项目可上传源码与设计图，再到「分析」页跑度量。
          </p>
        </div>
        <CreateProjectButton />
      </header>

      {projectsQuery.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyProjects />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyProjects() {
  return (
    <Card>
      <CardContent className="py-16 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <FolderUp className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold">还没有项目</h3>
          <p className="text-sm text-muted-foreground">
            新建一个项目开始度量。后端会创建空记录，源码可稍后通过路径注册。
          </p>
        </div>
        <CreateProjectButton />
      </CardContent>
    </Card>
  );
}

function CreateProjectButton() {
  const qc = useQueryClient();
  const setCurrentProjectId = useApp((s) => s.setCurrentProjectId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    language: "Java",
  });

  const create = useMutation({
    mutationFn: () => projectsApi.create(form),
    onSuccess: (proj) => {
      toast.success(`已创建项目 #${proj.id} ${proj.name}`);
      qc.invalidateQueries({ queryKey: ["projects"] });
      setCurrentProjectId(proj.id);
      setOpen(false);
      setForm({ name: "", description: "", language: "Java" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          新建项目
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建项目</DialogTitle>
          <DialogDescription>
            创建后再去上传源码和设计图。仅 Java 项目支持完整指标计算。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">名称 *</Label>
            <Input
              id="name"
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="backend-test-demo"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">描述</Label>
            <Input
              id="desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="用于度量分析的 Java 项目"
            />
          </div>
          <div className="space-y-1.5">
            <Label>语言</Label>
            <Select
              value={form.language}
              onValueChange={(v) => setForm({ ...form, language: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Java">Java</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            onClick={() => create.mutate()}
            disabled={!form.name.trim() || create.isPending}
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectCard({ project }: { project: ProjectResponse }) {
  const currentProjectId = useApp((s) => s.currentProjectId);
  const setCurrentProjectId = useApp((s) => s.setCurrentProjectId);
  const isCurrent = currentProjectId === project.id;
  const [sourceOpen, setSourceOpen] = useState(false);
  const [diagramOpen, setDiagramOpen] = useState(false);
  const [importsOpen, setImportsOpen] = useState(false);

  const hasSource = project.sourcePath && project.sourcePath.length > 0;
  const formattedDate = new Date(project.updatedAt).toLocaleString("zh-CN", {
    hour12: false,
  });

  return (
    <Card className={cn("relative overflow-hidden", isCurrent && "ring-2 ring-primary/70")}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="flex items-center gap-2 truncate">
              <span className="text-xs font-mono text-muted-foreground tabular-nums">
                #{project.id}
              </span>
              <span className="truncate">{project.name}</span>
            </CardTitle>
            <CardDescription className="truncate mt-1">
              {project.description || (
                <span className="italic opacity-70">（无描述）</span>
              )}
            </CardDescription>
          </div>
          {isCurrent && <Badge variant="info">当前</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
          <Stat label="语言" value={project.language} />
          <Stat label="更新于" value={formattedDate} />
          <div className="col-span-2">
            <dt className="text-muted-foreground uppercase tracking-wide text-[10px] mb-1">
              源码路径
            </dt>
            <dd className="font-mono text-[11px] break-all leading-relaxed">
              {hasSource ? (
                project.sourcePath
              ) : (
                <span className="text-amber-600">未设置</span>
              )}
            </dd>
          </div>
        </dl>
        <Separator />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setSourceOpen(true)}>
            <FolderUp className="h-3.5 w-3.5" />
            上传源码
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDiagramOpen(true)}>
            <FileImage className="h-3.5 w-3.5" />
            上传图
          </Button>
          <Button size="sm" variant="outline" onClick={() => setImportsOpen(true)}>
            <FileText className="h-3.5 w-3.5" />
            导入记录
          </Button>
          <Button
            size="sm"
            variant={isCurrent ? "secondary" : "default"}
            className="ml-auto"
            onClick={() => setCurrentProjectId(project.id)}
            disabled={isCurrent}
          >
            <Activity className="h-3.5 w-3.5" />
            {isCurrent ? "当前" : "设为当前"}
          </Button>
        </div>
      </CardContent>

      <UploadSourceDialog
        open={sourceOpen}
        onOpenChange={setSourceOpen}
        projectId={project.id}
      />
      <UploadDiagramDialog
        open={diagramOpen}
        onOpenChange={setDiagramOpen}
        projectId={project.id}
      />
      <ImportsDialog
        open={importsOpen}
        onOpenChange={setImportsOpen}
        projectId={project.id}
        projectName={project.name}
      />
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground uppercase tracking-wide text-[10px]">
        {label}
      </dt>
      <dd className="font-medium tabular-nums truncate">{value}</dd>
    </div>
  );
}

function UploadSourceDialog({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: number;
}) {
  const qc = useQueryClient();
  const [path, setPath] = useState("");
  const { data: dirs, isLoading: isBrowsing } = useQuery({
    queryKey: ["system-browse", path],
    queryFn: () => systemApi.browse(path),
    enabled: open,
    retry: false,
  });

  const submit = useMutation({
    mutationFn: () => projectsApi.uploadSource(projectId, { sourcePath: path }),
    onSuccess: (rec) => {
      toast.success("源码已注册", { description: rec.reference });
      qc.invalidateQueries({ queryKey: ["projects"] });
      onOpenChange(false);
      setPath("");
    },
  });

  // 处理返回上一级目录
  const handleGoBack = () => {
    if (!path) return;
    const parts = path.split('/').filter(Boolean);
    if (parts.length <= 1) {
      setPath(""); // 回到根目录选择盘符
    } else {
      setPath(path.substring(0, path.lastIndexOf('/', path.length - 2) + 1));
    }
  };

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>上传源码</DialogTitle>
            <DialogDescription>
              请从下方列表中逐级点击选择目录。当前选定：<span className="font-mono text-primary">{path || "根目录"}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 输入框允许微调路径 */}
            <Input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="正在从根目录开始浏览..."
                className="font-mono text-xs"
            />

            {/* 交互式目录浏览器容器 */}
            <div className="flex flex-col border rounded-lg overflow-hidden bg-card">
              <div className="px-3 py-2 bg-muted/50 border-b flex justify-between items-center text-[11px] font-bold">
                <span className="text-muted-foreground uppercase tracking-wider">选择子目录</span>
                {path && (
                    <Button variant="link" size="sm" className="h-auto p-0 text-[11px]" onClick={handleGoBack}>
                      返回上级
                    </Button>
                )}
              </div>

              {/* 关键：固定高度 + 自动滚动，防止按钮被挤走 */}
              <div className="h-[200px] overflow-y-auto p-1 bg-muted/10">
                {isBrowsing ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">正在加载文件系统...</div>
                ) : dirs && dirs.length > 0 ? (
                    dirs.map((d) => (
                        <button
                            key={d}
                            className="w-full text-left text-[11px] font-mono p-2 hover:bg-accent rounded flex items-center gap-2 truncate transition-colors"
                            onClick={() => setPath(d)}
                        >
                          <span>📁</span>
                          <span className="truncate">{d}</span>
                        </button>
                    ))
                ) : (
                    <div className="p-4 text-center text-xs text-muted-foreground italic">未发现文件夹</div>
                )}
              </div>
            </div>
          </div>

          {/* 按钮区域：由于上面容器固定了高度，这里会一直保持在底部 */}
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button onClick={() => submit.mutate()} disabled={!path.trim() || submit.isPending}>
              {submit.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              确认上传当前目录
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}

function UploadDiagramDialog({
  open,
  onOpenChange,
  projectId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: number;
}) {
  const qc = useQueryClient();
  const [diagramPath, setDiagramPath] = useState("");
  const [diagramType, setDiagramType] = useState<DiagramType>("CLASS");

  const { data: dirs, isLoading: isBrowsing } = useQuery({
    queryKey: ["system-browse-diag", diagramPath],
    queryFn: () => systemApi.browse(diagramPath),
    enabled: open, // 弹窗打开即允许查询，空路径后端应返回盘符列表
    retry: false,
  });

  const submit = useMutation({
    mutationFn: () =>
        projectsApi.uploadDiagram(projectId, { diagramPath, diagramType }),
    onSuccess: (rec) => {
      toast.success("图已上传", { description: rec.reference });
      qc.invalidateQueries({ queryKey: ["imports", projectId] });
      onOpenChange(false);
      setDiagramPath("");
    },
  });

  const handleGoBack = () => {
    if (!diagramPath) return;
    const path = diagramPath.replace(/\\/g, '/');
    const parts = path.split('/').filter(Boolean);
    if (parts.length <= 1) {
      setDiagramPath("");
    } else {
      const lastIdx = path.lastIndexOf('/', path.length - 2);
      setDiagramPath(path.substring(0, lastIdx + 1));
    }
  };

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl"> {}
          <DialogHeader>
            <DialogTitle>上传设计图</DialogTitle>
            <DialogDescription>
              支持从下方列表逐级选择目录，或直接输入文件完整路径。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>类型</Label>
              <Select
                  value={diagramType}
                  onValueChange={(v) => setDiagramType(v as DiagramType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLASS">类图 (CLASS)</SelectItem>
                  <SelectItem value="USE_CASE">用例图 (USE_CASE)</SelectItem>
                  <SelectItem value="ACTIVITY">活动图 (ACTIVITY)</SelectItem>
                  <SelectItem value="PUML">PlantUML 通用</SelectItem>
                  <SelectItem value="MERMAID">Mermaid</SelectItem>
                  <SelectItem value="POWERDESIGNER">PowerDesigner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="diag-path">文件路径</Label>
              <Input
                  id="diag-path"
                  value={diagramPath}
                  onChange={(e) => setDiagramPath(e.target.value)}
                  placeholder="正在浏览..."
                  className="font-mono text-xs"
              />

              {}
              <div className="mt-2 border rounded-lg overflow-hidden bg-card text-xs">
                <div className="px-3 py-2 bg-muted/50 border-b flex justify-between items-center font-bold">
                  <span className="text-muted-foreground uppercase tracking-wider">选择子目录 / 文件</span>
                  {diagramPath && (
                      <Button variant="link" size="sm" className="h-auto p-0 text-[11px]" onClick={handleGoBack}>
                        返回上级
                      </Button>
                  )}
                </div>

                {}
                <div className="h-[180px] overflow-y-auto p-1 bg-muted/10 font-mono">
                  {isBrowsing ? (
                      <div className="p-4 text-center text-muted-foreground">加载中...</div>
                  ) : dirs && dirs.length > 0 ? (
                      dirs.map((d) => {
                        const isFile = d.match(/\.(puml|mmd|xml|json|oom)$/i);
                        const displayName = d.endsWith(':/') ? d : d.split('/').pop();
                        return (
                            <button
                                key={d}
                                type="button"
                                className="w-full text-left p-2 hover:bg-accent rounded flex items-center gap-2 truncate transition-colors"
                                onClick={() => setDiagramPath(d)}
                            >
                              <span className="shrink-0">{isFile ? "📄" : "📁"}</span>
                              <span className={cn("truncate text-[11px]", isFile && "text-primary font-medium")}>
                              {displayName || d} {}
                              </span>
                            </button>
                        );
                      })
                  ) : (
                      <div className="p-4 text-center text-muted-foreground italic">无子内容</div>
                  )}
                </div>
              </div>
            </div>

            {}
          </div>

          <DialogFooter className="mt-2 border-t pt-4"> {}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
                onClick={() => submit.mutate()}
                disabled={!diagramPath.trim() || submit.isPending}
            >
              {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              确认上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}

function ImportsDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: number;
  projectName: string;
}) {
  const importsQuery = useQuery({
    queryKey: ["imports", projectId],
    queryFn: () => projectsApi.imports(projectId),
    enabled: open,
  });
  const records = importsQuery.data ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>导入记录 · {projectName}</DialogTitle>
          <DialogDescription>所有源码 / 图的上传历史。</DialogDescription>
        </DialogHeader>
        <div className="max-h-[420px] overflow-y-auto -mx-2">
          {importsQuery.isLoading ? (
            <div className="space-y-2 px-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-12">
              还没有导入记录，先上传源码或图。
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {records.map((rec) => (
                <li
                  key={rec.id}
                  className="px-2 py-3 flex items-start gap-3 text-sm"
                >
                  <Badge variant={rec.importType === "SOURCE" ? "info" : "secondary"}>
                    {rec.importType}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[11px] break-all leading-relaxed">
                      {rec.reference}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <span className="tabular-nums">
                        {new Date(rec.createdAt).toLocaleString("zh-CN", {
                          hour12: false,
                        })}
                      </span>
                      <span>·</span>
                      <span>状态 {rec.status}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
