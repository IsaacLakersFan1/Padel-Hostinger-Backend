"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const settingsController_1 = require("../controllers/settingsController");
const router = express_1.default.Router();
router.get("/download-db", authMiddleware_1.authenticateJWT, settingsController_1.downloadDB);
exports.default = router;
