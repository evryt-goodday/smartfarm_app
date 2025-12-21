import express from "express";
import detailController from "../controller/detailController.js";

const router = express.Router();

router.get("/:id", detailController.getDetailById);
router.get(
    "/current/timeframe/:id",
    detailController.getCurrentValuesByTimeframe
);
router.patch("/range/:id", detailController.updateRange);

export default router;
