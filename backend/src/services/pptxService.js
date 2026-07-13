const fs = require("fs/promises");
const PptxGenJS = require("pptxgenjs");
const JSZip = require("jszip");
const { resolveTheme } = require("./ppt/themes");
const { expandSlides, inferPersonalization } = require("./ppt/textUtils");
const renderTitleSlide = require("./ppt/renderTitleSlide");
const renderObjectivesSlide = require("./ppt/renderObjectivesSlide");
const renderConceptSlide = require("./ppt/renderConceptSlide");
const renderProcessSlide = require("./ppt/renderProcessSlide");
const renderComparisonSlide = require("./ppt/renderComparisonSlide");
const renderMisconceptionSlide = require("./ppt/renderMisconceptionSlide");
const renderExampleSlide = require("./ppt/renderExampleSlide");
const renderCodeSlide = require("./ppt/renderCodeSlide");
const renderQuizSlide = require("./ppt/renderQuizSlide");
const renderSummarySlide = require("./ppt/renderSummarySlide");
const renderNextStepsSlide = require("./ppt/renderNextStepsSlide");
const renderReferencesSlide = require("./ppt/renderReferencesSlide");

const MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
const RENDERERS = {
  title: renderTitleSlide,
  objectives: renderObjectivesSlide,
  concept: renderConceptSlide,
  process: renderProcessSlide,
  comparison: renderComparisonSlide,
  misconception: renderMisconceptionSlide,
  misconceptions: renderMisconceptionSlide,
  example: renderExampleSlide,
  code: renderCodeSlide,
  quiz: renderQuizSlide,
  summary: renderSummarySlide,
  next_steps: renderNextStepsSlide,
  references: renderReferencesSlide,
};

async function generatePptx(content = {}, filePath, citationCatalog = []) {
  const sourceSlides = Array.isArray(content.slides) ? content.slides : [];
  const slides = expandSlides(sourceSlides);
  const theme = resolveTheme(content.theme);
  const personalization = inferPersonalization(sourceSlides);
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "LearnMate";
  pptx.subject = "个性化学习课件";
  pptx.title = sourceSlides[0]?.title || "LearnMate 个性化学习课件";
  pptx.company = "LearnMate · 计智引擎";
  pptx.lang = "zh-CN";
  pptx.theme = { headFontFace: "Microsoft YaHei", bodyFontFace: "Microsoft YaHei", lang: "zh-CN" };

  let pageNumber = 1;
  slides.forEach((data) => {
    const renderer = RENDERERS[data.slideType] || renderConceptSlide;
    renderer({ pptx, data, theme, pageNumber, citationCatalog, personalization });
    pageNumber += 1;
  });
  const references = Array.isArray(content.references) ? content.references : [];
  for (let offset = 0; offset < references.length; offset += 6) {
    renderReferencesSlide({ pptx, data: { slideType: "references", title: offset ? `参考资料（续 ${Math.floor(offset / 6) + 1}）` : "参考资料", references: references.slice(offset, offset + 6), offset }, theme, pageNumber, citationCatalog, personalization });
    pageNumber += 1;
  }
  if (!slides.length) {
    const data = { slideType: "concept", title: "个性化学习课件", body: "当前课件暂无可展示页面。" };
    renderConceptSlide({ pptx, data, theme, pageNumber, citationCatalog, personalization });
  }
  await pptx.writeFile({ fileName: filePath });
  await validatePptxFile(filePath);
  return filePath;
}

async function validatePptxFile(filePath) {
  const bytes = await fs.readFile(filePath);
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error("PPTX is not a ZIP package");
  const zip = await JSZip.loadAsync(bytes);
  const entries = Object.keys(zip.files);
  for (const name of ["[Content_Types].xml", "ppt/presentation.xml", "ppt/slides/slide1.xml"]) if (!zip.file(name)) throw new Error(`PPTX missing ${name}`);
  const slideEntries = entries.filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
  if (!slideEntries.length) throw new Error("PPTX contains no slides");
  const externalRelationships = [];
  for (const name of entries.filter((entry) => entry.endsWith(".rels"))) {
    const xml = await zip.file(name).async("string");
    if (/TargetMode=["']External["']/i.test(xml)) externalRelationships.push(name);
  }
  return {
    size: bytes.length,
    entries,
    slideCount: slideEntries.length,
    notesCount: entries.filter((name) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name)).length,
    externalRelationships,
  };
}

module.exports = { generatePptx, validatePptxFile, resolveTheme, expandSlides, MIME, RENDERERS };
