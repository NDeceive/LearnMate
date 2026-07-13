import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { teacherApi } from "../api/teacher";
import { Metric, PageTitle, State, pct } from "../components/Ui";
export function ClassesPage() {
  const [data, setData] = useState<any[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    setData(undefined);
    setError("");
    teacherApi
      .classes()
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <PageTitle title="班级学情" description="选择当前账号有权访问的班级" />
      <State
        loading={!data.length && !error}
        error={error}
        empty={!data.length}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {data.map((item) => (
            <a
              key={item.id}
              href={`/classes/${item.id}/analytics`}
              className="rounded-2xl border bg-white p-6 hover:border-blue-300"
            >
              <h2 className="font-semibold">{item.className}</h2>
              <p className="mt-2 text-sm text-slate-500">
                {item.subject} · {item.studentCount} 人
              </p>
            </a>
          ))}
        </div>
      </State>
    </>
  );
}
export function ClassAnalyticsPage({ classId }: { classId: number }) {
  const [data, setData] = useState<any>(),
    [error, setError] = useState(""),
    [range, setRange] = useState("30d");
  useEffect(() => {
    teacherApi
      .classAnalytics(classId, range)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [classId, range]);
  return (
    <>
      <PageTitle
        title={data?.class.className || "班级学情"}
        description="趋势、雷达、薄弱点、错误模式与掌握度矩阵均来自数据库"
        action={
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="rounded-xl border bg-white px-3 py-2 text-sm"
          >
            <option value="7d">最近 7 天</option>
            <option value="30d">最近 30 天</option>
            <option value="6w">最近 6 周</option>
          </select>
        }
      />
      <State loading={!data && !error} error={error}>
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="学生数" value={data?.summary.studentCount || 0} />
          <Metric
            label="7 天活跃"
            value={data?.summary.activeStudentCount || 0}
          />
          <Metric
            label="平均正确率"
            value={pct(data?.summary.averageQuizAccuracy)}
          />
          <Metric
            label="平均路径进度"
            value={pct(data?.summary.averagePathProgress)}
          />
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Chart title="知识点雷达">
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={data?.radar || []}>
                <PolarGrid />
                <PolarAngleAxis
                  dataKey="knowledgePoint"
                  tick={{ fontSize: 11 }}
                />
                <Radar
                  dataKey="mastery"
                  stroke="#2563eb"
                  fill="#2563eb"
                  fillOpacity={0.25}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Chart>
          <Chart title="风险分布">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data?.riskDistribution || []}
                  dataKey="count"
                  nameKey="level"
                  outerRadius={90}
                  fill="#2563eb"
                  label
                />
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Chart>
          <Chart title="错误模式分布">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.errorPatternDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Chart>
          <Chart title="掌握度矩阵">
            <div className="max-h-[300px] overflow-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  {data?.masteryMatrix?.map((row: any) => (
                    <tr key={row.studentId}>
                      <td className="py-3 font-medium">{row.displayName}</td>
                      <td className="py-3 text-right">
                        {row.values.map((v: any) => (
                          <span
                            key={v.knowledgePoint}
                            title={`${v.knowledgePoint} ${v.mastery}%`}
                            className={`ml-1 inline-block rounded px-2 py-1 text-xs ${v.grade === "A" ? "bg-emerald-50 text-emerald-700" : v.grade === "B" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}
                          >
                            {v.grade}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Chart>
        </div>
      </State>
    </>
  );
}
function Chart({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </section>
  );
}
