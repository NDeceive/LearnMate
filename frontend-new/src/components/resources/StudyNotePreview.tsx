import React from "react";

interface StudyNoteContent {
  personalizedObjectives: string[]; foundationSummary: string[] | string;
  coreConcepts: Array<{ title: string; explanation: string; importance: string }>;
  diagrams: Array<{ title: string; description: string; steps: string[] }>;
  methodsAndFormulas: Array<{ title: string; expression: string; explanation: string; conditions: string[] }>;
  workedExamples: Array<{ question: string; steps: string[]; answer: string }>;
  commonMistakes: Array<{ mistake: string; reason: string; correction: string }>;
  practiceTasks: Array<{ prompt: string; hint: string; answerGuide: string }>;
  studyAdvice: string[]; citationBasis: string[];
}

export default function StudyNotePreview({content}:{content:StudyNoteContent}) {
  const sections = [
    {title:"个性化学习目标", items:content.personalizedObjectives},
    {title:"学习建议", items:content.studyAdvice},
    {title:"引用依据", items:content.citationBasis}
  ];
  return <div className="space-y-4">
    <section className="rounded-xl border border-blue-100 bg-blue-50 p-4"><h3 className="font-bold text-blue-900">当前基础摘要</h3><p className="mt-2 text-sm leading-7 text-slate-700">{String(content.foundationSummary)}</p></section>
    <section className="grid gap-3 md:grid-cols-2">{content.coreConcepts.map((item)=><article key={item.title} className="rounded-xl border p-4"><div className="flex justify-between gap-2"><h3 className="font-bold">{item.title}</h3><span className="text-xs text-blue-600">{item.importance}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{item.explanation}</p></article>)}</section>
    {content.diagrams.map((item)=><section key={item.title} className="rounded-xl border p-4"><h3 className="font-bold">图示：{item.title}</h3><p className="mt-2 text-sm text-slate-600">{item.description}</p><div className="mt-3 flex flex-wrap items-center gap-2 text-xs">{item.steps.map((step,index)=><React.Fragment key={step}><span className="rounded-lg bg-slate-100 px-3 py-2">{step}</span>{index<item.steps.length-1&&<span>→</span>}</React.Fragment>)}</div></section>)}
    {content.methodsAndFormulas.map((item)=><section key={item.title} className="rounded-xl border p-4"><h3 className="font-bold">方法或公式：{item.title}</h3><code className="mt-2 block rounded-lg bg-slate-900 p-3 text-sm text-white">{item.expression}</code><p className="mt-2 text-sm text-slate-600">{item.explanation}</p></section>)}
    {content.workedExamples.map((item)=><section key={item.question} className="rounded-xl border p-4"><h3 className="font-bold">例题讲解</h3><p className="mt-2 text-sm">{item.question}</p><ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">{item.steps.map(step=><li key={step}>{step}</li>)}</ol><p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm"><strong>答案：</strong>{item.answer}</p></section>)}
    <section className="rounded-xl border border-rose-100 bg-rose-50 p-4"><h3 className="font-bold text-rose-900">易错点</h3>{content.commonMistakes.map(item=><div key={item.mistake} className="mt-3 text-sm"><strong>{item.mistake}</strong><p className="mt-1 text-slate-600">原因：{item.reason}</p><p className="text-slate-600">纠正：{item.correction}</p></div>)}</section>
    <section className="rounded-xl border p-4"><h3 className="font-bold">巩固练习</h3>{content.practiceTasks.map((item,index)=><details key={item.prompt} className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"><summary className="cursor-pointer font-semibold">{index+1}. {item.prompt}</summary><p className="mt-2 text-slate-600">提示：{item.hint}</p><p className="mt-1 text-slate-600">参考评分点：{item.answerGuide}</p></details>)}</section>
    <section className="grid gap-3 md:grid-cols-3">{sections.map(section=><div key={section.title} className="rounded-xl bg-slate-50 p-4"><h3 className="font-bold">{section.title}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">{section.items.map(item=><li key={item}>{item}</li>)}</ul></div>)}</section>
  </div>;
}
