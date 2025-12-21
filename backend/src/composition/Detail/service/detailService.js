import { pool } from "../../../models/db.js";

class DetailService {
    async getDetailById(house_id, device_id) {
        let conn;
        try {
            conn = await pool.getConnection();
            const rows = await conn.query(
                `
                WITH sensor_aggregates AS (
                SELECT 
                    sd.device_id,
                    ROUND(MAX(sd2.value), 2) AS day_max_value,
                    ROUND(MIN(sd2.value), 2) AS day_min_value,
                    ROUND(AVG(sd2.value), 2) AS day_avg_value,
                    sd.model,
                    sd.battery_status,
                    sd.firmware_version,
                    sd.location,
                    sd.name,
                    sd.created_at,
                    sd.last_maintenance,
                    sd.type_id
                FROM sensor_device sd
                JOIN sensor_data sd2 ON sd.device_id = sd2.device_id
                JOIN house h ON sd.house_id = h.house_id
                WHERE h.house_id = ?
                AND DATE(sd2.recorded_at) = DATE(NOW())
                GROUP BY sd.device_id
                ),
                max_min_dates AS (
                SELECT 
                    sd.device_id,
                    MAX(CASE WHEN ROUND(sd2.value, 2) = sa.day_max_value THEN sd2.recorded_at END) AS max_recorded_at,
                    MIN(CASE WHEN ROUND(sd2.value, 2) = sa.day_min_value THEN sd2.recorded_at END) AS min_recorded_at
                FROM sensor_device sd
                JOIN sensor_data sd2 ON sd.device_id = sd2.device_id
                JOIN house h ON sd.house_id = h.house_id
                JOIN sensor_aggregates sa ON sd.device_id = sa.device_id
                WHERE h.house_id = ?
                AND DATE(sd2.recorded_at) = DATE(NOW())
                GROUP BY sd.device_id
                ),
                latest_alert AS (
                SELECT 
                    a.device_id,
                    a.message as last_alert_message,
                    a.alert_type as last_alert_type
                FROM alert a
                JOIN (
                    SELECT device_id, MAX(created_at) as max_alert_time
                    FROM alert
                    GROUP BY device_id
                ) latest ON a.device_id = latest.device_id AND a.created_at = latest.max_alert_time
                ),
                real_time_data AS (
                SELECT * FROM (
                    SELECT 
                        sd.device_id,
                        sd.value AS real_time_data,
                        sd.recorded_at AS real_time,
                        ROW_NUMBER() OVER (PARTITION BY sd.device_id ORDER BY sd.recorded_at DESC) as rn
                    FROM sensor_data sd
                    WHERE sd.device_id = ?
                ) ranked WHERE rn = 1
                )
                SELECT 
                sa.device_id,
                sa.day_max_value,
                sa.day_min_value,
                sa.day_avg_value,
                sa.model,
                sa.battery_status,
                sa.firmware_version,
                sa.location,
                sa.name,
                sa.created_at,
                sa.last_maintenance,
                la.last_alert_message,
                la.last_alert_type,
                st.description,
                st.type_name,
                st.unit,
                t.max_value,
                t.min_value,
                rtd.real_time_data
                FROM sensor_aggregates sa
                JOIN max_min_dates mmd ON sa.device_id = mmd.device_id
                LEFT JOIN latest_alert la ON sa.device_id = la.device_id
                JOIN sensor_type st ON sa.type_id = st.type_id
                JOIN threshold t ON sa.device_id = t.device_id
                JOIN real_time_data rtd ON sa.device_id = rtd.device_id
                WHERE sa.device_id = ?
                ORDER BY sa.device_id;
                `,
                [house_id, house_id, device_id, device_id]
            );

            return rows.length ? rows[0] : null;
        } finally {
            if (conn) conn.release();
        }
    }

    // 특정 센서 조회
    async getCurrentDetail(house_id) {
        let conn;
        try {
            conn = await pool.getConnection();
            const rows = await conn.query(
                `
                SELECT sd.value, sd.recorded_at
                FROM  sensor_data sd
                WHERE  sd.device_id = ?
                ORDER BY sd.recorded_at DESC
                LIMIT 30
                `,
                [house_id]
            );

            return rows.length ? rows : null;
        } finally {
            if (conn) conn.release();
        }
    }

    // 실시간 센서 데이터 조회
    async getRealTimeData(device_id) {
        let conn;
        try {
            conn = await pool.getConnection();
            const rows = await conn.query(
                `
                SELECT 
                    sd.value AS real_time_data,
                    MAX(sd.recorded_at) AS real_time
                FROM sensor_data sd 
                WHERE sd.device_id = ?
                `,
                [device_id]
            );

            return rows.length ? rows : null;
        } finally {
            if (conn) conn.release();
        }
    }

    async getCurrentValuesByTimeframe(house_id, timeframe = "hourly") {
        const strategy =
            timeframeStrategies[timeframe] || timeframeStrategies.hourly;

        const query = strategy.buildQuery();

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

    // // 센서 생성
    async createDetail(detailData) {
        let conn;
        try {
            const { house_id, sensor_type, min_value, max_value, is_active } =
                detailData;
            conn = await pool.getConnection();

            const query = `
                    INSERT INTO detail (
                        house_id,
                        sensor_type,
                        min_value,
                        max_value,
                        is_active
                    ) VALUES (?, ?, ?, ?, ?)
                `;

            const values = [
                house_id,
                sensor_type,
                min_value,
                max_value,
                is_active,
            ];

            const result = await conn.query(query, values);

            return {
                detail_id: result.insertId.toString(),
                ...detailData,
            };
        } finally {
            if (conn) conn.release();
        }
    }

    // 임계값 수정 메소드명 및 파라미터 수정
    async updateRange(device_id, rangeData) {
        let conn;
        try {
            const { min_value, max_value } = rangeData;

            conn = await pool.getConnection();
            const result = await conn.query(
                `
                    UPDATE threshold t 
                    SET t.min_value = ?, 
                        t.max_value = ?
                    WHERE t.device_id = ?
                    `,
                [min_value, max_value, device_id]
            );

            return result.affectedRows > 0;
        } finally {
            if (conn) conn.release();
        }
    }
}

// 타임프레임 전략 객체 - 각 타임프레임에 맞는 쿼리를 생성
const timeframeStrategies = {
    hourly: {
        buildQuery: () => `
            SELECT 
                DATE_FORMAT(sd.recorded_at, '%Y-%m-%d %H:%i:%s') AS timestamp,
                ROUND(sd.value, 1) AS value
            FROM sensor_data sd
            WHERE sd.device_id = ?
            ORDER BY timestamp DESC
            LIMIT 30;
        `,
    },
    daily: {
        buildQuery: () => `
            SELECT 
                DATE_FORMAT(sd.recorded_at, '%Y-%m-%d') AS timestamp,
                ROUND(AVG(sd.value), 1) AS value
            FROM sensor_data sd
            WHERE sd.device_id = ?
            GROUP BY DATE_FORMAT(sd.recorded_at, '%Y-%m-%d')
            ORDER BY timestamp DESC
            LIMIT 30;
        `,
    },
    monthly: {
        buildQuery: () => `
            SELECT 
                DATE_FORMAT(sd.recorded_at, '%Y-%m') AS timestamp,
                ROUND(AVG(sd.value), 1) AS value
            FROM sensor_data sd
            WHERE sd.device_id = ?
            GROUP BY DATE_FORMAT(sd.recorded_at, '%Y-%m')
            ORDER BY timestamp DESC
            LIMIT 30;
        `,
    },
};

export default new DetailService();
