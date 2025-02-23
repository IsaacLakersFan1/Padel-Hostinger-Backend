import { Router } from "express";
import { createMatchesMode1, createMatchesMode2, updateMatchTeamWinner, addTeammate, getLastRunMatches, getMatchById, updateMatch, createMatch, getMatchesByRun } from "../controllers/matchController";
import { authenticateJWT } from "../middleware/authMiddleware";

const router = Router();

router.post('/create-matches-mode-1', authenticateJWT, createMatchesMode1);
router.post('/create-matches-mode-2', authenticateJWT, createMatchesMode2);
router.post('/update-match-team-winner', authenticateJWT, updateMatchTeamWinner);
router.post('/add-teammate', authenticateJWT, addTeammate);
router.get('/last-run-matches', authenticateJWT, getLastRunMatches);
router.get('/get-match-by-id', authenticateJWT, getMatchById);
router.post('/update-match', authenticateJWT, updateMatch);
router.post('/create-match', authenticateJWT, createMatch);
router.get('/get-matches-by-run', authenticateJWT, getMatchesByRun);
export default router;  
