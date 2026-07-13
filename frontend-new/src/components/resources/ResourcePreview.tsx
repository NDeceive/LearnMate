import React from "react";
import type { LearningResource } from "../../api";
import MindMapViewer, { type MindMapContent } from "./MindMapViewer";
import PptxPreview from "./PptxPreview";
import ResourceReviewPanel from "./ResourceReviewPanel";
import StudyNotePreview from "./StudyNotePreview";
import QuizPackPreview from "./QuizPackPreview";
import CodeCasePreview from "./CodeCasePreview";

export default function ResourcePreview({ resource, onOpenCodeLab }: { resource: LearningResource; onOpenCodeLab?: () => void }) {
  return <div className="space-y-4">
    <div><h2 className="text-xl font-bold text-slate-900">{resource.title}</h2><p className="text-sm text-slate-500">V{resource.version} · {resource.subject} / {resource.knowledgePoint}{resource.retrievalRunId ? ` · 检索 #${resource.retrievalRunId}` : ""}</p></div>
    <div className="rounded-xl bg-blue-50 p-4 text-sm text-slate-700"><strong>目标学习者</strong><p className="mt-1">{resource.targetLearnerSummary}</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full bg-blue-600" style={{width:`${resource.progress?.progressPercent||0}%`}}/></div><p className="mt-1 text-xs">学习进度 {resource.progress?.progressPercent||0}% · {resource.progress?.status||"not_started"}</p></div>
    <ResourceReviewPanel review={resource.review}/>
    {resource.resourceType === "study_note" && <StudyNotePreview content={resource.content as never}/>}
    {resource.resourceType === "mind_map" && <MindMapViewer content={resource.content as unknown as MindMapContent} title={resource.title} citations={resource.citations || []}/>}
    {resource.resourceType === "pptx" && <PptxPreview content={resource.content as { slides?: Array<Record<string, unknown>>; references?: Array<Record<string, string>> }} citations={resource.citations || []}/>}
    {resource.resourceType === "quiz_pack" && <QuizPackPreview resource={resource} content={resource.content as never}/>}
    {resource.resourceType === "code_case" && <CodeCasePreview content={resource.content as never} onOpenCodeLab={onOpenCodeLab}/>}
    <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600"><strong>个性化生成依据</strong><ul className="mt-2 list-disc pl-5">{resource.generationRationale.map((item) => <li key={item}>{item}</li>)}</ul></div>
  </div>;
}
