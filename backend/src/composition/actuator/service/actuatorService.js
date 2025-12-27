import { pool } from '../../../models/db.js'

class ActuatorService {
  async getActuatorsByHouse(houseId) {
    const query = `
      SELECT 
        ad.actuator_id,
        ad.house_id,
        ad.device_id,
        ad.name,
        ad.actuator_type,
        ad.model,
        ad.location,
        ad.status as device_status,
        ad.created_at,
        ast.is_on,
        ast.mode,
        ast.brightness,
        ast.updated_at
      FROM actuator_device ad
      LEFT JOIN actuator_status ast ON ad.actuator_id = ast.actuator_id
      WHERE ad.house_id = ?
      ORDER BY ad.actuator_id
    `
    
    let conn
    try {
      conn = await pool.getConnection()
      const rows = await conn.query(query, [houseId])
      return rows
    } finally {
      if (conn) conn.release()
    }
  }

  async getActuatorStatus(actuatorId) {
    const query = `
      SELECT 
        ad.actuator_id,
        ad.house_id,
        ad.device_id,
        ad.actuator_type,
        ad.name,
        ad.model,
        ad.location,
        ad.status as device_status,
        ad.created_at,
        ad.updated_at as device_updated_at,
        ast.is_on,
        ast.mode,
        ast.brightness,
        ast.updated_at as status_updated_at
      FROM actuator_device ad
      LEFT JOIN actuator_status ast ON ad.actuator_id = ast.actuator_id
      WHERE ad.actuator_id = ?
    `
    
    let conn
    try {
      conn = await pool.getConnection()
      const rows = await conn.query(query, [actuatorId])
      return rows[0]
    } finally {
      if (conn) conn.release()
    }
  }


  async controlActuator(actuatorId, command, userId) {
    const connection = await pool.getConnection()

    try {
      await connection.beginTransaction()

      // 1. 제어 명령 저장
      const commandQuery = `
        INSERT INTO control_command (actuator_id, command, requested_by, status)
        VALUES (?, ?, ?, 'pending')
      `
      await connection.query(commandQuery, [actuatorId, command.toLowerCase(), userId])

      // 2. 액추에이터 상태 업데이트
      const isOn = command.toLowerCase() === 'on'
      const mode = ['auto', 'manual'].includes(command.toLowerCase()) ? command.toLowerCase() : null
      
      let statusQuery
      let statusParams
      
      if (mode) {
        // 모드 변경 (auto/manual)
        statusQuery = `
          INSERT INTO actuator_status (actuator_id, mode)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE
            mode = VALUES(mode),
            updated_at = CURRENT_TIMESTAMP
        `
        statusParams = [actuatorId, mode]
      } else {
        // ON/OFF 상태 변경
        statusQuery = `
          INSERT INTO actuator_status (actuator_id, is_on)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE
            is_on = VALUES(is_on),
            updated_at = CURRENT_TIMESTAMP
        `
        statusParams = [actuatorId, isOn]
      }
      
      await connection.query(statusQuery, statusParams)

      await connection.commit()

      return {
        success: true,
        actuatorId,
        command,
        timestamp: new Date(),
      }
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  async getControlHistory(actuatorId, limit = 50) {
    const query = `
      SELECT 
        cc.command_id,
        cc.actuator_id,
        cc.command,
        cc.created_at,
        cc.executed_at,
        cc.status,
        cc.error_message,
        u.name as requested_by_name
      FROM control_command cc
      LEFT JOIN user u ON cc.requested_by = u.user_id
      WHERE cc.actuator_id = ?
      ORDER BY cc.created_at DESC
      LIMIT ?
    `
    
    let conn
    try {
      conn = await pool.getConnection()
      const rows = await conn.query(query, [actuatorId, limit])
      return rows
    } finally {
      if (conn) conn.release()
    }
  }
}
export default new ActuatorService()
