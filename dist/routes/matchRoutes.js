"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const matchController_1 = require("../controllers/matchController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
router.post('/create-matches-mode-1', authMiddleware_1.authenticateJWT, matchController_1.createMatchesMode1);
router.post('/create-matches-mode-2', authMiddleware_1.authenticateJWT, matchController_1.createMatchesMode2);
router.post('/update-match-team-winner', authMiddleware_1.authenticateJWT, matchController_1.updateMatchTeamWinner);
router.post('/add-teammate', authMiddleware_1.authenticateJWT, matchController_1.addTeammate);
router.get('/last-run-matches', authMiddleware_1.authenticateJWT, matchController_1.getLastRunMatches);
exports.default = router;
