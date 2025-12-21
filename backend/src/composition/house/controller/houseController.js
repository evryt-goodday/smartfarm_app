import houseService from "../service/houseService.js";

class HouseController {
    // 특정 하우스 조회 (프론트엔드에서 사용)
    async getHouseById(req, res) {
        try {
            const house = await houseService.getHouseById(req.params.id);
            if (!house) {
                return res
                    .status(404)
                    .json({ message: "하우스를 찾을 수 없습니다." });
            }
            res.json(house);
        } catch (err) {
            console.error("하우스 조회 중 오류 발생:", err);
            res.status(500).json({ error: "서버 오류가 발생했습니다." });
        }
    }
}

export default new HouseController();
