import actuatorService from '../service/actuatorService.js'
import { emitActuatorUpdate } from '../../../config/socketConfig.js'

class ActuatorController {
  async getActuatorsByHouse(req, res) {
    try {
      const { houseId } = req.params
      const actuators = await actuatorService.getActuatorsByHouse(houseId)

      res.json({
        success: true,
        data: actuators,
      })
    } catch (error) {
      console.error('액추에이터 목록 조회 실패:', error)
      res.status(500).json({
        success: false,
        message: '액추에이터 목록을 불러오는데 실패했습니다.',
      })
    }
  }

  async getActuatorStatus(req, res) {
    try {
      const { actuatorId } = req.params
      const actuator = await actuatorService.getActuatorStatus(actuatorId)

      if (!actuator) {
        return res.status(404).json({
          success: false,
          message: '액추에이터를 찾을 수 없습니다.',
        })
      }

      res.json({
        success: true,
        data: actuator,
      })
    } catch (error) {
      console.error('액추에이터 상태 조회 실패:', error)
      res.status(500).json({
        success: false,
        message: '액추에이터 상태를 불러오는데 실패했습니다.',
      })
    }
  }

  async controlActuator(req, res) {
    try {
      const { actuatorId, command, userId } = req.body

      // Validation
      if (!actuatorId || !command) {
        return res.status(400).json({
          success: false,
          message: 'actuatorId와 command는 필수입니다.',
        })
      }

      if (!['ON', 'OFF', 'AUTO', 'MANUAL'].includes(command.toUpperCase())) {
        return res.status(400).json({
          success: false,
          message: 'command는 ON, OFF, AUTO 또는 MANUAL만 가능합니다.',
        })
      }

      // 제어 실행
      const result = await actuatorService.controlActuator(
        actuatorId,
        command,
        userId || 1 // 기본 사용자 ID
      )

      // Socket.IO로 실시간 상태 전송
      const actuator = await actuatorService.getActuatorStatus(actuatorId)
      if (actuator) {
        emitActuatorUpdate(actuator.house_id, {
          actuatorId: actuator.actuator_id,
          status: command,
          isOn: actuator.is_on,
          mode: actuator.mode,
          timestamp: new Date(),
          name: actuator.name,
          type: actuator.actuator_type,
        })
      }

      res.json({
        success: true,
        data: result,
        message: `액추에이터가 ${command} 상태로 변경되었습니다.`,
      })
    } catch (error) {
      console.error('액추에이터 제어 실패:', error)
      res.status(500).json({
        success: false,
        message: '액추에이터 제어에 실패했습니다.',
      })
    }
  }

  async getControlHistory(req, res) {
    try {
      const { actuatorId } = req.params
      const limit = parseInt(req.query.limit) || 50

      const history = await actuatorService.getControlHistory(actuatorId, limit)

      res.json({
        success: true,
        data: history,
      })
    } catch (error) {
      console.error('제어 이력 조회 실패:', error)
      res.status(500).json({
        success: false,
        message: '제어 이력을 불러오는데 실패했습니다.',
      })
    }
  }
}

export default new ActuatorController()
