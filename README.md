# 计智引擎——面向计算机专业课程的多智能体个性化学习资源生成平台

> 第十五届中国软件杯大赛 A3 赛题参赛作品 ｜ 出题企业：科大讯飞股份有限公司

---

## 一、项目背景

本项目为**第十五届中国软件杯大赛 A3 赛题方向**的参赛作品，聚焦「个性化学习资源生成与学习多智能体系统开发」。面向计算机类学生的专业课程学习场景，探索如何利用大语言模型与多智能体协同技术，自动生成契合学生个体情况的、个性化、多模态的学习资源，并围绕学习全流程提供智能化支持。

## 二、项目定位

本项目面向计算机类学生专业课程学习与能力提升场景，构建由学习画像诊断、资源生成、内容审核、路径规划、练习生成、错题反馈和学习评估组成的多智能体协同学习系统。

## 三、技术栈

| 层次 | 技术 |
|------|------|
| 前端 | React + TypeScript + Vite + Tailwind CSS + Recharts |
| 后端 | Node.js + Express + MySQL |
| AI | 讯飞星火 HTTP API |
| 多智能体 | 后端自研 Agent 协同编排 |

## 四、核心功能

- 学生画像
- 个性化学习资源生成
- 多智能体协同过程展示
- 学习路径规划
- AI 智能问答
- 自适应测验
- 代码实验室 CodeLab：数据结构代码练习、样例运行、AI 解释运行结果
- 错题本
- 学习评估报告

## 五、多智能体框架

| Agent | 职责 |
|-------|------|
| ProfileAgent | 学习画像诊断智能体 |
| ResourceAgent | 学习资源生成智能体 |
| ReviewAgent | 内容质量审核智能体 |
| PlannerAgent | 学习路径规划智能体 |
| QuizAgent | 练习题生成智能体 |
| FeedbackAgent | 学习反馈更新智能体 |
| TutorAgent | 智能辅导答疑智能体 |
| AssessmentAgent | 学习效果评估智能体 |

## 六、核心协同流程

```
ProfileAgent → ResourceAgent → ReviewAgent → PlannerAgent
```

学习画像诊断的结果作为上下文流向资源生成智能体，生成的资源经内容质量审核智能体把关后，交由学习路径规划智能体编排为个性化学习路径。

## 七、本地运行步骤

**后端（端口 5800）：**

```bash
cd backend
npm install
npm run seed:base-questions
npm run import:open-questions
npm run seed:code-exercises
npm run seed:learning-loop
npm run dev
```

**前端（端口 5700）：**

```bash
cd frontend-new
npm install
npm run dev:web
```

## 八、环境变量配置

后端环境变量通过 `backend/.env` 文件读取。请复制示例文件：

```bash
backend/.env.example
```

为：

```bash
backend/.env
```

然后填写数据库密码与讯飞星火 APIPassword：

| 字段 | 说明 |
|------|------|
| `DB_HOST` / `DB_PORT` | 数据库地址与端口 |
| `DB_USER` / `DB_PASSWORD` | MySQL 用户名与密码（填写你本地的 MySQL 密码） |
| `DB_NAME` | 数据库名，默认 `edusmart` |
| `JWT_SECRET` | JWT 签名密钥，请替换为足够长的随机字符串 |
| `PORT` | 后端服务端口，默认 5800 |
| `CORS_ORIGIN` | 允许跨域的前端地址，默认 `http://localhost:5700` |
| `SPARK_API_URL` | 讯飞星火接口地址 |
| `SPARK_MODEL` | 使用的模型，默认建议 `lite` |
| `SPARK_API_KEY` | 讯飞星火 APIPassword |
| `SPARK_APP_ID` / `SPARK_API_SECRET` | WebSocket 接入时使用的应用 ID 与 APISecret，HTTP 接入可留空 |
| `SPARK_TIMEOUT_MS` | AI 请求超时时间，默认建议 `30000` |
| `JWT_SECRET` | JWT 签名密钥，至少 32 位随机字符串 |
| `JWT_EXPIRES_IN` | 登录有效期，默认 `8h` |
| `DEMO_PASSWORD` | 演示账号初始密码，入库前使用 bcrypt 哈希 |

可在后端目录运行以下命令检查 AI 配置是否已启用：

```bash
node -e "require('dotenv').config(); const { isAIEnabled } = require('./src/services/aiService'); console.log(isAIEnabled())"
```

> 数据库表结构由后端启动时自动创建，首次启动会自动插入演示数据，无需手动建表。

## 九、本地访问地址

- 前端：http://localhost:5700
- 后端：http://localhost:5800

## 十、注意事项

- 不要提交 `.env`（`.env` / `backend/.env` / `*.env` 已在 `.gitignore` 中忽略），也不要提交任何真实 API Key。
- `SPARK_MODEL` 默认建议先使用 `lite`。
- 如果使用 `generalv3` / `generalv3.5` / `4.0Ultra`，需要确认讯飞控制台已开通对应模型权限。
- 如果 5800 端口被占用，需要先关闭占用进程或修改本地 `PORT`。
- 代码实验室已接入 `/api/code`，当前为 Mock Runner 样例运行演示模式，不直接执行用户代码；后续可扩展接入 Judge0/Piston 沙箱，实现真实代码评测。

---

## 教师端与演示账号

教师端位于 `frontend-teacher`，默认开发地址为 `http://localhost:3001`，通过 `VITE_API_BASE_URL` 与学生端共用 LearnMate 后端。

设置 `DEMO_PASSWORD` 后，后端会幂等创建 `teacher_demo`（TEACHER）、数据结构演示班级，并关联已有的 `zhangsan` 与 `lisi` 学生数据。所有演示账号密码均使用该环境变量并以 bcrypt 哈希入库；仓库和文档不保存明文密码。

报告 PDF 使用本机 Edge/Chrome 无头打印并校验 `%PDF-` 文件头与 SHA-256。Windows 默认使用系统中文字体；其他环境请配置 `REPORT_BROWSER_PATH` 和 `REPORT_FONT_PATH`。

教师端尚未提供教师批量任务、真实实时监考、真实代码沙箱或复杂 Word/OCR 题库导入；相关入口不会以模拟数据展示。

## License

MIT
