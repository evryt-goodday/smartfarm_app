import { pool } from '../../../models/db.js'

class ActuatorService {
  /**
   * 하우스별 액추에이터 목록 조회
   */
  async getActuatorsByHouse(houseId) {
    const query = `
      SELECT 
        ad.actuator_id,
        ad.house_id,
        ad.device_id,
        ad.name,
        ad.actuator_type,
        ad.is_on,
        ad.model,
        ad.location,
        ad.status as device_status,
        ad.created_at,
        ad.updated_at,
        h.control_mode as mode
      FROM actuator_device ad
      INNER JOIN house h ON ad.house_id = h.house_id
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

  /**
   * 특정 액추에이터 상태 조회
   */
  async getActuatorStatus(actuatorId) {
    const query = `
      SELECT 
        ad.actuator_id,
        ad.house_id,
        ad.device_id,
        ad.actuator_type,
        ad.name,
        ad.is_on,
        ad.model,
        ad.location,
        ad.status as device_status,
        ad.created_at,
        ad.updated_at,
        h.control_mode as mode
      FROM actuator_device ad
      INNER JOIN house h ON ad.house_id = h.house_id
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

  /**
   * 액추에이터 제어 (ON/OFF/AUTO/MANUAL)
   */
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
      
      if (mode) {
        // 모드 변경 (auto/manual) - house 테이블의 control_mode 업데이트
        const houseQuery = `SELECT house_id FROM actuator_device WHERE actuator_id = ?`
        const houseResult = await connection.query(houseQuery, [actuatorId])
        const houseId = houseResult[0]?.house_id
        
        if (!houseId) {
          throw new Error('하우스 정보를 찾을 수 없습니다.')
        }
        
        const modeQuery = `
          UPDATE house
          SET control_mode = ?, updated_at = CURRENT_TIMESTAMP
          WHERE house_id = ?
        `
        await connection.query(modeQuery, [mode, houseId])
      } else {
        // ON/OFF 상태 변경 - actuator_device 테이블 업데이트
        const statusQuery = `
          UPDATE actuator_device
          SET is_on = ?, updated_at = CURRENT_TIMESTAMP
          WHERE actuator_id = ?
        `
        await connection.query(statusQuery, [isOn, actuatorId])
      }

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

  /**
   * 제어 이력 조회
   */
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
