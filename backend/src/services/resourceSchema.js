const crypto = require("crypto");
const RESOURCE_TYPES = new Set(["mind_map", "pptx"]);
const NODE_TYPES = new Set(["root","concept","condition","step","example","warning","misconception","formula","code","summary"]);
const IMPORTANCE = new Set(["high","medium","low"]);
const SLIDE_TYPES = new Set(["title","objectives","concept","process","comparison","misconception","misconceptions","example","code","quiz","summary","next_steps"]);
const REVIEW_STATUS = new Set(["approved","needs_revision","rejected"]);
const SEVERITIES = new Set(["low","medium","high","critical"]);
const CATEGORIES = new Set(["factuality","relevance","structure","clarity","difficulty","safety","citation","duplication","formatting","resource_reference"]);

function validateResourceEnvelope(value, context) {
  object(value, "resource"); whitelist(value, ["resourceType","title","subject","knowledgePoint","learningObjectives","targetLearnerSummary","estimatedMinutes","generationRationale","content"], "resource");
  if (!RESOURCE_TYPES.has(value.resourceType)) fail("unsupported resourceType");
  if (value.resourceType !== context.resourceType || value.subject !== context.subject || value.knowledgePoint !== context.knowledgePoint) fail("resource context mismatch");
  text(value.title, 255); strings(value.learningObjectives, 1, 8, 240); text(value.targetLearnerSummary, 500);
  integer(value.estimatedMinutes, 5, 240); strings(value.generationRationale, 1, 8, 300);
  const content = value.resourceType === "mind_map" ? validateMindMap(value.content) : validatePptx(value.content, new Set(context.allowedQuestionIds || []));
  return { ...value, content };
}

function validateMindMap(value) {
  object(value, "mindMap"); whitelist(value, ["root","crossLinks","highlightNodeIds","misconceptionNodeIds","recommendedSequence"], "mindMap");
  const ids = new Set(); let count = 0;
  function visit(node, depth, ancestors) {
    object(node, "node"); whitelist(node, ["id","label","description","nodeType","importance","children"], "node");
    const id = identifier(node.id); if (ids.has(id)) fail(`duplicate node id: ${id}`); if (ancestors.has(node)) fail("cyclic mind map object");
    ids.add(id); count += 1; if (depth > 6) fail("mind map depth exceeds 6");
    text(node.label, 120); text(node.description || "", 500, true);
    if (!NODE_TYPES.has(node.nodeType)) fail("invalid nodeType"); if (!IMPORTANCE.has(node.importance)) fail("invalid importance");
    if (!Array.isArray(node.children)) fail("children must be an array");
    const next = new Set(ancestors); next.add(node); node.children.forEach((child) => visit(child, depth + 1, next));
  }
  visit(value.root, 1, new Set()); if (value.root.nodeType !== "root") fail("root nodeType required"); if (count < 8 || count > 40) fail("mind map must contain 8 to 40 nodes");
  const crossLinks = array(value.crossLinks, 0, 40).map((link) => { object(link,"crossLink"); whitelist(link,["sourceId","targetId","label"],"crossLink"); if (!ids.has(link.sourceId)||!ids.has(link.targetId)||link.sourceId===link.targetId) fail("invalid crossLink"); text(link.label,120); return link; });
  for (const field of ["highlightNodeIds","misconceptionNodeIds","recommendedSequence"]) strings(value[field],0,40,80).forEach((id)=>{if(!ids.has(id)) fail(`${field} contains unknown node`);});
  return { ...value, crossLinks };
}

