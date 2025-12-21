import express from "express";
import sensorController from "../controller/sensorController.js";

const router = express.Router();

router.get("/:id", sensorController.getSensorById);
router.get("/values/timeframe/:id", sensorController.getValuesByTimeframe);

export default router;
