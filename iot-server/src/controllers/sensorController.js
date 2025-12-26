import { pool } from "../models/db.js";
import { notifyBackendSensorUpdate, notifyBackend } from "../services/backendService.js";

export const saveSensorData = async (req, res) => {
    const { sensorId, value, actuators, mode } = req.body;

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

        // 2. actuator 상태가 있으면 actuator_status 업데이트
        if (actuators) {
            for (const [type, isOn] of Object.entries(actuators)) {
                await conn.query(
                    `UPDATE actuator_status AS ast
                     JOIN actuator_device AS ad ON ast.actuator_id = ad.actuator_id
                     SET ast.is_on = ?, ast.updated_at = NOW()
                     WHERE ad.actuator_type = ?`,
                    [isOn, type]
                );
            }
        }

        // 3. 센서의 house_id 조회
        const houseQuery = "SELECT house_id FROM sensor_device WHERE device_id = ?";
        const houseResult = await conn.query(houseQuery, [sensorId]);
        
        if (houseResult && houseResult.length > 0) {
            const houseId = houseResult[0].house_id;
            
            // 4. Backend로 실시간 알림 전송 (비동기, 에러 무시)
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

/**
 * 제어 명령 조회 (Arduino polling용)
 * GET /api/sensor/control/:actuatorId
 */
export const getControlCommand = async (req, res) => {
    const { actuatorId } = req.params;

    if (!actuatorId) {
        return res.status(400).json({
            success: false,
            message: "actuatorId는 필수입니다.",
        });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        // 대기 중인(pending) 명령 조회
        const commands = await conn.query(
            `SELECT 
                CAST(command_id AS CHAR) as command_id,
                command,
                created_at
             FROM control_command
             WHERE actuator_id = ? 
               AND status = 'pending'
             ORDER BY created_at ASC
             LIMIT 1`,
            [actuatorId]
        );

        if (commands.length === 0) {
            // 명령 없음
            return res.json({
                hasCommand: false,
            });
        }

        const command = commands[0];

        // 명령 상태를 'executing'으로 변경
        await conn.query(
            `UPDATE control_command 
             SET status = 'executing'
             WHERE command_id = ?`,
            [command.command_id]
        );

        // Arduino에 명령 전달
        res.json({
            hasCommand: true,
            commandId: Number(command.command_id),
            command: command.command,
            createdAt: command.created_at,
        });

        console.log(
            `[제어 명령 전달] actuatorId: ${actuatorId}, commandId: ${command.command_id}, command: ${command.command}`
        );
    } catch (error) {
        console.error("제어 명령 조회 실패:", error);
        res.status(500).json({
            success: false,
            message: "명령 조회 중 오류가 발생했습니다.",
        });
    } finally {
        if (conn) conn.release();
    }
};

/**
 * 제어 명령 실행 결과 업데이트
 * POST /api/sensor/status
 */
export const updateCommandStatus = async (req, res) => {
    const { commandId, status, errorMessage, actuators } = req.body;

    if (!commandId || !status) {
        return res.status(400).json({
            success: false,
            message: "commandId와 status는 필수입니다.",
        });
    }

    // 유효한 상태값 체크
    const validStatuses = ["executed", "failed"];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: "status는 'executed' 또는 'failed'만 가능합니다.",
        });
    }

    let conn;
    try {
        conn = await pool.getConnection();

        // 1. control_command 테이블 업데이트
        await conn.query(
            `UPDATE control_command 
             SET status = ?, 
                 executed_at = NOW(),
                 error_message = ?
             WHERE command_id = ?`,
            [status, errorMessage || null, commandId]
        );

        // 2. actuator_status 업데이트 (실행 성공 시만)
        if (status === "executed" && actuators) {
            for (const [type, isOn] of Object.entries(actuators)) {
                await conn.query(
                    `UPDATE actuator_status AS ast
                     JOIN actuator_device AS ad ON ast.actuator_id = ad.actuator_id
                     SET ast.is_on = ?, ast.updated_at = NOW()
                     WHERE ad.actuator_type = ?`,
                    [isOn, type]
                );
            }
        }

        // 3. 명령 정보 조회 (backend 알림용)
        const commands = await conn.query(
            `SELECT 
                CAST(cc.command_id AS CHAR) as command_id,
                cc.actuator_id,
                cc.command,
                cc.status,
                ad.actuator_type,
                ad.name,
                ad.house_id
             FROM control_command cc
             JOIN actuator_device ad ON cc.actuator_id = ad.actuator_id
             WHERE cc.command_id = ?`,
            [commandId]
        );

        if (commands.length === 0) {
            return res.status(404).json({
                success: false,
                message: "명령을 찾을 수 없습니다.",
            });
        }

        const command = commands[0];

        // 4. backend에 실행 결과 알림
        await notifyBackend({
            event: "actuator:updated",
            commandId: Number(command.command_id),
            actuatorId: command.actuator_id,
            actuatorType: command.actuator_type,
            actuatorName: command.name,
            command: command.command,
            status: status,
            houseId: command.house_id,
            timestamp: new Date(),
        });

        res.json({
            success: true,
            message: "명령 실행 결과가 업데이트되었습니다.",
        });

        console.log(
            `[제어 명령 완료] commandId: ${commandId}, status: ${status}`
        );
    } catch (error) {
        console.error("명령 상태 업데이트 실패:", error);
        res.status(500).json({
            success: false,
            message: "상태 업데이트 중 오류가 발생했습니다.",
        });
    } finally {
        if (conn) conn.release();
    }
};
