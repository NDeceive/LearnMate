import { useEffect, useState } from "react";
import { teacherApi } from "../api/teacher";
import { PageTitle, State } from "../components/Ui";

export function ClassesPage() {
  const [data, setData] = useState<any[] | undefined>();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setData(undefined);
    setError("");
    teacherApi
      .classes()
      .then((result) => {
        if (!cancelled) setData(result.data);
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageTitle title="班级学情" description="选择当前账号有权访问的班级" />
      <State loading={!data && !error} error={error} empty={Boolean(data && data.length === 0)}>
        <div className="grid gap-4 md:grid-cols-2">
          {(data || []).map((item) => (
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
