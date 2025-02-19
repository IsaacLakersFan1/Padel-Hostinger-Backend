"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRankings = exports.getPlayerStats = exports.getPossibleTeammates = exports.updateStatus = exports.getActivePlayers = exports.createPlayer = exports.getPlayerById = exports.getAllPlayers = void 0;
const prismaClient_1 = __importDefault(require("../utils/prismaClient"));
const getAllPlayers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const players = yield prismaClient_1.default.player.findMany({
            where: {
                userId: userId ? parseInt(userId) : undefined
            }
        });
        res.status(200).json(players);
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.getAllPlayers = getAllPlayers;
const getPlayerById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const playerId = req.params.id;
        const player = yield prismaClient_1.default.player.findUnique({
            where: {
                id: parseInt(playerId)
            }
        });
        if (!player) {
            res.status(404).json({ error: "Player not found" });
            return;
        }
        res.status(200).json(player);
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.getPlayerById = getPlayerById;
const createPlayer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const userId = req.user.userId;
        const { name } = req.body;
        const player = yield prismaClient_1.default.player.create({
            data: {
                name,
                status: 'active',
                imageUrl: name.toLowerCase().replace(/\s+/g, '-'),
                userId: parseInt(userId)
            }
        });
        res.status(201).json(player);
    }
    catch (error) {
        console.error("Error creating player:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.createPlayer = createPlayer;
const getActivePlayers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId;
        const activePlayers = yield prismaClient_1.default.player.findMany({
            where: {
                userId: parseInt(userId),
                status: "active"
            }
        });
        res.status(200).json(activePlayers);
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.getActivePlayers = getActivePlayers;
const updateStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const userId = req.user.userId;
        const playerId = req.params.id;
        const { status } = req.body;
        const player = yield prismaClient_1.default.player.update({
            where: {
                id: parseInt(playerId),
                userId: parseInt(userId)
            },
            data: { status }
        });
        res.status(200).json(player);
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.updateStatus = updateStatus;
const getPossibleTeammates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { matchId } = req.params;
    console.log(matchId);
    try {
        if (!req.user) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        const userId = parseInt(req.user.userId);
        console.log(userId);
        const match = yield prismaClient_1.default.match.findUnique({
            where: { id: parseInt(matchId), userId: userId },
            select: {
                player1Id: true,
                player2Id: true,
                player3Id: true,
                player4Id: true
            }
        });
        if (!match) {
            res.status(404).json({ error: "Match not found" });
            return;
        }
        const activePlayers = yield prismaClient_1.default.player.findMany({
            where: {
                status: "active"
            }
        });
        const assignedPlayerIds = new Set([
            match.player1Id,
            match.player2Id,
            match.player3Id,
            match.player4Id
        ].filter(id => id !== null));
        const possibleTeammates = activePlayers.filter(player => !assignedPlayerIds.has(player.id));
        res.status(200).json(possibleTeammates);
    }
    catch (error) {
        console.error("Error fetching possible teammates:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.getPossibleTeammates = getPossibleTeammates;
const getRankings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const lastMatch = yield prismaClient_1.default.match.findFirst({
            where: {
                userId: parseInt(req.user.userId),
            },
            orderBy: {
                season: 'desc'
            },
            select: {
                season: true
            }
        });
        if (!lastMatch) {
            res.status(404).json({ error: "No matches found" });
            return;
        }
        const players = yield prismaClient_1.default.player.findMany({
            where: {
                userId: parseInt(req.user.userId),
            },
            select: {
                id: true,
                name: true,
                status: true,
                userId: true,
                imageUrl: true
            }
        });
        const playersStats = yield Promise.all(players.map((player) => __awaiter(void 0, void 0, void 0, function* () {
            const matches = yield prismaClient_1.default.match.findMany({
                where: {
                    userId: parseInt(req.user.userId),
                    season: lastMatch.season,
                    OR: [
                        { player1Id: player.id },
                        { player2Id: player.id },
                        { player3Id: player.id },
                        { player4Id: player.id }
                    ],
                    winnerTeam: {
                        not: 0
                    }
                },
                select: {
                    id: true,
                    winnerTeam: true,
                    player1Id: true,
                    player2Id: true,
                    player3Id: true,
                    player4Id: true
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });
            let wins = 0;
            let losses = 0;
            let eloHistory = [];
            matches.forEach((match, index) => {
                const isTeam1 = match.player1Id === player.id || match.player2Id === player.id;
                const isTeam2 = match.player3Id === player.id || match.player4Id === player.id;
                if ((isTeam1 && match.winnerTeam === 1) || (isTeam2 && match.winnerTeam === 2)) {
                    wins++;
                    eloHistory.push((eloHistory[index - 1] || 0) + 1);
                }
                else if ((isTeam1 && match.winnerTeam === 2) || (isTeam2 && match.winnerTeam === 1)) {
                    losses++;
                    eloHistory.push((eloHistory[index - 1] || 0) - 1);
                }
                else {
                    eloHistory.push(eloHistory[index - 1] || 0);
                }
            });
            return {
                player: {
                    id: player.id,
                    name: player.name,
                    status: player.status,
                    user_id: player.userId,
                    imageUrl: player.imageUrl
                },
                totalMatches: matches.length,
                wins,
                losses,
                eloHistory
            };
        })));
        res.status(200).json({
            players: playersStats,
            season: lastMatch.season
        });
    }
    catch (error) {
        console.error("Error fetching players stats:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.getRankings = getRankings;
const getPlayerStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const { playerId, season } = req.body; // Optional season filter
        if (!playerId) {
            res.status(400).json({ error: "Player ID is required" });
            return;
        }
        // Fetch player info
        const player = yield prismaClient_1.default.player.findUnique({
            where: { id: playerId },
            select: { id: true, name: true, status: true, userId: true, imageUrl: true }
        });
        if (!player) {
            res.status(404).json({ error: "Player not found" });
            return;
        }
        // Fetch matches where the player was involved, filtered by season if provided
        const matches = yield prismaClient_1.default.match.findMany({
            where: Object.assign(Object.assign({ OR: [
                    { player1Id: playerId },
                    { player2Id: playerId },
                    { player3Id: playerId },
                    { player4Id: playerId }
                ] }, (season ? { season: season } : {})), { winnerTeam: {
                    not: 0
                } }),
            select: {
                id: true,
                winnerTeam: true,
                player1Id: true,
                player2Id: true,
                player3Id: true,
                player4Id: true
            }
        });
        let wins = 0;
        let losses = 0;
        let eloHistory = [];
        matches.forEach((match, index) => {
            const isTeam1 = match.player1Id === playerId || match.player2Id === playerId;
            const isTeam2 = match.player3Id === playerId || match.player4Id === playerId;
            if ((isTeam1 && match.winnerTeam === 1) || (isTeam2 && match.winnerTeam === 2)) {
                wins++;
                eloHistory.push((eloHistory[index - 1] || 0) + 1); // Win = +1
            }
            else if ((isTeam1 && match.winnerTeam === 2) || (isTeam2 && match.winnerTeam === 1)) {
                losses++;
                eloHistory.push((eloHistory[index - 1] || 0) - 1); // Loss = -1
            }
            else {
                eloHistory.push(eloHistory[index - 1] || 0); // No change
            }
        });
        res.status(200).json({
            player: {
                id: player.id,
                name: player.name,
                status: player.status,
                user_id: player.userId,
                imageUrl: player.imageUrl
            },
            totalMatches: matches.length,
            wins,
            losses,
            eloHistory
        });
    }
    catch (error) {
        console.error("Error fetching player stats:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.getPlayerStats = getPlayerStats;
