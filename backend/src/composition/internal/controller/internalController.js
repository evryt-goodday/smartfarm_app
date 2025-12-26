import { emitSensorUpdate } from "../../../config/socketConfig.js";

class InternalController {
    /**
     * iot-server에서 이벤트 수신 시 WebSocket으로 브로드캐스트
     */
    async notifySensorUpdate(req, res) {
        try {
            const { event, houseId, deviceId, value, timestamp, ...otherData } = req.body;

            // 이벤트 타입에 따라 처리
            if (event === "actuator:updated") {
                // 액추에이터 업데이트 이벤트
                console.log(`액추에이터 업데이트 알림 수신:`, otherData);
                
                // WebSocket으로 전송 (필요시 socketConfig에 emitActuatorUpdate 함수 추가)
                // emitActuatorUpdate(houseId, otherData);
                
                return res.json({
                    success: true,
                    message: "액추에이터 업데이트 알림 완료",
                });
            }

            // 센서 데이터 업데이트 이벤트 (기존 로직)
            if (!houseId || !deviceId || value === undefined) {
                return res.status(400).json({
                    success: false,
                    message: "필수 파라미터가 누락되었습니다.",
                });
            }

            // WebSocket으로 전송
            emitSensorUpdate(houseId, {
                deviceId,
                value,
                timestamp: timestamp || new Date(),
            });

            res.json({
                success: true,
                message: "센서 데이터 브로드캐스트 완료",
            });
        } catch (error) {
            console.error("알림 처리 중 오류:", error);
            res.status(500).json({
                success: false,
                message: "서버 오류가 발생했습니다.",
            });
        }
    }
}

export default new InternalController();
