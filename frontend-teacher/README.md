# LearnMate 教师端

教师端已作为 LearnMate 主仓库中的纯 Vite 前端运行，与学生端共用 `backend`。

## 配置与运行

1. 复制 `.env.example` 为本地环境文件并按部署地址设置 `VITE_API_BASE_URL`。
2. 执行 `npm install`。
3. 开发：`npm run dev`；类型检查：`npm run lint`；构建：`npm run build`。

教师与管理员均通过 LearnMate 的 `/api/auth/login` 登录。教师账号由后端 `DEMO_PASSWORD` 或正式账号管理流程创建；本目录不保存密码、Gemini 密钥或业务后端。

页面只读取真实教师 API。系统尚未接入的实时监考、真实代码沙箱和复杂题库导入不会在界面中伪装为可用能力。
