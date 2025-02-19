"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const playerController_1 = require("../controllers/playerController");
const router = express_1.default.Router();
router.get('/all-players', authMiddleware_1.authenticateJWT, playerController_1.getAllPlayers);
router.put('/player/:id', authMiddleware_1.authenticateJWT, playerController_1.updateStatus);
router.get('/player/:id', authMiddleware_1.authenticateJWT, playerController_1.getPlayerById);
router.get('/active-players', authMiddleware_1.authenticateJWT, playerController_1.getActivePlayers);
router.post('/player', authMiddleware_1.authenticateJWT, playerController_1.createPlayer);
router.get('/possible-teammates/:matchId', authMiddleware_1.authenticateJWT, playerController_1.getPossibleTeammates);
router.post('/player-stats', authMiddleware_1.authenticateJWT, playerController_1.getPlayerStats);
router.get('/rankings', authMiddleware_1.authenticateJWT, playerController_1.getRankings);
exports.default = router;
