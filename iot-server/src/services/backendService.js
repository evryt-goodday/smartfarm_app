import axios from "axios";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

/**
 * Backend 서버로 센서 데이터 업데이트 알림 전송
 * @param {number} houseId - 하우스 ID
 * @param {number} deviceId - 센서 장치 ID
 * @param {number} value - 센서 값
 */
export const notifyBackendSensorUpdate = async (houseId, deviceId, value) => {
    try {
        const response = await axios.post(
            `${BACKEND_URL}/api/internal/sensor/notify`,
            {
                houseId,
                deviceId,
                value,
                timestamp: new Date().toISOString(),
            },
            {
                timeout: 5000,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );

        console.log(`Backend 알림 성공 (device: ${deviceId}):`, response.data);
        return response.data;
    } catch (error) {
        if (error.code === "ECONNREFUSED") {
            console.error("Backend 서버에 연결할 수 없습니다.");
        } else if (error.code === "ETIMEDOUT") {
            console.error("Backend 서버 응답 시간 초과");
        } else {
            console.error("Backend 알림 실패:", error.message);
        }
        // 에러가 발생해도 iot-server는 계속 동작
        return null;
    }
};

/**
 * Backend 서버 상태 확인 (헬스 체크)
 */
export const checkBackendHealth = async () => {
    try {
        const response = await axios.get(`${BACKEND_URL}/`, { timeout: 3000 });
        console.log("Backend 서버 연결 정상");
        return true;
    } catch (error) {
        console.error("Backend 서버 연결 실패");
        return false;
    }
};

/**
 * Backend 서버에 일반 이벤트 알림 전송
 * @param {Object} eventData - 전송할 이벤트 데이터
 */
export const notifyBackend = async (eventData) => {
    try {
        const response = await axios.post(
            `${BACKEND_URL}/api/internal/sensor/notify`,
            eventData,
            {
                timeout: 5000,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
        console.log(`Backend 알림 전송 성공 - event: ${eventData.event}`);
        return response.data;
    } catch (error) {
        console.error(`Backend 알림 실패 - event: ${eventData.event}:`, error.message);
        // 알림 실패는 치명적이지 않으므로 에러를 던지지 않음
        return null;
    }
};
