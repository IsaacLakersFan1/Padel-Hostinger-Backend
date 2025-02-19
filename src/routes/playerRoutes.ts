import express from "express";
import { authenticateJWT } from "../middleware/authMiddleware";
import { getAllPlayers, getPlayerById, createPlayer, getActivePlayers, updateStatus, getPossibleTeammates, getPlayerStats, getRankings } from "../controllers/playerController";

const router = express.Router();

router.get('/all-players', authenticateJWT, getAllPlayers);
router.put('/player/:id', authenticateJWT, updateStatus);
router.get('/player/:id', authenticateJWT, getPlayerById);
router.get('/active-players', authenticateJWT, getActivePlayers);
router.post('/player', authenticateJWT, createPlayer);
router.get('/possible-teammates/:matchId', authenticateJWT, getPossibleTeammates);
router.post('/player-stats', authenticateJWT, getPlayerStats);
router.get('/rankings', authenticateJWT, getRankings);
export default router;