function validatePptx(value, allowedQuestionIds) {
  object(value,"pptx"); whitelist(value,["theme","slides"],"pptx"); object(value.theme,"theme"); whitelist(value.theme,["name","primaryTone","density"],"theme"); text(value.theme.name,60); text(value.theme.primaryTone,30); text(value.theme.density,30);
  const slides = array(value.slides,6,15).map((slide,index)=>validateSlide(slide,index,allowedQuestionIds));
  const types = new Set(slides.map((s)=>s.slideType));
  for (const required of ["title","objectives","concept","summary"]) if(!types.has(required)) fail(`missing ${required} slide`);
  if(!types.has("misconception")&&!types.has("misconceptions")) fail("missing misconception slide");
  return { theme:value.theme, slides };
}
function validateSlide(slide,index,allowedQuestionIds){
  object(slide,`slide[${index}]`); const allowed=["slideType","title","subtitle","speakerNotes","bullets","body","steps","left","right","items","language","code","explanation","questionIds","nextSteps"];
  whitelist(slide,allowed,`slide[${index}]`); if(!SLIDE_TYPES.has(slide.slideType)) fail("invalid slideType"); text(slide.title,160); text(slide.subtitle||"",240,true); text(slide.speakerNotes||"",1000,true); text(slide.body||"",1200,true); text(slide.code||"",2500,true); text(slide.explanation||"",800,true);
  for(const field of ["bullets","nextSteps","questionIds"]) if(slide[field]!==undefined) strings(slide[field],0,12,300);
  if(slide.questionIds) slide.questionIds.forEach((id)=>{if(!allowedQuestionIds.has(id)) fail(`invalid questionId: ${id}`);});
  if(slide.steps!==undefined) array(slide.steps,0,12).forEach((step)=>{object(step,"step");whitelist(step,["title","description"],"step");text(step.title,160);text(step.description,500);});
  if(slide.items!==undefined) array(slide.items,0,12).forEach((item)=>{if(typeof item==="string")text(item,300);else{object(item,"item");whitelist(item,["mistake","correction","title","description"],"item");Object.values(item).forEach((v)=>text(v,500));}});
  for(const field of ["left","right"]) if(slide[field]!==undefined){object(slide[field],field);whitelist(slide[field],["title","items"],field);text(slide[field].title,160);strings(slide[field].items,0,12,300);}
  return slide;
}

function validateReview(value) {
  object(value,"review"); whitelist(value,["status","score","issues","correctedContent","summary"],"review"); if(!REVIEW_STATUS.has(value.status))fail("invalid review status"); integer(value.score,0,100); text(value.summary,600);
  const issues=array(value.issues,0,30).map((issue)=>{object(issue,"issue");whitelist(issue,["severity","category","location","message","suggestedFix"],"issue");if(!SEVERITIES.has(issue.severity)||!CATEGORIES.has(issue.category))fail("invalid review issue");text(issue.location,160);text(issue.message,500);text(issue.suggestedFix,500);return issue;});
  if(value.correctedContent!==null&&value.correctedContent!==undefined)object(value.correctedContent,"correctedContent"); return {...value,issues};
}
function fingerprint(value){return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");}
function object(v,p){if(!v||typeof v!=="object"||Array.isArray(v))fail(`${p} must be object`);} function array(v,min,max){if(!Array.isArray(v)||v.length<min||v.length>max)fail("invalid array length");return v;}
function whitelist(v,allowed,p){const set=new Set(allowed);const unknown=Object.keys(v).filter((k)=>!set.has(k));if(unknown.length)fail(`${p} unknown fields: ${unknown.join(",")}`);}
function text(v,max,empty=false){if(typeof v!=="string"||(!empty&&!v.trim())||v.length>max)fail("invalid text");if(/<\/?[a-z][^>]*>|javascript:|https?:\/\//i.test(v))fail("unsafe HTML or URL");return v.trim();}
function strings(v,min,max,len){return array(v,min,max).map((x)=>text(x,len));} function integer(v,min,max){if(!Number.isInteger(Number(v))||Number(v)<min||Number(v)>max)fail("invalid integer");return Number(v);} function identifier(v){const s=text(v,80);if(!/^[A-Za-z0-9_-]+$/.test(s))fail("invalid identifier");return s;}
function fail(message){const e=new Error(message);e.statusCode=422;e.code="INVALID_RESOURCE";throw e;}
module.exports={validateResourceEnvelope,validateMindMap,validatePptx,validateReview,fingerprint};
