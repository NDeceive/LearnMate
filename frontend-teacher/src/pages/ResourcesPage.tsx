import { useEffect, useMemo, useState } from "react";
import { teacherApi } from "../api/teacher";
import type { StudentCard } from "../types";
import { PageTitle, State } from "../components/Ui";
export function ResourcesPage() {
  const [students, setStudents] = useState<StudentCard[]>([]),
    [studentId, setStudentId] = useState(0),
    [detail, setDetail] = useState<any>(),
    [pathVersion, setPathVersion] = useState(0),
    [stageKey, setStageKey] = useState(""),
    [resourceType, setResourceType] = useState("mind_map"),
    [teacherNote, setTeacherNote] = useState(""),
    [regenerate, setRegenerate] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [generating, setGenerating] = useState(false);
  useEffect(() => {
    teacherApi
      .students({ pageSize: 100 })
      .then((r) => {
        setStudents(r.data);
        if (r.data[0]) setStudentId(r.data[0].studentId);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!studentId) return;
    teacherApi
      .studentDetail(studentId)
      .then((value) => {
        setDetail(value);
        const version =
          value.path.versions?.[0]?.version || value.path.currentVersion || 0;
        setPathVersion(version);
        const selected = value.path.versions?.find(
          (x: any) => x.version === version,
        );
        setStageKey(selected?.snapshot?.stages?.[0]?.key || "");
      })
      .catch((e) => setError(e.message));
  }, [studentId]);
  const versions = detail?.path.versions || [];
  const stages = useMemo(
    () =>
      versions.find((x: any) => x.version === pathVersion)?.snapshot?.stages ||
      [],
    [versions, pathVersion],
  );
  useEffect(() => {
    if (stages.length && !stages.some((x: any) => x.key === stageKey))
      setStageKey(stages[0].key);
  }, [stages, stageKey]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError("");
    setMessage("");
    try {
      const result = await teacherApi.generateResource(studentId, {
        resourceType,
        pathVersion,
        stageKey,
        regenerate,
        teacherNote,
      });
      setMessage(
        `资源已生成：${result.resource.title}（V${result.resource.version}）`,
      );
      setDetail(await teacherApi.studentDetail(studentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败");
    } finally {
      setGenerating(false);
    }
  };
  return (
    <>
      <PageTitle
        title="个性化资源"
        description="为管理学生的真实路径阶段生成思维导图或 PPTX，资源仍归学生所有"
      />
      <State
        loading={loading}
        error={error && !students.length ? error : ""}
        empty={!students.length}
      >
        <div className="grid gap-6 lg:grid-cols-5">
          <form
            onSubmit={submit}
            className="rounded-2xl border bg-white p-6 lg:col-span-2"
          >
            <Field label="学生">
              <select
                value={studentId}
                onChange={(e) => setStudentId(Number(e.target.value))}
                className="control"
              >
                {students.map((x) => (
                  <option key={x.studentId} value={x.studentId}>
                    {x.displayName} · {x.className}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="学习路径版本">
              <select
                value={pathVersion}
                onChange={(e) => setPathVersion(Number(e.target.value))}
                className="control"
              >
                {versions.map((x: any) => (
                  <option key={x.version} value={x.version}>
                    V{x.version} · {x.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="真实路径阶段">
              <select
                value={stageKey}
                onChange={(e) => setStageKey(e.target.value)}
                className="control"
              >
                {stages.map((x: any) => (
                  <option key={x.key} value={x.key}>
                    {x.title || x.key}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="资源类型">
              <select
                value={resourceType}
                onChange={(e) => setResourceType(e.target.value)}
                className="control"
              >
                <option value="mind_map">思维导图</option>
                <option value="pptx">PPTX 课件</option>
              </select>
            </Field>
          <Field label="教师审计备注（不参与生成，也不能覆盖知识库证据）">
              <textarea
                value={teacherNote}
                onChange={(e) => setTeacherNote(e.target.value)}
                maxLength={500}
                className="control min-h-24"
              />
            </Field>
            <label className="flex gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={regenerate}
                onChange={(e) => setRegenerate(e.target.checked)}
              />
              允许在上下文变化后重新生成
            </label>
            {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
            {message && (
              <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                {message}
              </p>
            )}
            <button
              disabled={generating || !stageKey}
              className="mt-5 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white disabled:opacity-50"
            >
              {generating ? "正在生成并审核…" : "生成真实学习资源"}
            </button>
          </form>
          <section className="rounded-2xl border bg-white p-6 lg:col-span-3">
            <h2 className="font-semibold">该学生已有资源</h2>
            <div className="mt-4 divide-y">
              {detail?.resources?.length ? (
                detail.resources.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-4"
                  >
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {item.resource_type} · 路径 V{item.path_version} ·{" "}
                        {item.stage_key}
                      </div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                      {item.status} / {item.progress_status || "未开始"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="py-10 text-center text-sm text-slate-400">
                  暂无资源
                </p>
              )}
            </div>
          </section>
        </div>
      </State>
    </>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 block text-xs font-medium text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
