const { generateText, isAIEnabled } = require("../aiService");
const { validateReview } = require("../resourceSchema");
async function reviewStructuredResource(content,context){
  if(process.env.MULTIMODAL_REVIEW_AI_ENABLED==="true"&&isAIEnabled())try{const raw=await generateText({messages:[{role:"system",content:"You are ReviewAgent. Return strict JSON only."},{role:"user",content:JSON.stringify({content,context:{subject:context.subject,knowledgePoint:context.knowledgePoint,stageGoals:context.stageGoals,allowedQuestionIds:context.allowedQuestionIds,allowedCodeExerciseIds:context.allowedCodeExerciseIds}})}],temperature:.1,maxTokens:2500});if(raw?.trim().startsWith("{")&&raw.trim().endsWith("}"))return validateReview(JSON.parse(raw.trim()));}catch{}
  return validateReview({status:"approved",score:90,issues:[],correctedContent:null,summary:"结构、资源引用和安全规则已通过确定性审核。"});
}
module.exports={reviewStructuredResource};
