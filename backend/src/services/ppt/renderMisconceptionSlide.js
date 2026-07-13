const { addNotes, addRect, addText, createSlide } = require("./layoutUtils");
const { cleanText, truncateText } = require("./textUtils");

function normalize(item) {
  if (typeof item === "string") return { mistake: item, reason: "该认识忽略了适用条件或关键步骤。", correction: "回到定义、条件和验证过程重新判断。" };
  return { mistake: item?.mistake || item?.title || "常见错误", reason: item?.description || "该认识与条件、过程或结果不一致。", correction: item?.correction || "使用正确条件逐步验证结论。" };
}

function renderMisconceptionSlide({ pptx, data, theme, pageNumber, citationCatalog }) {
  const slide = createSlide(pptx, data, theme, pageNumber, citationCatalog, { section: "易错点纠正" });
  const items = (Array.isArray(data.items) && data.items.length ? data.items : [data.body || "将相似概念视为完全相同"]).slice(0, 6).map(normalize);
  const h = items.length <= 2 ? 2.25 : items.length <= 4 ? 1.18 : 0.82;
  items.forEach((item, index) => {
    const twoColumns = items.length > 2; const col = twoColumns ? index % 2 : 0; const row = twoColumns ? Math.floor(index / 2) : index;
    const x = twoColumns ? 0.72 + col * 6.15 : 0.82; const y = 1.46 + row * (h + 0.2); const w = twoColumns ? 5.78 : 11.7;
    addRect(slide, pptx, { x, y, w, h, fill: { color: theme.surface }, line: { color: theme.danger, width: 1 } });
    addText(slide, `错误认识  ${truncateText(item.mistake, 60)}`, { x: x + 0.25, y: y + 0.14, w: w * 0.32, h: h - 0.28, fontSize: items.length > 4 ? 12 : 14, bold: true, color: theme.danger, fit: "resize" });
    addText(slide, "→", { x: x + w * 0.34, y: y + h / 2 - 0.13, w: 0.28, h: 0.26, fontSize: 18, bold: true, color: theme.warning, align: "center" });
    addText(slide, `为什么错误\n${truncateText(item.reason, 72)}`, { x: x + w * 0.39, y: y + 0.12, w: w * 0.25, h: h - 0.24, fontSize: items.length > 4 ? 11 : 13, color: theme.muted, fit: "resize" });
    addText(slide, "→", { x: x + w * 0.66, y: y + h / 2 - 0.13, w: 0.28, h: 0.26, fontSize: 18, bold: true, color: theme.success, align: "center" });
    addText(slide, `正确理解\n${truncateText(item.correction, 88)}`, { x: x + w * 0.71, y: y + 0.12, w: w * 0.26, h: h - 0.24, fontSize: items.length > 4 ? 11 : 13, bold: true, color: theme.success, fit: "resize" });
  });
  addNotes(slide, data);
}
module.exports = renderMisconceptionSlide;
