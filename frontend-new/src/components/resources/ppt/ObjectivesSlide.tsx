import React from "react";
import SlideCanvas, { Card } from "./SlideCanvas";
import type { PptSlide, PptTheme } from "./types";
import { strings, text } from "./types";
export default function ObjectivesSlide({ slide, theme, page, citationLabels }: { slide: PptSlide; theme: PptTheme; page: number; citationLabels?: string }) {
  const goals = strings(slide.bullets); if (!goals.length) goals.push(text(slide.body, "明确核心知识并完成学习检查"));
  return <SlideCanvas slide={slide} theme={theme} page={page} citationLabels={citationLabels} section="学习目标"><div className={`grid h-full content-center gap-[3%] pt-[3%] ${goals.length <= 3 ? "grid-cols-3" : "grid-cols-2"}`}>{goals.slice(0, 6).map((goal, index) => <Card key={`${goal}-${index}`} theme={theme} title={goal} body="完成后能够说明并应用" index={index + 1}/>)}</div></SlideCanvas>;
}
