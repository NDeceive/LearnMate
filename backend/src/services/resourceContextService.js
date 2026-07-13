const { pool } = require("../config/db");

async function buildResourceContext({ studentId, resourceType, subject, knowledgePoint, stageKey, pathVersion }) {
  const id = Number(studentId); if(!Number.isInteger(id)||id<=0) throw apiError("invalid student",401);
  if(!["study_note","mind_map","pptx","quiz_pack","code_case"].includes(resourceType)) throw apiError("unsupported resourceType",400);
  const [[pathRow]] = await pool.query(
    `SELECT v.version,v.snapshot_json FROM student_learning_paths p
     JOIN learning_path_versions v ON v.student_id=p.student_id AND v.version=?
     WHERE p.student_id=? AND (?=p.current_version OR EXISTS(SELECT 1 FROM learning_path_versions x WHERE x.student_id=p.student_id AND x.version=?)) LIMIT 1`,
    [Number(pathVersion),id,Number(pathVersion),Number(pathVersion)]
  );
  if(!pathRow) throw apiError("path version not found",404);
  const snapshot=parse(pathRow.snapshot_json); const stage=(snapshot.stages||[]).find((item)=>item.key===stageKey);
  if(!stage) throw apiError("stageKey not found in path version",422);
  if(stage.subject!==subject||!stage.knowledgePoints.includes(knowledgePoint)) throw apiError("subject or knowledgePoint does not belong to stage",422);
  const pathKnowledgePoints=[...new Set((snapshot.stages||[]).filter((item)=>item.subject===subject).flatMap((item)=>item.knowledgePoints||[]))].slice(0,30);
  const [[profile],mastery,errors,questions,codes] = await Promise.all([
    pool.query(`SELECT prior_knowledge_json,learning_goals_json,explanation_preference,resource_preferences_json,pace_preference,weekly_time_budget_minutes FROM student_profiles WHERE student_id=? LIMIT 1`,[id]),
    pool.query(`SELECT mastery,wrong_count,practice_count FROM student_knowledge_mastery WHERE student_id=? AND subject=? AND knowledge_point=? LIMIT 1`,[id,subject,knowledgePoint]),
    pool.query(`SELECT error_type,occurrence_count,confidence FROM student_error_patterns WHERE student_id=? AND subject=? AND knowledge_point=? ORDER BY occurrence_count DESC LIMIT 8`,[id,subject,knowledgePoint]),
    pool.query(`SELECT question_id,question_type,stem,option_a,option_b,option_c,option_d,answer,analysis,hint,difficulty,knowledge_point
      FROM question_bank WHERE subject=? AND knowledge_point IN (${placeholders(pathKnowledgePoints)})
      ORDER BY CASE WHEN knowledge_point=? THEN 0 WHEN question_id IN (${placeholders(stage.questionIds)}) THEN 1 ELSE 2 END,id LIMIT 10`,[subject,...pathKnowledgePoints,knowledgePoint,...(stage.questionIds||[])]),
    pool.query(`SELECT exercise_id,title,description,language,difficulty,starter_code,sample_input,sample_output,explanation,source,path_completion_eligible
      FROM code_exercises WHERE exercise_id IN (${placeholders(stage.codeExerciseIds)})`,stage.codeExerciseIds||[])
  ]);
  const masteryRow=mastery[0][0]||{}; const estimatedMinutes=Math.max(10,Math.min(120,Number(stage.durationMinutes)||30));
  return {
    studentId:id,resourceType,subject,knowledgePoint,pathKnowledgePoints,pathId:`student-${id}`,pathVersion:Number(pathRow.version),stageKey,
    stageTitle:stage.title,stageGoals:stage.goals,stageType:stage.completion?.type||"learning",
    mastery:Number(masteryRow.mastery??50),weakPoints:Number(masteryRow.mastery??50)<70?[knowledgePoint]:[],
    errorPatterns:errors[0].map((row)=>({errorType:row.error_type,occurrenceCount:Number(row.occurrence_count),confidence:Number(row.confidence)})),
    learningGoals:parseArray(profile[0]?.learning_goals_json),explanationPreference:profile[0]?.explanation_preference||"结构化讲解",
    resourcePreferences:parseArray(profile[0]?.resource_preferences_json),paceAndTimeBudget:{pacePreference:profile[0]?.pace_preference||"适中",weeklyTimeBudgetMinutes:Number(profile[0]?.weekly_time_budget_minutes)||null},
    priorKnowledge:parseArray(profile[0]?.prior_knowledge_json),estimatedMinutes,difficulty:masteryRow.mastery<50?"foundation":masteryRow.mastery<75?"intermediate":"advanced",
    allowedQuestionIds:questions[0].map((row)=>row.question_id),allowedCodeExerciseIds:codes[0].map((row)=>row.exercise_id),
    questionEvidence:questions[0].map((row)=>({questionId:row.question_id,questionType:row.question_type,stem:row.stem,optionA:row.option_a,optionB:row.option_b,optionC:row.option_c,optionD:row.option_d,answer:row.answer,analysis:row.analysis,hint:row.hint,difficulty:row.difficulty,knowledgePoint:row.knowledge_point})),
    codeEvidence:codes[0].map((row)=>({exerciseId:row.exercise_id,title:row.title,description:row.description,language:row.language,difficulty:row.difficulty,starterCode:row.starter_code,sampleInput:row.sample_input,sampleOutput:row.sample_output,explanation:row.explanation,source:row.source,pathCompletionEligible:Boolean(row.path_completion_eligible)}))
  };
}
function placeholders(items){return Array.isArray(items)&&items.length?items.map(()=>"?").join(","):"NULL";}
function parse(v){if(v&&typeof v==="object")return v;try{return JSON.parse(v||"{}");}catch{return {};}} function parseArray(v){const x=parse(v);return Array.isArray(x)?x:[];}
function apiError(message,statusCode){const e=new Error(message);e.statusCode=statusCode;return e;}
module.exports={buildResourceContext};
