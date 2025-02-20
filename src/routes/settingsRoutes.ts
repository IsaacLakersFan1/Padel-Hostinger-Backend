import express from "express";
import { authenticateJWT } from "../middleware/authMiddleware";
import { downloadDB } from "../controllers/settingsController";

const router = express.Router();

router.get("/download-db", authenticateJWT, downloadDB);

export default router;
