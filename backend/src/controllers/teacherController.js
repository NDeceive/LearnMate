const fs=require("fs");
const {pool}=require("../config/db");
const analytics=require("../services/teacherAnalyticsService");
const access=require("../services/teacherAccessService");
const reports=require("../services/teacherReportService");
const resources=require("../services/resourceGenerationService");
const {buildAgentLogSummary,logAgentRun}=require("../services/agentLogService");
const crypto=require("crypto");

async function dashboard(req,res){return respond(res,()=>analytics.getDashboardOverview(req.user));}
async function trends(req,res){return respond(res,()=>analytics.getDashboardTrends(req.user,req.query.range));}
async function classes(req,res){return respond(res,async()=>({data:await analytics.listClasses(req.user)}));}
async function classAnalytics(req,res){return respond(res,()=>analytics.getClassAnalytics(req.user,req.params.classId,req.query.range));}
async function students(req,res){return respond(res,()=>analytics.listStudents(req.user,req.query));}
async function studentDetail(req,res){return respond(res,()=>analytics.getStudentDetail(req.user,req.params.studentId));}
function studentSection(section){return async(req,res)=>respond(res,async()=>{const detail=await analytics.getStudentDetail(req.user,req.params.studentId);return{data:detail[section]};});}

async function generateStudentResource(req,res){return respond(res,async()=>{
  const studentId=await access.assertTeacherCanAccessStudent(req.user,req.params.studentId);const body=req.body||{};
  if(body.teacherId!==undefined||body.mastery!==undefined||body.errorPatterns!==undefined||body.profile!==undefined||body.citations!==undefined||body.storagePath!==undefined)throw apiError("请求包含不允许由教师端指定的字段",400);
  const teacherNote=String(body.teacherNote||"");if(teacherNote.length>500)throw apiError("教师备注不能超过 500 个字符",400);
  const pathVersion=Number(body.pathVersion);const stageKey=String(body.stageKey||"");
  const [[row]]=await pool.query("SELECT snapshot_json FROM learning_path_versions WHERE student_id=? AND version=? LIMIT 1",[studentId,pathVersion]);if(!row)throw apiError("学习路径版本不存在",422);
  const snapshot=parse(row.snapshot_json),stage=(snapshot.stages||[]).find((item)=>item.key===stageKey);if(!stage)throw apiError("学习阶段不存在",422);
  const subject=String(stage.subject||"").trim(),knowledgePoint=String((stage.knowledgePoints||[])[0]||"").trim();if(!subject||!knowledgePoint)throw apiError("学习阶段缺少可生成资源的知识点",422);
  const resource=await resources.generateResource({studentId,resourceType:body.resourceType,subject,knowledgePoint,pathVersion,stageKey,regenerate:Boolean(body.regenerate)});
  await pool.query("UPDATE learning_resources SET requested_by_teacher_id=? WHERE id=? AND student_id=?",[req.user.userId,resource.id,studentId]);
  const note=teacherNote.trim();await logAgentRun({agentName:"TeacherResourceRequest",taskType:"resource_generation",studentId,resourceId:resource.id,pathVersion,status:"success",source:"teacher",inputText:{studentId,requestedByTeacherId:req.user.userId,resourceType:body.resourceType,pathVersion,stageKey,teacherNoteProvided:Boolean(note),teacherNoteLength:note.length,teacherNoteSha256:note?crypto.createHash("sha256").update(note).digest("hex"):null},outputText:{resourceId:resource.id,status:resource.status}});
  return{resource,audit:{requestedByTeacherId:req.user.userId,teacherNoteRecorded:Boolean(note)}};
});}

async function quizAnalytics(req,res){return respond(res,async()=>{
  const ids=await access.listManagedStudentIds(req.user);const page=Math.max(1,Number(req.query.page)||1),pageSize=Math.max(1,Math.min(100,Number(req.query.pageSize)||20));
  if(!ids.length)return{summary:{attemptCount:0,participantCount:0,averageAccuracy:null},recentAttempts:[],accuracyDistribution:[],frequentWrongQuestions:[],frequentWrongKnowledgePoints:[],pagination:{page,pageSize,total:0},codeLab:{available:false,message:"当前系统尚未接入实时监考或真实代码沙箱"}};
  const ph=ids.map(()=>"?").join(",");const [[summary]]=await pool.query(`SELECT COUNT(*) attempt_count,COUNT(DISTINCT student_id) participant_count,SUM(correct_count) correct_count,SUM(total_count) total_count FROM quiz_attempts WHERE student_id IN (${ph})`,ids);
  const [[count]]=await pool.query(`SELECT COUNT(*) total FROM quiz_attempts WHERE student_id IN (${ph})`,ids);
  const [attempts,wrongQuestions,wrongPoints,distribution]=await Promise.all([
    pool.query(`SELECT q.id,q.student_id,u.display_name,q.subject,q.score,q.correct_count,q.total_count,q.started_at,q.submitted_at FROM quiz_attempts q JOIN users u ON u.id=q.student_id WHERE q.student_id IN (${ph}) ORDER BY q.submitted_at DESC LIMIT ? OFFSET ?`,[...ids,pageSize,(page-1)*pageSize]),
    pool.query(`SELECT a.question_id,COALESCE(qb.stem,a.question_id) stem,COUNT(*) wrong_count FROM quiz_attempt_answers a JOIN quiz_attempts q ON q.id=a.attempt_id LEFT JOIN question_bank qb ON qb.question_id=a.question_id WHERE q.student_id IN (${ph}) AND a.is_correct=0 GROUP BY a.question_id,qb.stem ORDER BY wrong_count DESC LIMIT 10`,ids),
    pool.query(`SELECT COALESCE(qb.knowledge_point,'未分类') knowledge_point,COUNT(*) wrong_count FROM quiz_attempt_answers a JOIN quiz_attempts q ON q.id=a.attempt_id LEFT JOIN question_bank qb ON qb.question_id=a.question_id WHERE q.student_id IN (${ph}) AND a.is_correct=0 GROUP BY qb.knowledge_point ORDER BY wrong_count DESC LIMIT 10`,ids),
    pool.query(`SELECT CASE WHEN score<50 THEN '0-49' WHEN score<70 THEN '50-69' WHEN score<85 THEN '70-84' ELSE '85-100' END score_range,COUNT(*) count FROM quiz_attempts WHERE student_id IN (${ph}) GROUP BY score_range ORDER BY MIN(score)`,ids)
  ]);
  return{summary:{attemptCount:Number(summary.attempt_count),participantCount:Number(summary.participant_count),completedStudentCount:Number(summary.participant_count),averageAccuracy:Number(summary.total_count)?Number(summary.correct_count)/Number(summary.total_count)*100:null},recentAttempts:attempts[0],accuracyDistribution:distribution[0],frequentWrongQuestions:wrongQuestions[0],frequentWrongKnowledgePoints:wrongPoints[0],pagination:{page,pageSize,total:Number(count.total)},codeLab:{available:false,message:"当前系统尚未接入实时监考或真实代码沙箱"}};
});}

