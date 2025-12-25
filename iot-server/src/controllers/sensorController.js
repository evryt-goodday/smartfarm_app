import { pool } from "../models/db.js";
import { notifyBackendSensorUpdate } from "../services/backendService.js";

export const saveSensorData = async (req, res) => {
    const { sensorId, value } = req.body;

    if (!sensorId || value === undefined) {
        return res.status(400).json({ 
            success: false,
            message: "Missing sensorId or value" 
        });
    }

    let conn;
    try {
        conn = await pool.getConnection();
        
        // 1. sensor_data 테이블에 데이터 삽입
        const query = "INSERT INTO sensor_data (device_id, value, recorded_at) VALUES (?, ?, NOW())";
        await conn.query(query, [sensorId, value]);
        
        console.log(`📊 센서 데이터 저장 - Sensor: ${sensorId}, Value: ${value}`);

        // 2. 센서의 house_id 조회
        const houseQuery = "SELECT house_id FROM sensor_device WHERE device_id = ?";
        const houseResult = await conn.query(houseQuery, [sensorId]);
        
        if (houseResult && houseResult.length > 0) {
            const houseId = houseResult[0].house_id;
            
            // 3. Backend로 실시간 알림 전송 (비동기, 에러 무시)
            notifyBackendSensorUpdate(houseId, sensorId, value)
                .catch(err => console.error("Backend 알림 중 에러:", err));
        }

        res.status(201).json({ 
            success: true,
            message: "Data saved successfully" 
        });
    } catch (err) {
        console.error("❌ 센서 데이터 저장 실패:", err);
        res.status(500).json({ 
            success: false,
            message: "Internal Server Error" 
        });
    } finally {
        if (conn) conn.release();
    }
};
