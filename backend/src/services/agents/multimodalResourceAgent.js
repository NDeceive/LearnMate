const { generateText, isAIEnabled } = require("../aiService");
const { validateResourceEnvelope } = require("../resourceSchema");
const { buildStudyNote } = require("../studyNoteService");
const { buildQuizPack } = require("../quizPackService");
const { buildCodeCase } = require("../codeCaseService");

async function generateStructuredResource(context) {
  const fallback=buildFallback(context);
  if(process.env.MULTIMODAL_RESOURCE_AI_ENABLED!=="true"||!isAIEnabled()) return {content:fallback,source:"deterministic",model:null};
  try{
    const prompt=["Return strict JSON only. Never use HTML, URLs, file paths, or IDs outside allowed lists.",JSON.stringify(minimalModelContext(context)),`Required schema follows the LearnMate ${context.resourceType} contract. Preserve every verified question or exercise field supplied by the context.`].join("\n");
    const raw=await generateText({messages:[{role:"system",content:"You are ResourceAgent. Output strict JSON only."},{role:"user",content:prompt}],temperature:.2,maxTokens:5000});
    if(!raw||raw.trim()[0]!=="{"||raw.trim().slice(-1)!=="}")throw new Error("non JSON output");
    return {content:validateResourceEnvelope(JSON.parse(raw.trim()),context),source:"spark",model:process.env.SPARK_MODEL||"lite"};
  }catch{return {content:fallback,source:"deterministic_fallback",model:null};}
}
function buildFallback(c){const builders={study_note:buildStudyNote,mind_map:mindMap,pptx,quiz_pack:buildQuizPack,code_case:buildCodeCase};return validateResourceEnvelope(base(c,builders[c.resourceType](c)),c);}
function base(c,content){const names={study_note:"学习讲义",mind_map:"思维导图",pptx:"学习课件",quiz_pack:"练习包",code_case:"代码实操案例"};return{resourceType:c.resourceType,title:`${c.knowledgePoint}个性化${names[c.resourceType]}`,subject:c.subject,knowledgePoint:c.knowledgePoint,learningObjectives:c.stageGoals.slice(0,5).length?c.stageGoals.slice(0,5):[`掌握${c.knowledgePoint}`],targetLearnerSummary:`当前掌握度 ${c.mastery}，偏好${c.explanationPreference}，学习节奏${c.paceAndTimeBudget?.pacePreference||"适中"}。`,estimatedMinutes:c.estimatedMinutes,generationRationale:[`路径阶段：${c.stageTitle}`,`当前掌握度：${c.mastery}`,c.errorPatterns[0]?`主要错误模式：${c.errorPatterns[0].errorType}`:"暂无高频错误模式",`资源偏好：${c.resourcePreferences.join("、")||"结构化资源"}`],content};}
function mindMap(c){const kp=c.knowledgePoint;const err=c.errorPatterns[0]?.errorType||"易错点复盘";return {root:{id:"root",label:kp,description:`${c.stageTitle}的核心知识结构`,nodeType:"root",importance:"high",children:[
  {id:"objectives",label:"学习目标",description:c.stageGoals.join("；"),nodeType:"summary",importance:"high",children:[{id:"goal-1",label:c.stageGoals[0]||"理解核心概念",description:"结合当前路径目标学习",nodeType:"concept",importance:"high",children:[]}]},
  {id:"concepts",label:"核心概念",description:`围绕${kp}建立概念边界`,nodeType:"concept",importance:"high",children:[{id:"conditions",label:"适用条件",description:"识别前提、输入与边界条件",nodeType:"condition",importance:"medium",children:[]},{id:"process",label:"关键步骤",description:"按顺序拆分操作并检查状态变化",nodeType:"step",importance:"high",children:[]}]},
  {id:"practice",label:"练习与验证",description:"使用路径阶段允许的真实练习",nodeType:"example",importance:"medium",children:[{id:"quiz",label:"自测题",description:c.allowedQuestionIds.length?`题目：${c.allowedQuestionIds.join("、")}`:"使用概念复述完成自测",nodeType:"example",importance:"medium",children:[]},{id:"code",label:"代码实践",description:c.allowedCodeExerciseIds.length?`CodeLab：${c.allowedCodeExerciseIds.join("、")}`:"当前阶段无绑定代码练习",nodeType:"code",importance:"low",children:[]}]},
  {id:"misconception",label:"常见错误",description:err,nodeType:"misconception",importance:"high",children:[{id:"warning",label:"纠错检查",description:"逐步核对操作顺序、条件和结果",nodeType:"warning",importance:"high",children:[]}]}
]},crossLinks:[{sourceId:"process",targetId:"misconception",label:"步骤错误会触发易错模式"}],highlightNodeIds:["concepts","process"],misconceptionNodeIds:["misconception","warning"],recommendedSequence:["objectives","concepts","conditions","process","misconception","practice","quiz"]};}
function pptx(c){const kp=c.knowledgePoint;const q=c.allowedQuestionIds.slice(0,3);const err=c.errorPatterns[0]?.errorType||"概念边界混淆";return {theme:{name:"academic-light",primaryTone:"blue",density:"medium"},slides:[
  {slideType:"title",title:`${kp}专项学习`,subtitle:`基于路径阶段“${c.stageTitle}”生成`,speakerNotes:"介绍学习背景与目标。"},
  {slideType:"objectives",title:"学习目标",bullets:c.stageGoals.slice(0,5),speakerNotes:"逐项说明验收目标。"},
  {slideType:"concept",title:"核心概念",body:`围绕${kp}建立定义、适用条件、关键状态与结果之间的联系。`,bullets:[`当前掌握度：${c.mastery}`,`难度：${c.difficulty}`],speakerNotes:"结合学生已有基础讲解。"},
  {slideType:"process",title:"分步学习过程",steps:[{title:"识别条件",description:"先确认输入、前提与边界。"},{title:"执行步骤",description:"按顺序跟踪关键状态变化。"},{title:"验证结果",description:"使用反例与测试检查结论。"}],speakerNotes:"强调不能跳步。"},
  {slideType:"misconceptions",title:"常见错误与纠正",items:[{mistake:err,correction:"逐步核对条件、顺序和最终状态，并记录错误证据。"}],speakerNotes:"结合当前错误模式。"},
  ...(c.allowedCodeExerciseIds.length?[{slideType:"code",title:"CodeLab 实践",language:c.codeEvidence[0]?.language||"c",code:"// 请在真实 CodeLab 练习中完成核心实现\nint main(void) { return 0; }",explanation:`关联练习：${c.allowedCodeExerciseIds.join("、")}`,speakerNotes:"本页代码仅作教学框架，不执行。"}]:[]),
  ...(q.length?[{slideType:"quiz",title:"阶段自测题",questionIds:q,speakerNotes:"题目 ID 来自当前路径允许题库。"}]:[{slideType:"example",title:"概念自测",body:"请复述核心概念、适用条件与常见错误。",speakerNotes:"当前阶段未绑定客观题。"}]),
  {slideType:"summary",title:"本节总结",bullets:[`掌握${kp}的核心概念`,`能够按步骤完成分析`,`能够识别并纠正常见错误`],nextSteps:["回到学习路径完成阶段验收"],speakerNotes:"总结并引导后续学习。"}
]};}
function minimalModelContext(c){return{resourceType:c.resourceType,subject:c.subject,knowledgePoint:c.knowledgePoint,stageTitle:c.stageTitle,stageGoals:c.stageGoals,mastery:c.mastery,errorPatterns:c.errorPatterns,learningGoals:c.learningGoals,explanationPreference:c.explanationPreference,resourcePreferences:c.resourcePreferences,priorKnowledge:c.priorKnowledge,paceAndTimeBudget:c.paceAndTimeBudget,estimatedMinutes:c.estimatedMinutes,difficulty:c.difficulty,allowedQuestionIds:c.allowedQuestionIds,allowedCodeExerciseIds:c.allowedCodeExerciseIds,questionEvidence:c.questionEvidence,codeEvidence:c.codeEvidence};}
module.exports={generateStructuredResource,buildFallback};
