import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import { select } from "d3-selection";
import { drag } from "d3-drag";
import { zoom } from "d3-zoom";
import { Filter as FilterIcon, RefreshCw, Search, X } from "lucide-react";
import {
  type ClassMetricResponse,
  type DependencyEdgeResponse,
  type RiskLevel,
} from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface GraphNode extends SimulationNodeDatum {
  id: string;
  shortName: string;
  packageName: string;
  riskLevel: RiskLevel;
  wmc: number;
  cbo: number;
  rfc: number;
  loc: number;
  classSize: number;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  edgeType: string;
}

const RISK_FILL: Record<RiskLevel, string> = {
  LOW: "oklch(0.74 0.13 165)",
  MEDIUM: "oklch(0.78 0.15 75)",
  HIGH: "oklch(0.66 0.2 50)",
  CRITICAL: "oklch(0.6 0.24 18)",
};

const RISK_STROKE: Record<RiskLevel, string> = {
  LOW: "oklch(0.5 0.16 165)",
  MEDIUM: "oklch(0.55 0.17 75)",
  HIGH: "oklch(0.5 0.2 50)",
  CRITICAL: "oklch(0.45 0.24 18)",
};

function nodeRadius(wmc: number): number {
  return 5 + Math.sqrt(Math.max(wmc, 1)) * 1.8;
}

function edgeStyle(type: string): {
  stroke: string;
  strokeWidth: number;
  dash: string | null;
} {
  switch (type) {
    case "EXTENDS":
      return { stroke: "oklch(0.55 0.18 260)", strokeWidth: 2, dash: null };
    case "IMPLEMENTS":
      return { stroke: "oklch(0.55 0.18 260)", strokeWidth: 1.5, dash: "5 3" };
    case "METHOD_CALL":
      return { stroke: "oklch(0.55 0.04 260)", strokeWidth: 1, dash: null };
    case "FIELD":
      return { stroke: "oklch(0.6 0.04 260)", strokeWidth: 1, dash: "2 2" };
    case "PARAMETER":
    case "RETURN_TYPE":
      return { stroke: "oklch(0.55 0.04 260)", strokeWidth: 0.8, dash: "1 2" };
    default:
      return { stroke: "oklch(0.5 0.02 260)", strokeWidth: 1, dash: null };
  }
}

