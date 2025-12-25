import { emitSensorUpdate } from "../../../config/socketConfig.js";

class InternalController {
    /**
     * iot-server에서 센서 데이터 수신 시 WebSocket으로 브로드캐스트
     */
    async notifySensorUpdate(req, res) {
        try {
            const { houseId, deviceId, value, timestamp } = req.body;

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
            console.error("센서 데이터 알림 중 오류:", error);
            res.status(500).json({
                success: false,
                message: "서버 오류가 발생했습니다.",
            });
        }
    }
}

export default new InternalController();
