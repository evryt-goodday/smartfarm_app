import userService from "../service/userService.js";

class UserController {
    // 특정 사용자 조회 (프론트엔드에서 사용)
    async getUserById(req, res) {
        try {
            const user = await userService.getUserById(req.params.id);
            if (!user) {
                return res
                    .status(404)
                    .json({ message: "사용자를 찾을 수 없습니다." });
            }

            res.json(user);
        } catch (err) {
            console.error("사용자 조회 중 오류 발생:", err);
            res.status(500).json({ error: "서버 오류가 발생했습니다." });
        }
    }

    // 사용자 디바이스 조회 (프론트엔드에서 사용)
    async getUserDevice(req, res) {
        try {
            const user = await userService.getUserDevice(req.params.id);
            if (!user) {
                return res
                    .status(404)
                    .json({ message: "사용자를 찾을 수 없습니다." });
            }

            res.json(user);
        } catch (err) {
            console.error("사용자 조회 중 오류 발생:", err);
            res.status(500).json({ error: "서버 오류가 발생했습니다." });
        }
    }

    // 사용자 알림 설정 수정 (프론트엔드에서 사용)
    async updateNotifications(req, res) {
        try {
            const userId = req.params.id;
            const { type, value } = req.body;

            // 알림 타입 메시지 매핑
            const typeMessages = {
                email: "이메일",
                sms: "SMS",
                push: "푸시",
            };

            const success = await userService.updateNotifications(
                userId,
                req.body
            );

            if (!success) {
                const errorMessage = "사용자를 찾을 수 없습니다.";
                console.error(errorMessage);
                return res.status(404).json({
                    message: errorMessage,
                });
            }

            const status = value ? "활성화" : "비활성화";
            const successMessage = `${typeMessages[type]} 알림이 ${status} 되었습니다.`;

            res.json({
                message: successMessage,
            });
        } catch (err) {
            const errorMessage = "서버 오류가 발생했습니다.";
            console.error("알림 설정 수정 중 오류 발생:", err);
            console.error(errorMessage);
            res.status(500).json({ error: errorMessage });
        }
    }
}

export default new UserController();