export function DependencyGraph({
  classes,
  deps,
}: {
  classes: ClassMetricResponse[];
  deps: DependencyEdgeResponse[];
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [search, setSearch] = useState("");
  const [showOnlyRisky, setShowOnlyRisky] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const data = useMemo(() => {
    const filtered = classes.filter((c) =>
      showOnlyRisky
        ? c.riskLevel === "HIGH" || c.riskLevel === "CRITICAL"
        : true,
    );
    const nodes: GraphNode[] = filtered.map((c) => ({
      id: c.qualifiedName,
      shortName: c.className,
      packageName: c.packageName,
      riskLevel: c.riskLevel,
      wmc: c.weightedMethodsPerClass,
      cbo: c.couplingCount,
      rfc: c.responseForClass,
      loc: c.loc,
      classSize: c.classSize,
    }));

    // 宽松匹配：deps 里的 fromClass/toClass 可能是 FQN / 简单名 / 带泛型 / 带数组 / 内部类。
    // 先建两张索引：FQN → node，shortName → node[]。
    const fqnToNode = new Map<string, GraphNode>();
    const simpleToNodes = new Map<string, GraphNode[]>();
    for (const n of nodes) {
      fqnToNode.set(n.id, n);
      const list = simpleToNodes.get(n.shortName) ?? [];
      list.push(n);
      simpleToNodes.set(n.shortName, list);
    }

    function normalize(raw: string): string {
      // 去掉泛型 List<Order> → List；去掉数组 Order[] → Order；trim
      return raw
        .replace(/<[^>]*>/g, "")
        .replace(/\[\]/g, "")
        .trim();
    }

    function resolve(name: string | null | undefined): GraphNode | null {
      if (!name) return null;
      const n = normalize(name);
      // 1) 直接 FQN 命中
      const direct = fqnToNode.get(n);
      if (direct) return direct;
      // 2) 取最后一段（包名后的 className 或 Outer.Inner 的 Inner）
      const lastDot = n.lastIndexOf(".");
      const tail = lastDot >= 0 ? n.slice(lastDot + 1) : n;
      // 2a) 整段当 FQN 再试一次（处理某些后端只发简单名的情况）
      if (lastDot >= 0) {
        const tailNode = fqnToNode.get(tail);
        if (tailNode) return tailNode;
      }
      // 3) 用简单名查；只有唯一匹配才接受，避免歧义
      const matches = simpleToNodes.get(tail);
      if (matches && matches.length === 1) return matches[0];
      return null;
    }

    const links: GraphLink[] = [];
    let dropped = 0;
    for (const e of deps) {
      const a = resolve(e.fromClass);
      const b = resolve(e.toClass);
      if (!a || !b) {
        dropped += 1;
        continue;
      }
      if (a.id === b.id) continue; // 自环
      links.push({
        source: a.id,
        target: b.id,
        edgeType: e.edgeType,
      });
    }
    if (import.meta.env.DEV && deps.length > 0 && dropped > 0) {
      // eslint-disable-next-line no-console
      console.debug(
        `[DependencyGraph] ${deps.length} deps in, ${links.length} resolved, ${dropped} dropped (unresolved class names)`,
      );
    }
    return { nodes, links };
  }, [classes, deps, showOnlyRisky]);

  const selectedNode = useMemo(() => {
    if (!selectedId) return null;
    return data.nodes.find((n) => n.id === selectedId) ?? null;
  }, [data.nodes, selectedId]);

  const neighborIds = useMemo(() => {
    if (!selectedId) return null;
    const set = new Set<string>([selectedId]);
    for (const l of data.links) {
      const s = typeof l.source === "string" ? l.source : l.source.id;
      const t = typeof l.target === "string" ? l.target : l.target.id;
      if (s === selectedId) set.add(t);
      if (t === selectedId) set.add(s);
    }
    return set;
  }, [selectedId, data.links]);

  // 主 effect：构建 simulation + 渲染节点 / 边
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || data.nodes.length === 0) return;

    const width = 1400;
    const height = 900;
    const root = select(svg);
    const zoomRoot = root.select<SVGGElement>("g.zoom-root");
    zoomRoot.selectAll("*").remove();

    const linkLayer = zoomRoot.append("g").attr("class", "links");
    const nodeLayer = zoomRoot.append("g").attr("class", "nodes");

    // 初始化为环形布局，避免初始爆炸
    const r0 = Math.min(width, height) * 0.3;
    data.nodes.forEach((n, i) => {
      const angle = (i / data.nodes.length) * Math.PI * 2;
      n.x = width / 2 + Math.cos(angle) * r0;
      n.y = height / 2 + Math.sin(angle) * r0;
    });

    const sim = forceSimulation<GraphNode>(data.nodes)
      .force(
        "link",
        forceLink<GraphNode, GraphLink>(data.links)
          .id((d) => d.id)
          .distance(90)
          .strength(0.5),
      )
      .force("charge", forceManyBody<GraphNode>().strength(-220))
      .force("center", forceCenter(width / 2, height / 2))
      .force(
        "collide",
        forceCollide<GraphNode>().radius((d) => nodeRadius(d.wmc) + 6),
      )
      .alpha(0.9);

    // 边
    const linkSel = linkLayer
      .selectAll<SVGLineElement, GraphLink>("line.link")
      .data(data.links)
      .join("line")
      .attr("class", "link")
      .each(function (d) {
        const s = edgeStyle(d.edgeType);
        const sel = select(this);
        sel
          .attr("stroke", s.stroke)
          .attr("stroke-width", s.strokeWidth)
          .attr("stroke-opacity", 0.45)
          .attr("marker-end", "url(#arrowhead)");
        if (s.dash) sel.attr("stroke-dasharray", s.dash);
      });

    // 节点
    const nodeSel = nodeLayer
      .selectAll<SVGGElement, GraphNode>("g.node")
      .data(data.nodes, (d) => d.id)
      .join("g")
      .attr("class", "node")
      .style("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelectedId((prev) => (prev === d.id ? null : d.id));
      });

    nodeSel
      .append("circle")
      .attr("r", (d) => nodeRadius(d.wmc))
      .attr("fill", (d) => RISK_FILL[d.riskLevel])
      .attr("stroke", (d) => RISK_STROKE[d.riskLevel])
      .attr("stroke-width", 1.5);

    // CRITICAL 节点加脉冲圈
    nodeSel
      .filter((d) => d.riskLevel === "CRITICAL")
      .append("circle")
      .attr("r", (d) => nodeRadius(d.wmc) + 3)
      .attr("fill", "none")
      .attr("stroke", RISK_STROKE.CRITICAL)
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.5)
      .attr("class", "pulse");

    nodeSel
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => nodeRadius(d.wmc) + 12)
      .attr("font-size", "10px")
      .attr("font-family", "var(--font-mono)")
      .attr("fill", "var(--color-foreground)")
      .style("pointer-events", "none")
      .text((d) =>
        d.shortName.length > 18 ? d.shortName.slice(0, 17) + "…" : d.shortName,
      );

    nodeSel
      .append("title")
      .text(
        (d) =>
          `${d.id}\nrisk=${d.riskLevel}\nWMC=${d.wmc}  CBO=${d.cbo}  RFC=${d.rfc}  LOC=${d.loc}`,
      );

    // 拖拽
    const dragBehavior = drag<SVGGElement, GraphNode>()
      .on("start", (event, d) => {
        if (!event.active) sim.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) sim.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    nodeSel.call(dragBehavior);

    sim.on("tick", () => {
      linkSel
        .attr("x1", (d) =>
          typeof d.source === "object" ? (d.source.x ?? 0) : 0,
        )
        .attr("y1", (d) =>
          typeof d.source === "object" ? (d.source.y ?? 0) : 0,
        )
        .attr("x2", (d) =>
          typeof d.target === "object" ? (d.target.x ?? 0) : 0,
        )
        .attr("y2", (d) =>
          typeof d.target === "object" ? (d.target.y ?? 0) : 0,
        );
      nodeSel.attr("transform", (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    // 缩放
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        zoomRoot.attr("transform", event.transform.toString());
      });
    root.call(zoomBehavior).on("dblclick.zoom", null);

    // 点击空白取消选中
    root.on("click", () => setSelectedId(null));

    return () => {
      sim.stop();
      root.on("click", null);
      root.on(".zoom", null);
    };
  }, [data]);

  // 高亮 effect：search / selectedId 变化时更新透明度，不重建图
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const root = select(svg);
    const q = search.trim().toLowerCase();

    root.selectAll<SVGGElement, GraphNode>("g.node").each(function (d) {
      let visible = true;
      if (selectedId && neighborIds && !neighborIds.has(d.id)) visible = false;
      if (q && !d.id.toLowerCase().includes(q)) visible = false;
      select(this)
        .attr("opacity", visible ? 1 : 0.12)
        .style("pointer-events", visible ? "auto" : "none");
    });

    root.selectAll<SVGLineElement, GraphLink>("line.link").each(function (d) {
      const s = typeof d.source === "string" ? d.source : d.source.id;
      const t = typeof d.target === "string" ? d.target : d.target.id;
      let visible = true;
      if (selectedId && neighborIds) {
        visible = neighborIds.has(s) && neighborIds.has(t);
      }
      if (q)
        visible =
          visible &&
          (s.toLowerCase().includes(q) || t.toLowerCase().includes(q));
      select(this).attr("opacity", visible ? 0.5 : 0.04);
    });
  }, [search, selectedId, neighborIds, data]);

  if (data.nodes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground p-8">
        当前过滤条件下没有可显示的类
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 工具条 */}
      <div className="px-4 py-2 border-b border-border flex items-center gap-2 flex-wrap shrink-0 bg-card/60">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索类名…"
            className="pl-8 h-8 w-56 text-xs"
          />
        </div>
        <Button
          variant={showOnlyRisky ? "default" : "outline"}
          size="sm"
          onClick={() => setShowOnlyRisky((v) => !v)}
          className="h-8"
        >
          <FilterIcon className="h-3.5 w-3.5" />
          仅风险类
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8"
          onClick={() => {
            setSelectedId(null);
            setSearch("");
            setShowOnlyRisky(false);
          }}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          重置
        </Button>
        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
          {data.nodes.length} 节点 · {data.links.length} 边
        </span>
      </div>

      {/* 画布 */}
      <div className="flex-1 relative min-h-0">
        <svg
          ref={svgRef}
          viewBox="0 0 1400 900"
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
        >
          <defs>
            <marker
              id="arrowhead"
              viewBox="0 -5 10 10"
              refX="14"
              refY="0"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path
                d="M0,-4L8,0L0,4"
                fill="oklch(0.55 0.05 260)"
                opacity="0.6"
              />
            </marker>
          </defs>
          <g className="zoom-root" />
        </svg>

        {/* 图例 */}
        <div className="absolute top-3 left-3 rounded-md border border-border bg-card/95 backdrop-blur px-3 py-2 text-[11px] space-y-1 shadow-sm">
          <div className="text-muted-foreground font-medium uppercase tracking-wider text-[10px] mb-1">
            风险等级
          </div>
          {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as RiskLevel[]).map((rl) => (
            <div key={rl} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  background: RISK_FILL[rl],
                  border: `1px solid ${RISK_STROKE[rl]}`,
                }}
              />
              <span className="font-mono">{rl}</span>
            </div>
          ))}
          <div className="border-t border-border/60 mt-1.5 pt-1.5 text-[10px] text-muted-foreground">
            半径 ∝ √WMC
          </div>
        </div>

        {/* 选中节点详情 */}
        {selectedNode && (
          <div className="absolute bottom-3 right-3 max-w-md rounded-md border border-border bg-card/95 backdrop-blur px-4 py-3 text-xs shadow-md">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[11px] truncate">
                  {selectedNode.id}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-[9px]">
                    {selectedNode.riskLevel}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {selectedNode.packageName || "(default)"}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => setSelectedId(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-border/60">
              <NodeStat label="WMC" value={selectedNode.wmc} />
              <NodeStat label="CBO" value={selectedNode.cbo} />
              <NodeStat label="RFC" value={selectedNode.rfc} />
              <NodeStat label="LoC" value={selectedNode.loc} />
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">
              点击空白或 ✕ 取消聚焦 · 1 跳邻居高亮
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NodeStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="font-mono font-semibold tabular-nums">{value}</div>
    </div>
  );
}
