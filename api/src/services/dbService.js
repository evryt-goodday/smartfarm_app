import mysql from "mysql2/promise";
import { DB_CONFIG } from "../config/dbConfig.js";

let connection;

// 센서 장치 ID 상수 정의
export const DEVICE_TYPES = {
    TEMPERATURE: 1,
    HUMIDITY: 2,
    RAINFALL: 3,
    CLOUD_COVERAGE: 4,
    WIND_SPEED: 5,
    PRESSURE: 6,
};

export async function initializeDatabase() {
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        console.log("데이터베이스 연결 성공");
    } catch (error) {
        console.error("데이터베이스 연결 실패:", error.message);
        throw error;
    }
}

export async function saveWeatherData(weatherData) {
    try {
        // 현재 시간을 SQL 형식으로 변환 (YYYY-MM-DD HH:MM:SS)
        const now = new Date();
        const formattedDate =
            now.getFullYear() +
            "-" +
            String(now.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(now.getDate()).padStart(2, "0") +
            " " +
            String(now.getHours()).padStart(2, "0") +
            ":" +
            String(now.getMinutes()).padStart(2, "0") +
            ":" +
            String(now.getSeconds()).padStart(2, "0");

        const insertQuery = `
      INSERT INTO sensor_data (device_id, value, recorded_at)
      VALUES (?, ?, ?);
    `;

        // 각 센서 데이터를 별도로 삽입
        const sensorReadings = [
            {
                deviceId: DEVICE_TYPES.TEMPERATURE,
                value: weatherData.temperature,
            },
            { deviceId: DEVICE_TYPES.HUMIDITY, value: weatherData.humidity },
            {
                deviceId: DEVICE_TYPES.RAINFALL,
                value: weatherData.rainfall || 0,
            }, // rain.1h가 없을 수 있음
            {
                deviceId: DEVICE_TYPES.CLOUD_COVERAGE,
                value: weatherData.cloudCoverage,
            },
            { deviceId: DEVICE_TYPES.WIND_SPEED, value: weatherData.windSpeed },
            { deviceId: DEVICE_TYPES.PRESSURE, value: weatherData.pressure },
        ];

        // 각 센서 데이터를 개별적으로 저장
        for (const reading of sensorReadings) {
            await connection.execute(insertQuery, [
                reading.deviceId,
                reading.value,
                formattedDate,
            ]);
        }

        console.log(
            `${sensorReadings.length}개의 센서 데이터가 성공적으로 저장되었습니다. (시간: ${formattedDate})`
        );
    } catch (error) {
        console.error("센서 데이터를 저장하는 중 오류 발생:", error.message);
        throw error;
    }
}
