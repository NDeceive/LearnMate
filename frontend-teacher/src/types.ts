export type Role = 'STUDENT' | 'TEACHER' | 'ADMIN';
export interface User { id:number; username:string; displayName:string; role:Role; studentId?:number; teacherId?:number }
export interface Pagination { page:number; pageSize:number; total:number }
export interface Risk { level:'high'|'medium'|'low'; reasons:string[] }
export interface StudentCard { studentId:number; username:string; displayName:string; classId:number; className:string; currentCourse?:string; profileVersion:number; pathVersion:number; pathProgress:number|null; recentQuizAccuracy:number|null; weakKnowledgePoints:Array<{knowledgePoint:string;mastery:number}>; topErrorPatterns:Array<{errorType:string;occurrenceCount:number}>; lastActivityAt?:string|null; risk:Risk }
export interface ClassItem { id:number; className:string; subject:string; description?:string; teacherName:string; studentCount:number }
export interface ReportItem { id:number;studentId:number;studentName?:string;reportVersion:number;reportType:string;rangeDays:number;status:string;checksumSha256?:string;fileSize?:number;createdAt:string;report?:Record<string,unknown> }
