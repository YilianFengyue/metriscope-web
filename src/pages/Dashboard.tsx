import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ckSample = [
  { metric: "WMC", value: 18 },
  { metric: "RFC", value: 32 },
  { metric: "DIT", value: 3 },
  { metric: "NOC", value: 2 },
  { metric: "CBO", value: 7 },
  { metric: "LCOM", value: 0.4 },
];

const complexityBuckets = [
  { range: "1-5", count: 124 },
  { range: "6-10", count: 48 },
  { range: "11-20", count: 14 },
  { range: "21+", count: 6 },
];

export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">质量总览</h1>
        <p className="text-muted-foreground text-sm mt-1">
          来自 MetriScope 后端的实时度量（demo 占位数据）
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="CK 度量雷达">
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={ckSample}>
              <PolarGrid stroke="var(--color-border)" />
              <PolarAngleAxis dataKey="metric" stroke="var(--color-muted-foreground)" />
              <PolarRadiusAxis stroke="var(--color-muted-foreground)" />
              <Radar
                name="OrderService"
                dataKey="value"
                stroke="var(--color-primary)"
                fill="var(--color-primary)"
                fillOpacity={0.35}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="圈复杂度分布">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={complexityBuckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="range" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" name="方法数" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-base font-medium mb-3">{title}</h2>
      {children}
    </section>
  );
}
