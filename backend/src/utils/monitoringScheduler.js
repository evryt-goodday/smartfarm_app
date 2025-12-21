import schedule from "node-schedule";
import { checkAllSensorsInHouse } from "../utils/thresholdMonitor.js";
import { pool } from "../models/db.js";

/**
 * 주기적인 임계값 모니터링 작업을 설정합니다.
 * 5분마다 모든 하우스의 센서들을 검사합니다.
 */
export const setupThresholdMonitoringScheduler = async () => {
    console.log("임계값 모니터링 스케줄러를 설정합니다...");

    // 5분마다 실행 (매 5분마다 0초에)
    schedule.scheduleJob("*/5 * * * *", async () => {
        console.log(`정기 임계값 모니터링 작업 시작...`);

        try {
            // 모든 하우스 정보 가져오기
            let conn;
            try {
                conn = await pool.getConnection();
                // is_active 컬럼이 없으므로 단순히 모든 하우스를 가져옵니다
                const houses = await conn.query("SELECT house_id FROM house");

                console.log(
                    `총 ${houses.length}개의 하우스에 대해 임계값 모니터링을 수행합니다.`
                );

                // 각 하우스의 센서 검사
                for (const house of houses) {
                    await checkAllSensorsInHouse(house.house_id);
                }

                console.log("정기 임계값 모니터링 작업 완료");
            } finally {
                if (conn) conn.release();
            }
        } catch (error) {
            console.error("정기 임계값 모니터링 중 오류 발생:", error);
        }
    });

    console.log("임계값 모니터링 스케줄러가 설정되었습니다. (주기: 5분마다)");
};

/**
 * 스케줄러 설정 및 시작을 위한 함수
 * @param {string} interval - 주기 설정 ('5min', 'hourly', 'daily', 'custom')
 * @param {string} customCron - custom 주기일 경우 cron 표현식
 */
export const startMonitoringScheduler = (
    interval = "5min",
    customCron = null
) => {
    // 이전 작업이 있으면 모두 취소
    schedule.gracefulShutdown();

    let cronExpression;
    let intervalDescription;

    switch (interval) {
        case "5min":
            cronExpression = "*/5 * * * *"; // 5분마다
            intervalDescription = "5분마다";
            break;
        case "hourly":
            cronExpression = "0 * * * *"; // 매시 정각
            intervalDescription = "1시간마다";
            break;
        case "daily":
            cronExpression = "0 0 * * *"; // 매일 자정
            intervalDescription = "1일마다";
            break;
        case "custom":
            cronExpression = customCron || "0 */6 * * *"; // 기본: 6시간마다
            intervalDescription = "사용자 정의 주기";
            break;
        default:
            cronExpression = "*/5 * * * *"; // 기본값을 5분마다로 변경
            intervalDescription = "5분마다";
    }

    schedule.scheduleJob(cronExpression, async () => {
        console.log(
            `정기 임계값 모니터링 작업 시작 (${intervalDescription})...`
        );

        try {
            // 모든 하우스 정보 가져오기
            let conn;
            try {
                conn = await pool.getConnection();
                // is_active 컬럼이 없으므로 단순히 모든 하우스를 가져옵니다
                const houses = await conn.query("SELECT house_id FROM house");

                // 각 하우스의 센서 검사
                for (const house of houses) {
                    await checkAllSensorsInHouse(house.house_id);
                }
            } finally {
                if (conn) conn.release();
            }

            console.log("정기 임계값 모니터링 작업 완료");
        } catch (error) {
            console.error("정기 임계값 모니터링 중 오류 발생:", error);
        }
    });

    console.log(
        `임계값 모니터링 스케줄러가 시작되었습니다. (주기: ${intervalDescription})`
    );
    return true;
};
