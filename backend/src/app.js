import express from "express";
import cors from "cors";
import { createServer } from "http";
import userRoutes from "./composition/user/routes/userRoutes.js";
import houseRoutes from "./composition/house/routes/houseRoutes.js";
import sensorRoutes from "./composition/sensor/routes/sensorRoutes.js";
import detailRoutes from "./composition/Detail/routes/detailRoutes.js";
import alertRoutes from "./composition/alert/routes/alertRoutes.js";
import internalRoutes from "./composition/internal/routes/internalRoutes.js";
import actuatorRoutes from "./composition/actuator/routes/actuatorRoutes.js";
import { testConnection } from "./models/db.js";
import { setupThresholdMonitoringScheduler } from "./utils/monitoringScheduler.js";
import { initializeSocket } from "./config/socketConfig.js";

const app = express();
const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true,
    })
);

app.set("json replacer", (key, value) =>
    typeof value === "bigint" ? value.toString() : value
);

// Socket.IO 초기화
initializeSocket(httpServer);

// 데이터베이스 연결 테스트
testConnection();

// 루트 경로 설정
app.get("/", (req, res) => {
    res.send("MariaDB와 Express.js API 서버가 실행 중입니다.");
});

// 라우터 설정
app.use("/user", userRoutes);
app.use("/house", houseRoutes);
app.use("/sensor", sensorRoutes);
app.use("/detail", detailRoutes);
app.use("/alert", alertRoutes);
app.use("/internal", internalRoutes);
app.use("/actuator", actuatorRoutes);

// 임계값 모니터링 스케줄러 설정
setupThresholdMonitoringScheduler().catch((error) => {
    console.error("임계값 모니터링 스케줄러 설정 중 오류 발생:", error);
});

// 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
    console.error("서버 오류:", err);
    res.status(500).json({ error: "서버에서 오류가 발생했습니다." });
});

// 서버 시작
httpServer.listen(PORT, () => {
    console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    console.log(`🔌 WebSocket 서버 준비 완료`);
});
