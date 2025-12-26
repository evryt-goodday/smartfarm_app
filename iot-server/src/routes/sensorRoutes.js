import express from "express";
import { 
    saveSensorData, 
    getControlCommand, 
    updateCommandStatus 
} from "../controllers/sensorController.js";

const router = express.Router();

// 센서 데이터 저장
router.post("/data", saveSensorData);

// 제어 명령 조회 (Arduino polling)
router.get("/control/:actuatorId", getControlCommand);

// 제어 명령 실행 결과 업데이트
router.post("/status", updateCommandStatus);

export default router;
