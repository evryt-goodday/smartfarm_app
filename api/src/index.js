import express from "express";
import { initializeDatabase } from "./services/dbService.js";
import { startScheduler } from "./services/scheduler.js";

const app = express();
const port = process.env.PORT || 3001;

// 서버 초기화
(async () => {
    try {
        console.log("서버 초기화 중...");
        await initializeDatabase();

        // 날씨 데이터 수집 스케줄러 시작
        startScheduler();

        app.listen(port, () => {
            console.log(`서버가 포트 ${port}에서 실행 중입니다.`);
        });
    } catch (error) {
        console.error("서버 초기화 실패:", error.message);
        process.exit(1);
    }
})();
