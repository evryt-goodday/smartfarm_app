import alertService from "../composition/alert/service/alertService.js";
import { pool } from "../models/db.js";

/**
 * 센서 값이 임계값을 초과하거나 미달했는지 확인하고 알림 생성
 * @param {number} deviceId - 센서 장치 ID
 * @param {number} value - 측정된 센서 값
 * @param {string} recordedAt - 측정 시간
 * @returns {Promise<boolean>} - 알림 생성 여부
 */
export const checkThresholdAndAlert = async (deviceId, value, recordedAt) => {
    let conn;
    try {
        conn = await pool.getConnection();

        // 1. 센서 정보 및 임계값 조회
        const deviceInfo = await conn.query(
            `
            SELECT 
                sd.device_id,
                sd.house_id,
                sd.name,
                sd.type_id,
                st.type_name,
                st.unit,
                t.min_value,
                t.max_value
            FROM sensor_device sd
            JOIN sensor_type st ON sd.type_id = st.type_id
            LEFT JOIN threshold t ON sd.device_id = t.device_id
            WHERE sd.device_id = ?
        `,
            [deviceId]
        );

        if (!deviceInfo.length) {
            console.log(
                `디바이스 ID ${deviceId}에 대한 정보를 찾을 수 없습니다.`
            );
            return false;
        }

        const device = deviceInfo[0];

        // 임계값이 설정되지 않은 경우
        if (device.min_value === null || device.max_value === null) {
            console.log(
                `디바이스 ID ${deviceId}에 대한 임계값이 설정되지 않았습니다.`
            );
            return false;
        }

        // 2. 임계값 확인 및 알림 생성
        let alertType = null;
        let message = null;

        // 센서 종류에 따른 단위 표시 (unit)
        const valueWithUnit = `${value}${device.unit}`;

        if (value > device.max_value) {
            alertType = "error";
            message = `[${device.name}] 측정값(${valueWithUnit})이 최대 임계값(${device.max_value}${device.unit})을 초과했습니다.`;
        } else if (value < device.min_value) {
            alertType = "warning";
            message = `[${device.name}] 측정값(${valueWithUnit})이 최소 임계값(${device.min_value}${device.unit}) 미만으로 떨어졌습니다.`;
        }

        // 3. 필요시 알림 생성
        if (alertType && message) {
            // 최근 유사한 알림이 있는지 확인 (중복 알림 방지)
            // 가장 최근 30분 단위(정시 또는 정시+30분)를 기준으로 확인
            const now = new Date();
            const minutes = now.getMinutes();
            const lastThirtyMinMark = new Date(now);

            // 현재 분이 0-29분이면 해당 시간의 시작(정시)으로, 30-59분이면 해당 시간의 30분으로 설정
            if (minutes < 30) {
                lastThirtyMinMark.setMinutes(0, 0, 0);
            } else {
                lastThirtyMinMark.setMinutes(30, 0, 0);
            }

            const recentAlerts = await conn.query(
                `
                SELECT * FROM alert 
                WHERE device_id = ? 
                AND alert_type = ? 
                AND created_at >= ?
                ORDER BY created_at DESC
                LIMIT 1
                `,
                [deviceId, alertType, lastThirtyMinMark]
            );

            // 현재 30분 단위 내에 동일한 유형의 알림이 없을 때만 생성
            if (recentAlerts.length === 0) {
                const alertData = {
                    house_id: device.house_id,
                    device_id: deviceId,
                    alert_type: alertType,
                    message: message,
                };

                await alertService.createAlert(alertData);
                console.log(`알림 생성: ${message}`);
                return true;
            } else {
                console.log(
                    `현재 ${
                        minutes < 30 ? "정시" : "30분"
                    } 단위 내 유사한 알림이 이미 존재합니다. 알림 생성 생략.`
                );
                return false;
            }
        }

        return false;
    } catch (error) {
        console.error("임계값 확인 중 오류 발생:", error);
        return false;
    } finally {
        if (conn) conn.release();
    }
};

/**
 * 특정 하우스의 모든 센서에 대해 최신 데이터를 확인하고 필요시 알림 생성
 * @param {number} houseId - 하우스 ID
 */
export const checkAllSensorsInHouse = async (houseId) => {
    let conn;
    try {
        conn = await pool.getConnection();

        // 하우스의 모든 센서 조회
        const sensors = await conn.query(
            `
            SELECT device_id FROM sensor_device
            WHERE house_id = ?
        `,
            [houseId]
        );

        if (!sensors.length) {
            console.log(`하우스 ID ${houseId}에 센서가 없습니다.`);
            return;
        }

        // 각 센서의 최신 데이터 확인
        for (const sensor of sensors) {
            const latestData = await conn.query(
                `
                SELECT value, recorded_at FROM sensor_data
                WHERE device_id = ?
                ORDER BY recorded_at DESC
                LIMIT 1
            `,
                [sensor.device_id]
            );

            if (latestData.length) {
                const { value, recorded_at } = latestData[0];
                await checkThresholdAndAlert(
                    sensor.device_id,
                    value,
                    recorded_at
                );
            }
        }
    } catch (error) {
        console.error("하우스 센서 확인 중 오류 발생:", error);
    } finally {
        if (conn) conn.release();
    }
};
