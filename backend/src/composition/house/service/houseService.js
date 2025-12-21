import { pool } from "../../../models/db.js";

class HouseService {
    // 특정 하우스 조회
    async getHouseById(house_id) {
        let conn;
        try {
            conn = await pool.getConnection();
            const rows = await conn.query(
                "SELECT name, house_id FROM house WHERE owner_id = ? ORDER BY house_id",
                [house_id]
            );
            return rows.length ? rows : null;
        } finally {
            if (conn) conn.release();
        }
    }
}

export default new HouseService();
