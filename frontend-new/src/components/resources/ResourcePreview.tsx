import React from "react";
import type { LearningResource } from "../../api";
import MindMapViewer, { type MindMapContent } from "./MindMapViewer";
import PptxPreview from "./PptxPreview";
import ResourceReviewPanel from "./ResourceReviewPanel";
export default function ResourcePreview({ resource }: { resource: LearningResource }) {
  return <div className="space-y-4"><div><h2 className="text-xl font-bold text-slate-900">{resource.title}</h2><p className="text-sm text-slate-500">V{resource.version} · {resource.subject} / {resource.knowledgePoint}{resource.retrievalRunId ? ` · 检索 #${resource.retrievalRunId}` : ""}</p></div><ResourceReviewPanel review={resource.review}/>{resource.resourceType === "mind_map" ? <MindMapViewer content={resource.content as unknown as MindMapContent} title={resource.title} citations={resource.citations || []}/> : <PptxPreview content={resource.content as { slides?: Array<Record<string, unknown>>; references?: Array<Record<string, string>> }} citations={resource.citations || []}/>}<div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600"><strong>生成依据</strong><ul className="mt-2 list-disc pl-5">{resource.generationRationale.map((item) => <li key={item}>{item}</li>)}</ul></div></div>;
}
