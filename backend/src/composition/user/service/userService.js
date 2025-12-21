import { pool } from "../../../models/db.js";

class UserService {
    // 특정 사용자 조회
    async getUserById(user_id) {
        let conn;
        try {
            conn = await pool.getConnection();
            const rows = await conn.query(
                `
                    SELECT ns.email_notifications
                        , ns.sms_notifications
                        , ns.push_notifications
                        , u.name
                        , u.email
                        , u.phone
                        , u.department
                        , u.position
                        , u.profile_image
                        , u.last_login
                        , u.created_at 
                    FROM notification_setting ns 
                    JOIN user u ON ns.user_id = u.user_id 
                    WHERE u.user_id = ?;
                `,
                [user_id]
            );
            return rows.length ? rows[0] : null;
        } finally {
            if (conn) conn.release();
        }
    }

    // 사용자의 센서 디바이스 정보 조회
    async getUserDevice(user_id) {
        let conn;
        try {
            conn = await pool.getConnection();
            const rows = await conn.query(
                `
                SELECT sd.device_id
                    , st.description
                    , sd.location
                    , sd.status
                FROM user u
                JOIN house h ON u.user_id = h.owner_id
                JOIN sensor_device sd ON h.house_id = sd.house_id
                JOIN sensor_type st ON sd.type_id = st.type_id
                WHERE u.user_id = ?
                `,
                [user_id]
            );
            return rows;
        } finally {
            if (conn) conn.release();
        }
    }

    // 사용자 알림 수정
    async updateNotifications(user_id, notificationData) {
        const conn = await pool.getConnection();
        try {
            const { type, value } = notificationData;

            const columnMapping = {
                email: "email_notifications",
                sms: "sms_notifications",
                push: "push_notifications",
            };

            if (!columnMapping[type]) {
                throw new Error("유효하지 않은 알림 타입입니다.");
            }

            const column = columnMapping[type];
            const result = await conn.query(
                `UPDATE notification_setting 
                SET ${column} = ? 
                WHERE user_id = ?`,
                [value, user_id]
            );

            return result.affectedRows > 0;
        } finally {
            if (conn) conn.release();
        }
    }
}

export default new UserService();
