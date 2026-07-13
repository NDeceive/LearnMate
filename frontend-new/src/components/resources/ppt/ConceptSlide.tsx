import React from "react";
import SlideCanvas, { Card } from "./SlideCanvas";
import type { Personalization, PptSlide, PptTheme } from "./types";
import { strings, text } from "./types";
export default function ConceptSlide({ slide, theme, page, citationLabels, personalization }: { slide: PptSlide; theme: PptTheme; page: number; citationLabels?: string; personalization?: Personalization }) {
  const features = strings(slide.bullets); if (!features.length) features.push("定义与边界", "适用条件", "关键结构", "结果验证");
  return <SlideCanvas slide={slide} theme={theme} page={page} citationLabels={citationLabels} section="核心概念"><div className="grid h-full grid-cols-[1.1fr_1.4fr] gap-[4%] pt-[4%]"><div className="min-w-0 rounded-lg border p-[7%]" style={{ background: theme.surfaceAlt, borderColor: theme.border }}><span className="text-[clamp(6px,.9vw,9px)] font-bold" style={{ color: theme.primary }}>中心概念</span><h5 className="mt-[9%] line-clamp-2 text-[clamp(12px,2.2vw,22px)] font-black">{text(slide.title, "核心概念")}</h5><p className="mt-[8%] line-clamp-4 text-[clamp(7px,1.1vw,11px)] leading-relaxed" style={{ color: theme.muted }}>{text(slide.body, "从定义、条件、结构与结果四个方面建立完整理解。")}</p>{personalization && <p className="mt-[7%] line-clamp-2 text-[clamp(5px,.8vw,8px)] font-bold" style={{ color: theme.primary }}>{personalization.mastery}</p>}</div><div className="grid min-w-0 grid-cols-2 gap-[4%]">{features.slice(0, 4).map((item, index) => <Card key={`${item}-${index}`} theme={theme} title={item} body="用结构化线索完成理解" index={index + 1}/>)}</div></div></SlideCanvas>;
}
