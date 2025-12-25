import { Server } from "socket.io";

let io = null;

export const initializeSocket = (server) => {
	io = new Server(server, {
		cors: {
			origin: "http://localhost:5173",
			methods: ["GET", "POST"],
			credentials: true,
		},
		pingTimeout: 60000,
		pingInterval: 25000,
	})

io.on("connection", (socket) => {
        console.log(`클라이언트 연결됨: ${socket.id}`);

        // 하우스 구독
        socket.on("subscribe:house", (houseId) => {
            socket.join(`house:${houseId}`);
            console.log(`하우스 ${houseId} 구독: ${socket.id}`);
        });

        // 하우스 구독 해제
        socket.on("unsubscribe:house", (houseId) => {
            socket.leave(`house:${houseId}`);
            console.log(`하우스 ${houseId} 구독 해제: ${socket.id}`);
        });

        // 연결 해제
        socket.on("disconnect", (reason) => {
            console.log(`클라이언트 연결 해제: ${socket.id} (${reason})`);
        });

        // 에러 처리
        socket.on("error", (error) => {
            console.error(`Socket 에러 (${socket.id}):`, error);
        });
    });

		console.log("Socket.IO 서버 초기화 완료");
		return io;
}

export const getIO = () => {
	if (!io) {
		throw new Error("Socket.IO가 초기화되지 않았습니다.");
	}
	return io;
};

export const emitSensorUpdate = (houseId, data) => {
	if (!io) return;
	io.to(`house:${houseId}`).emit("sensor:update", data);
	console.log(`센서 데이터 전송 (house:${houseId})`);
}

export const emitActuatorUpdate = (houseId, data) => {
    if (!io) return;
    io.to(`house:${houseId}`).emit("actuator:update", data);
    console.log(`액추에이터 상태 전송 (house:${houseId})`);
};

export const emitAlert = (houseId, alert) => {
    if (!io) return;
    io.to(`house:${houseId}`).emit("alert:new", alert);
    console.log(`알림 전송 (house:${houseId})`);
};