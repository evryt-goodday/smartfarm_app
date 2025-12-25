import express from "express"
import cors from "cors"
import { testConnection } from "./models/db.js";
import sensorRoutes from "./routes/sensorRoutes.js";
import { checkBackendHealth } from "./services/backendService.js";

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

testConnection();

setTimeout(() => {
	checkBackendHealth();
}, 2000);

app.use("/api/sensor", sensorRoutes);

app.get("/", (req, res) => {
	res.send("IoT Data Receiver Server is running");
})

app.listen(PORT, () => {
	console.log(`IoT Data Receiver Server is running on port ${PORT}`);
	console.log(`Backend 연동 준비 완료`);
})
