export default function DependencyGraph() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">依赖关系图</h1>
        <p className="text-muted-foreground text-sm mt-1">
          后续接 d3-force 或 cytoscape.js 渲染 /api/v1/projects/&#123;id&#125;/dependencies
        </p>
      </div>
      <div className="rounded-xl border border-dashed border-border bg-muted/30 h-[420px] flex items-center justify-center text-muted-foreground">
        graph placeholder
      </div>
    </div>
  );
}
