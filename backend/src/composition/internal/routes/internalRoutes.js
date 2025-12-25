import express from "express";
import internalController from "../controller/internalController.js";

const router = express.Router();

// POST /internal/sensor/notify
router.post("/sensor/notify", internalController.notifySensorUpdate);

export default router;
