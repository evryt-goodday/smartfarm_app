import detailService from "../service/detailService.js";

class DetailController {
    // 특정 임계값 조회 (프론트엔드에서 사용)
    async getDetailById(req, res) {
        try {
            const device_id = req.params.id;
            const house_id = req.query.house_id;

            if (!house_id) {
                return res.status(400).json({
                    message: "house_id가 필요합니다.",
                });
            }

            const details = await detailService.getDetailById(
                house_id,
                device_id
            );

            if (!details) {
                return res.status(404).json({
                    message: "임계값를 찾을 수 없습니다.",
                });
            }

            res.json(details);
        } catch (err) {
            console.error("임계값 조회 중 오류 발생:", err);
            res.status(500).json({ error: "서버 오류가 발생했습니다." });
        }
    }

    // 센서 시간대별 데이터 조회 (프론트엔드에서 사용)
    async getCurrentValuesByTimeframe(req, res) {
        try {
            const device_id = req.params.id;
            const timeframe = req.query.timeframe || "hourly";

            const validTimeframes = ["hourly", "daily", "monthly"];
            if (!validTimeframes.includes(timeframe)) {
                return res.status(400).json({
                    success: false,
                    message: "유효하지 않은 시간 프레임입니다.",
                });
            }

            const data = await detailService.getCurrentValuesByTimeframe(
                device_id,
                timeframe
            );

            if (!data) {
                return res.status(404).json({
                    success: false,
                    message: "데이터가 없습니다.",
                });
            }

            res.json(data);
        } catch (error) {
            console.error("데이터 조회 오류:", error);
            res.status(500).json({
                success: false,
                message: "서버 오류가 발생했습니다.",
            });
        }
    }

    // 임계값 수정 (프론트엔드에서 사용)
    async updateRange(req, res) {
        try {
            const deviceId = req.params.id;
            const { min_value, max_value } = req.body;
            if (min_value === undefined || max_value === undefined) {
                return res.status(400).json({
                    message: "min_value와 max_value는 필수 항목입니다.",
                });
            }
            if (Number(min_value) >= Number(max_value)) {
                return res.status(400).json({
                    message: "min_value는 max_value보다 작아야 합니다.",
                });
            }
            const success = await detailService.updateRange(deviceId, req.body);
            if (!success) {
                return res
                    .status(404)
                    .json({ message: "센서를 찾을 수 없습니다." });
            }
            res.json({
                message: "센서 임계값이 성공적으로 수정되었습니다.",
                data: {
                    device_id: deviceId,
                    min_value: req.body.min_value,
                    max_value: req.body.max_value,
                },
            });
        } catch (err) {
            console.error("임계값 수정 중 오류 발생:", err);
            res.status(500).json({ error: "서버 오류가 발생했습니다." });
        }
    }
}

export default new DetailController();
