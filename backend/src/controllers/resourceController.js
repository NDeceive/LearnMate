const fs=require("fs"); const services=require("../services/resourceGenerationService");
async function generate(req,res){try{return res.json({resource:await services.generateResource({...req.body,studentId:req.user.studentId})});}catch(e){return fail(res,e);}}
async function list(req,res){try{return res.json({data:await services.listResources(req.user.studentId,{...req.query})});}catch(e){return fail(res,e);}}
async function detail(req,res){try{return res.json({resource:await services.getResource(req.user.studentId,req.params.resourceId)});}catch(e){return fail(res,e);}}
async function versions(req,res){try{return res.json({data:await services.listVersions(req.user.studentId,req.params.resourceId)});}catch(e){return fail(res,e);}}
async function versionDetail(req,res){try{return res.json({resource:await services.getResource(req.user.studentId,req.params.resourceId,req.params.version)});}catch(e){return fail(res,e);}}
async function download(req,res){try{const file=await services.getDownload(req.user.studentId,req.params.resourceId,req.params.version);res.setHeader("Content-Type",file.mime_type);res.setHeader("Content-Length",String(file.file_size));res.setHeader("Content-Disposition",`attachment; filename*=UTF-8''${encodeURIComponent(file.original_filename)}`);return fs.createReadStream(file.absolutePath).pipe(res);}catch(e){return fail(res,e);}}
async function open(req,res){try{return res.json({resource:await services.openResource(req.user.studentId,req.params.resourceId)});}catch(e){return fail(res,e);}}
async function progress(req,res){try{return res.json({resource:await services.updateProgress(req.user.studentId,req.params.resourceId,req.body||{})});}catch(e){return fail(res,e);}}
async function complete(req,res){try{return res.json({resource:await services.completeResource(req.user.studentId,req.params.resourceId)});}catch(e){return fail(res,e);}}
async function stageResources(req,res){try{return res.json({data:await services.stageResources(req.user.studentId,req.query.pathVersion,req.params.stageKey)});}catch(e){return fail(res,e);}}
function fail(res,e){const status=e.statusCode||500,requestId=res.req?.requestId;console.error(JSON.stringify({level:"error",requestId,status,area:"resource",code:e.code||"ERROR",message:status<500?String(e.message).slice(0,160):"resource operation failed"}));return res.status(status).json({error:status<500?e.message:"resource operation failed",requestId});}
module.exports={generate,list,detail,versions,versionDetail,download,open,progress,complete,stageResources};
