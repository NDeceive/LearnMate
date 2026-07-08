const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

const app = require("./app");
const { initDB } = require("./config/initDB");

const PORT = Number(process.env.PORT || 5800);

async function startServer() {
  await initDB();

  const server = app.listen(PORT, () => {
    console.log(`计智引擎后端已启动：http://localhost:${PORT}`);
  });

  server.on("error", (error) => {
    console.error("后端服务启动失败：", error.message);
    process.exit(1);
  });
}

startServer();
