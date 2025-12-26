import express from 'express'
import actuatorController from '../controller/actuatorController.js'

const router = express.Router()

router.get('/:houseId', actuatorController.getActuatorsByHouse)

router.get('/status/:actuatorId', actuatorController.getActuatorStatus)

router.post('/control', actuatorController.controlActuator)

router.get('/history/:actuatorId', actuatorController.getControlHistory)

export default router