async function agentLogs(req,res){return respond(res,async()=>{
  const ids=await access.listManagedStudentIds(req.user);const page=Math.max(1,Number(req.query.page)||1),pageSize=Math.max(1,Math.min(100,Number(req.query.pageSize)||20));const where=[],params=[];
  if(req.user.role==="TEACHER"){if(!ids.length)return{data:[],pagination:{page,pageSize,total:0}};where.push(`student_id IN (${ids.map(()=>"?").join(",")})`);params.push(...ids);}if(req.query.status){const status=String(req.query.status);if(!["success","fallback","failed"].includes(status))throw apiError("无效的日志状态",400);where.push("status=?");params.push(status);}if(req.query.taskType){const taskType=String(req.query.taskType);if(taskType.length>100)throw apiError("任务类型过长",400);where.push("task_type=?");params.push(taskType);}const clause=where.length?`WHERE ${where.join(" AND ")}`:"";
  const [[count]]=await pool.query(`SELECT COUNT(*) total FROM agent_run_logs ${clause}`,params);const [rows]=await pool.query(`SELECT id,agent_name,task_type,input_text,output_text,status,duration_ms,source,student_id,resource_id,path_version,created_at FROM agent_run_logs ${clause} ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`,[...params,pageSize,(page-1)*pageSize]);
  return{data:rows.map((row)=>{const summary=buildAgentLogSummary(row);return{id:Number(row.id),agentName:row.agent_name,taskType:row.task_type,status:row.status,duration:Number(row.duration_ms||0),model:null,source:row.source,createdAt:row.created_at,inputSummary:summary.input_summary,outputSummary:summary.output_summary,errorSummary:row.status==="failed"?"执行失败，详细错误仅保留在服务端":null,relatedStudentId:row.student_id?Number(row.student_id):null,relatedResourceId:row.resource_id?Number(row.resource_id):null,relatedPathVersion:row.path_version?Number(row.path_version):null};}),pagination:{page,pageSize,total:Number(count.total)}};
});}

async function createReport(req,res){return respond(res,()=>reports.createReport(req.user,req.params.studentId,req.body),201);}
async function listReports(req,res){return respond(res,()=>reports.listReports(req.user,req.query));}
async function reportDetail(req,res){return respond(res,()=>reports.getReport(req.user,req.params.reportId));}
async function reportDownload(req,res){try{const file=await reports.getReportDownload(req.user,req.params.reportId);res.setHeader("Content-Type","application/pdf");res.setHeader("Content-Length",String(file.fileSize));res.setHeader("Content-Disposition",`attachment; filename*=UTF-8''${encodeURIComponent(file.originalFilename)}`);return fs.createReadStream(file.absolutePath).pipe(res);}catch(error){return fail(res,error);}}

async function respond(res,work,status=200){try{return res.status(status).json(await work());}catch(error){return fail(res,error);}}
function fail(res,error){console.error("teacher operation failed",error.code||"ERROR",error.message);return res.status(error.statusCode||500).json({error:error.statusCode&&error.statusCode<500?error.message:"教师端操作失败",code:error.statusCode===403?"FORBIDDEN":undefined});}
function parse(value){if(value&&typeof value==="object")return value;try{return JSON.parse(value||"{}");}catch{return{};}}function apiError(message,statusCode){const error=new Error(message);error.statusCode=statusCode;return error;}
module.exports={dashboard,trends,classes,classAnalytics,students,studentDetail,profileHistory:studentSection("profileHistory"),mastery:studentSection("mastery"),quizTrend:studentSection("quizTrend"),path:studentSection("path"),studentResources:studentSection("resources"),retrievalActivity:studentSection("retrievalActivity"),generateStudentResource,quizAnalytics,agentLogs,createReport,listReports,reportDetail,reportDownload};
