import { pool } from "../../../models/db.js";

class AlertService {
    // 특정 센서 조회
    async getAlertById(house_id) {
        let conn;
        try {
            conn = await pool.getConnection();
            const rows = await conn.query(
                `
                SELECT 
                    a.alert_type,
                    a.message,
                    DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i:%s') AS timestamp,
                    sd.name
                FROM alert a
                JOIN sensor_device sd
                ON a.device_id = sd.device_id
                WHERE sd.house_id = ?
                AND alert_type IN ('warning', 'error')
                AND a.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                ORDER BY a.created_at DESC  
                LIMIT 10
                `,
                [house_id]
            );
            return rows.length ? rows : null;
        } finally {
            if (conn) conn.release();
        }
    }

    // 특정 센서 조회
    async getAlertsByDevice(house_id, device_id) {
        let conn;
        try {
            conn = await pool.getConnection();
            const rows = await conn.query(
                `
                    SELECT 
                        a.alert_type,
                        a.message,
                        DATE_FORMAT(a.created_at, '%Y-%m-%d %H:%i:%s') AS timestamp,
                        sd.name
                    FROM alert a
                    JOIN sensor_device sd
                    ON a.device_id = sd.device_id
                    WHERE sd.house_id = ?
                    AND a.device_id = ?
                    ORDER BY a.created_at DESC  
                    LIMIT 10
                    `,
                [house_id, device_id]
            );
            return rows.length ? rows : null;
        } finally {
            if (conn) conn.release();
        }
    }

    // 알림 생성
    async createAlert(alertData) {
        let conn;
        try {
            const { house_id, device_id, alert_type, message } = alertData;
            conn = await pool.getConnection();

            const query = `
                INSERT INTO alert (
                    house_id,
                    device_id,
                    alert_type,
                    message
                ) VALUES (?, ?, ?, ?)
            `;

            const values = [house_id, device_id, alert_type, message];

            const result = await conn.query(query, values);

            return result.insertId ? { ...alertData } : null;
        } finally {
            if (conn) conn.release();
        }
    }
}

export default new AlertService();
