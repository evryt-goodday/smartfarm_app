import express from "express";
import userController from "../controller/userController.js";

const router = express.Router();

router.get("/:id", userController.getUserById);
router.get("/device/:id", userController.getUserDevice);
router.patch("/notifications/:id", userController.updateNotifications);

export default router;
