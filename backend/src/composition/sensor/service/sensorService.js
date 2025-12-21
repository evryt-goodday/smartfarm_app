import { pool } from "../../../models/db.js";
import { checkThresholdAndAlert } from "../../../utils/thresholdMonitor.js";

class SensorService {
    // 특정 센서 조회
    async getSensorById(house_id) {
        let conn;
        try {
            conn = await pool.getConnection();
            const rows = await conn.query(
                `
                SELECT 
                    ROW_NUMBER() OVER (ORDER BY sd.device_id) as row_num,
                    sd.device_id,
                    sd.name,
                    sd.model,
                    sd.battery_status,
                    sd.created_at,
                    sd.firmware_version,
                    sd.location,
                    st.description,
                    st.type_name as sensor_type,
                    st.unit as sensor_unit,
                    latest_data.value as current_value,
                    latest_data.recorded_at as value_recorded_at,
                    MAX(a.created_at) as last_alert_at,
                    a.message as last_alert_message,
                    a.alert_type as last_alert_type,
                    t.max_value,
                    t.min_value
                FROM sensor_device sd
                JOIN sensor_type st ON st.type_id = sd.type_id
                LEFT JOIN alert a ON a.device_id = sd.device_id
                LEFT JOIN (
                    SELECT 
                        sd2.device_id,
                        sd2.value,
                        sd2.recorded_at
                    FROM sensor_data sd2
                    INNER JOIN (
                        SELECT device_id, MAX(recorded_at) as latest_time
                        FROM sensor_data
                        GROUP BY device_id
                    ) latest ON sd2.device_id = latest.device_id 
                    AND sd2.recorded_at = latest.latest_time
                ) latest_data ON sd.device_id = latest_data.device_id
                LEFT JOIN threshold t ON sd.device_id = t.device_id
                WHERE sd.house_id = ?
                GROUP BY 
                    sd.device_id, 
                    sd.name, 
                    sd.model, 
                    sd.status, 
                    st.description,
                    st.type_name,
                    latest_data.value,
                    latest_data.recorded_at;
                    `,
                [house_id]
            );

            return rows.length ? rows : null;
        } finally {
            if (conn) conn.release();
        }
    }

    async getValuesByTimeframe(house_id, timeframe = "hourly", limit = null) {
        const strategy =
            timeframeStrategies[timeframe] || timeframeStrategies.hourly;

        const query = strategy.buildQuery(limit);

        let conn;
        try {
            conn = await pool.getConnection();
            const rows = await conn.query(query, [house_id]);

            return rows.length ? rows : null;
        } catch (error) {
            console.error(`${timeframe} 데이터 조회 오류:`, error);
            throw error;
        } finally {
            if (conn) conn.release();
        }
    }

    // 센서 데이터 배치 추가 메서드
    async addSensorDataBatch(dataArray) {
        let conn;
        try {
            conn = await pool.getConnection();

            // 트랜잭션 시작
            await conn.beginTransaction();

            const query = `
                INSERT INTO sensor_data (
                    device_id,
                    value,
                    recorded_at
                ) VALUES (?, ?, ?)
            `;

            const results = [];

            for (const data of dataArray) {
                const { device_id, value, recorded_at } = data;
                const values = [device_id, value, recorded_at || new Date()];

                const result = await conn.query(query, values);
                results.push({
                    id: result.insertId,
                    ...data,
                });

                // 데이터 추가 후 임계값 확인 및 알림 생성
                await checkThresholdAndAlert(device_id, value, values[2]);
            }

            // 트랜잭션 커밋
            await conn.commit();

            return results;
        } catch (error) {
            if (conn) {
                await conn.rollback();
            }
            throw error;
        } finally {
            if (conn) conn.release();
        }
    }
}

// 타임프레임 전략 객체 - 각 타임프레임에 맞는 쿼리를 생성
const timeframeStrategies = {
    hourly: {
        buildQuery: (limit) => `
            WITH ranked_data AS (
                SELECT 
                    st.description AS sensor_type,
                    sd.device_id,
                    sd.recorded_at AS timestamp,
                    sd.value,
                    ROW_NUMBER() OVER (
                        PARTITION BY sd.device_id 
                        ORDER BY sd.recorded_at DESC
                    ) AS row_num
                FROM sensor_data sd
                JOIN sensor_device sd2 ON sd.device_id = sd2.device_id
                JOIN sensor_type st ON sd2.type_id = st.type_id
                WHERE sd2.house_id = ?
            )
            SELECT 
                sensor_type,
                device_id,
                DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') AS timestamp,
                ROUND(value, 1) AS value
            FROM ranked_data
            WHERE row_num <= ${limit || 15}
            ORDER BY device_id, timestamp DESC;
        `,
    },
    daily: {
        buildQuery: (limit) => `
            WITH Daily_data AS (
                SELECT 
                    st.description AS sensor_type,
                    sd.device_id,
                    DATE_FORMAT(sd.recorded_at, '%Y-%m-%d') AS timestamp,
                    ROUND(AVG(sd.value), 1) AS value,
                    ROW_NUMBER() OVER (
                        PARTITION BY sd.device_id 
                        ORDER BY sd.recorded_at DESC
                    ) AS row_num
                FROM sensor_data sd
                JOIN sensor_device sd2 ON sd.device_id = sd2.device_id
                JOIN sensor_type st ON sd2.type_id = st.type_id
                WHERE sd.recorded_at <= CURRENT_DATE()
                AND sd2.house_id = ?
                GROUP BY 
                    st.description,
                    sd.device_id,
                    DATE_FORMAT(sd.recorded_at, '%Y-%m-%d')
            )
            SELECT 
                sensor_type,
                device_id,
                timestamp,
                value
            FROM Daily_data
            WHERE row_num <= ${limit || 15}
            ORDER BY device_id, timestamp ASC;
        `,
    },
    monthly: {
        buildQuery: (limit) => `
             WITH monthly_data AS (
                SELECT 
                    st.description AS sensor_type,
                    sd.device_id,
                    DATE_FORMAT(sd.recorded_at, '%Y-%m') AS timestamp,
                    ROUND(AVG(sd.value), 1) AS value,
                    ROW_NUMBER() OVER (
                        PARTITION BY sd.device_id 
                        ORDER BY sd.recorded_at DESC
                    ) AS row_num
                FROM sensor_data sd
                JOIN sensor_device sd2 ON sd.device_id = sd2.device_id
                JOIN sensor_type st ON sd2.type_id = st.type_id
                WHERE sd.recorded_at <= CURRENT_DATE()
                AND sd2.house_id = ?
                GROUP BY 
                    st.description,
                    sd.device_id,
                    DATE_FORMAT(sd.recorded_at, '%Y-%m')
            )
            SELECT 
                sensor_type,
                device_id,
                timestamp,
                value
            FROM monthly_data
            WHERE row_num <= ${limit || 12}
            ORDER BY device_id, timestamp ASC;
        `,
    },
};

export default new SensorService();
