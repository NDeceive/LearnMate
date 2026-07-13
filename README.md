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

推荐使用 Docker Compose 一次启动 MySQL、后端和两套前端：

```bash
cp .env.docker.example .env
# 在本机 .env 中填写必填秘密
docker compose up -d --build
docker compose ps
```

详细环境变量、初始化和升级步骤见 [部署指南](docs/deployment.md)。不使用 Docker 时，分别在 `backend`、`frontend-new` 与 `frontend-teacher` 中执行 `npm ci`，再执行各自的 `npm run dev`；后端启动前需要配置 MySQL 与 `backend/.env`。

## 八、环境变量配置

- Docker Compose：复制根目录 `.env.docker.example` 为不提交的 `.env`；
- 后端单独运行：复制 `backend/.env.example` 为 `backend/.env`；
- 两套前端单独运行：参考各自 `.env.example`，其中只允许公开的 `VITE_*` 配置。

Docker 生产必填项包括 `MYSQL_ROOT_PASSWORD`、`DB_PASSWORD` 和至少 32 个字符的 `JWT_SECRET`。`DEMO_PASSWORD` 只在显式创建比赛演示账号时使用，入库前由 bcrypt 哈希。讯飞配置是可选的运行时秘密；`AI_ENABLED=false` 时基础功能使用确定性路径，不要求真实 AI Key。

数据库迁移、知识库导入和演示 seed 均为幂等操作，但只有对应环境开关为 `true` 时才在容器启动阶段执行；系统不会自动复位数据。

## 九、本地访问地址

- 学生端：http://localhost:8080
- 教师端：http://localhost:8081
- 后端：http://localhost:5800
- 健康检查：http://localhost:5800/api/health

## 十、交付与运维文档

- [Docker 部署、环境变量和生产安全](docs/deployment.md)
- [比赛演示运行手册](docs/demo-runbook.md)
- [备份、恢复、日志和密钥轮换](docs/operations.md)

不要提交 `.env`、真实密码、AI Key、JWT 密钥、`node_modules`、`dist` 或生成的私人 PDF/PPTX。CodeLab 当前是明确标识的演示运行器，不执行不受信任的任意代码，也不宣称为安全沙箱或实时监考能力。

---

## 教师端与演示账号

教师端位于 `frontend-teacher`，Docker 访问地址为 `http://localhost:8081`，通过同源 `/api` 与学生端共用 LearnMate 后端。开发服务器端口以该目录的 Vite 配置为准。

设置 `DEMO_PASSWORD` 后，显式执行 `npm run demo:seed`（或同时启用 `SEED_DEMO_DATA=true`）会幂等创建 `teacher_demo`（TEACHER）、数据结构演示班级，并关联 `zhangsan` 与 `lisi` 学生数据。仅设置密码不会自动写入演示数据。所有演示账号密码均使用该环境变量并以 bcrypt 哈希入库；仓库和文档不保存明文密码。

旧数据卷若已有未标记的历史演示账号，默认 seed 会拒绝接管；备份并核验后可按部署指南执行一次 `demo:adopt-legacy`，该操作需要独立确认值并记录审计。

报告 PDF 使用本机 Edge/Chrome 无头打印并校验 `%PDF-` 文件头与 SHA-256。Windows 默认使用系统中文字体；其他环境请配置 `REPORT_BROWSER_PATH` 和 `REPORT_FONT_PATH`。

教师端尚未提供教师批量任务、真实实时监考、真实代码沙箱或复杂 Word/OCR 题库导入；相关入口不会以模拟数据展示。

## License

MIT
