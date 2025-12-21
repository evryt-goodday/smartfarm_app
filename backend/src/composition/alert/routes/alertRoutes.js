import express from "express";
import alertController from "../controller/alertController.js";

const router = express.Router();

router.get("/:id", alertController.getAlertById);
router.get("/device/:id", alertController.getAlertsByDevice);
router.post("/", alertController.createAlert);

export default router;
