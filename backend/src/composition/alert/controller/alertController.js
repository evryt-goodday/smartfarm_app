import alertService from "../service/alertService.js";

class AlertController {
    // 특정 하우스의 알림 조회
    async getAlertById(req, res) {
        try {
            const house_id = req.params.id;
            const alerts = await alertService.getAlertById(house_id);

            if (!alerts) {
                return res
                    .status(404)
                    .json({ message: "알림을 찾을 수 없습니다." });
            }

            res.status(200).json(alerts);
        } catch (error) {
            console.error("Failed to get alert:", error);
            res.status(500).json({ message: "서버 오류가 발생했습니다." });
        }
    }

    // 특정 디바이스의 알림 조회
    async getAlertsByDevice(req, res) {
        try {
            const house_id = req.query.house_id;
            const device_id = req.params.id;
            const alerts = await alertService.getAlertsByDevice(
                house_id,
                device_id
            );

            if (!alerts) {
                return res
                    .status(404)
                    .json({ message: "알림을 찾을 수 없습니다." });
            }

            res.status(200).json(alerts);
        } catch (error) {
            console.error("Failed to get device alerts:", error);
            res.status(500).json({ message: "서버 오류가 발생했습니다." });
        }
    }

    // 알림 생성
    async createAlert(req, res) {
        try {
            const alertData = req.body;

            if (
                !alertData.house_id ||
                !alertData.device_id ||
                !alertData.alert_type ||
                !alertData.message
            ) {
                return res
                    .status(400)
                    .json({ message: "모든 필수 필드를 제공해야 합니다." });
            }

            const newAlert = await alertService.createAlert(alertData);

            if (!newAlert) {
                return res
                    .status(500)
                    .json({ message: "알림 생성에 실패했습니다." });
            }

            res.status(201).json(newAlert);
        } catch (error) {
            console.error("Failed to create alert:", error);
            res.status(500).json({ message: "서버 오류가 발생했습니다." });
        }
    }
}

export default new AlertController();
