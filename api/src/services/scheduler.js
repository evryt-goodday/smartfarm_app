import cron from "node-cron";
import { fetchAndSaveWeatherData } from "./weatherService.js";

export function startScheduler() {
    // 5분 간격으로 날씨 데이터 가져오기
    cron.schedule("*/5 * * * *", async () => {
        console.log("스케줄러 실행: 날씨 데이터 가져오기");
        await fetchAndSaveWeatherData();
    });

    console.log("스케줄러가 시작되었습니다 (5분 간격).");
}
