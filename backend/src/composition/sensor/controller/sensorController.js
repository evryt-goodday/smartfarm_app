import sensorService from "../service/sensorService.js";

class SensorController {
    // 특정 센서 조회 (프론트엔드에서 사용)
    async getSensorById(req, res) {
        try {
            const house_id = req.params.id;
            const sensors = await sensorService.getSensorById(house_id);

            if (!sensors) {
                return res
                    .status(404)
                    .json({ message: "센서를 찾을 수 없습니다." });
            }

            const processedSensors = sensors.map((sensor) => ({
                ...sensor,
                row_num: Number(sensor.row_num),
            }));

            res.json(processedSensors);
        } catch (err) {
            console.error("센서 조회 중 오류 발생:", err);
            res.status(500).json({ error: "서버 오류가 발생했습니다." });
        }
    }

    // 시간대별 센서 데이터 조회 (프론트엔드에서 사용)
    async getValuesByTimeframe(req, res) {
        try {
            const house_id = req.params.id;
            const timeframe = req.query.timeframe || "hourly";
            const limit = req.query.limit ? parseInt(req.query.limit) : null;

            const validTimeframes = ["hourly", "daily", "monthly"];
            if (!validTimeframes.includes(timeframe)) {
                return res.status(400).json({
                    success: false,
                    message: "유효하지 않은 시간 프레임입니다.",
                });
            }

            const data = await sensorService.getValuesByTimeframe(
                house_id,
                timeframe,
                limit
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
}

export default new SensorController();
