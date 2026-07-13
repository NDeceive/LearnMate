import React from "react";
import type { Citation } from "../knowledge/CitationPanel";
import CodeSlide from "./ppt/CodeSlide";
import ComparisonSlide from "./ppt/ComparisonSlide";
import ConceptSlide from "./ppt/ConceptSlide";
import ExampleSlide from "./ppt/ExampleSlide";
import MisconceptionSlide from "./ppt/MisconceptionSlide";
import NextStepsSlide from "./ppt/NextStepsSlide";
import ObjectivesSlide from "./ppt/ObjectivesSlide";
import ProcessSlide from "./ppt/ProcessSlide";
import QuizSlide from "./ppt/QuizSlide";
import ReferencesSlide from "./ppt/ReferencesSlide";
import SummarySlide from "./ppt/SummarySlide";
import TitleSlide from "./ppt/TitleSlide";
import type { Personalization, PptSlide, PptTheme } from "./ppt/types";
import { expandSlides, inferPersonalization, resolveTheme, strings, text } from "./ppt/types";

interface PptxContent { theme?: unknown; slides?: Array<Record<string, unknown>>; references?: Array<Record<string, string>> }
interface SlideProps { key?: React.Key; slide: PptSlide; theme: PptTheme; page: number; citationLabels?: string; personalization: Personalization }

function SlideByType(props: SlideProps) {
  const base = { slide: props.slide, theme: props.theme, page: props.page, citationLabels: props.citationLabels };
  switch (text(props.slide.slideType, "concept")) {
    case "title": return <TitleSlide {...base} personalization={props.personalization}/>;
    case "objectives": return <ObjectivesSlide {...base}/>;
    case "process": return <ProcessSlide {...base}/>;
    case "comparison": return <ComparisonSlide {...base}/>;
    case "misconception": case "misconceptions": return <MisconceptionSlide {...base}/>;
    case "example": return <ExampleSlide {...base}/>;
    case "code": return <CodeSlide {...base}/>;
    case "quiz": return <QuizSlide {...base}/>;
    case "summary": return <SummarySlide {...base}/>;
    case "next_steps": return <NextStepsSlide {...base}/>;
    default: return <ConceptSlide {...base} personalization={props.personalization}/>;
  }
}

export default function PptxPreview({ content, citations = [] }: { content: PptxContent; citations?: Citation[] }) {
  const theme = resolveTheme(content.theme);
  const sourceSlides = (content.slides || []) as PptSlide[];
  const slides = expandSlides(sourceSlides);
  const personalization = inferPersonalization(sourceSlides);
  const referenceGroups: Array<Array<Record<string, string>>> = [];
  for (let index = 0; index < (content.references || []).length; index += 6) referenceGroups.push((content.references || []).slice(index, index + 6));
  return <div className="grid min-w-0 gap-3 overflow-x-hidden sm:grid-cols-2">
    {slides.map((slide, index) => {
      const ids = strings(slide.citations).map(Number);
      const labels = citations.filter((item) => ids.includes(item.chunkId)).map((item) => `[${item.label}]`).join(" ");
      return <SlideByType key={`${text(slide.slideType)}-${index}`} slide={slide} theme={theme} page={index + 1} citationLabels={labels} personalization={personalization}/>;
    })}
    {referenceGroups.map((references, index) => <ReferencesSlide key={`references-${index}`} references={references} offset={index * 6} theme={theme} page={slides.length + index + 1}/>)}
  </div>;
}
