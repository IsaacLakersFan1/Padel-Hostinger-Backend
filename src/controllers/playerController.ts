import { Request, Response } from "express";
import { AuthRequest } from "../middleware/interfaces/authRequestUser";
import prisma from "../utils/prismaClient";

const getAllPlayers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const players = await prisma.player.findMany({
      where: {
        userId: userId ? parseInt(userId) : undefined,
      },
    });
    res.status(200).json(players);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const getPlayerById = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const playerId = req.params.id;
    const player = await prisma.player.findUnique({
      where: {
        id: parseInt(playerId),
      },
    });
    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }
    res.status(200).json(player);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const createPlayer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const userId = req.user.userId;
    const { name } = req.body;
    const player = await prisma.player.create({
      data: {
        name,
        status: "active",
        imageUrl: name.toLowerCase().replace(/\s+/g, "-"),
        userId: parseInt(userId),
      },
    });
    res.status(201).json(player);
  } catch (error) {
    console.error("Error creating player:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getActivePlayers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userId = req.user?.userId;
    const activePlayers = await prisma.player.findMany({
      where: {
        userId: parseInt(userId),
        status: "active",
      },
    });
    res.status(200).json(activePlayers);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const userId = req.user.userId;
    const playerId = req.params.id;
    const { status } = req.body;

    const player = await prisma.player.update({
      where: {
        id: parseInt(playerId),
        userId: parseInt(userId),
      },
      data: { status },
    });

    res.status(200).json(player);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};

const getPossibleTeammates = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { matchId } = req.params;

  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userId = parseInt(req.user.userId);

    const match = await prisma.match.findUnique({
      where: { id: parseInt(matchId), userId: userId },
      select: {
        player1Id: true,
        player2Id: true,
        player3Id: true,
        player4Id: true,
      },
    });

    if (!match) {
      res.status(404).json({ error: "Match not found" });
      return;
    }

    const activePlayers = await prisma.player.findMany({
      where: {
        status: "active",
        userId: userId,
      },
    });

    const assignedPlayerIds = new Set(
      [
        match.player1Id,
        match.player2Id,
        match.player3Id,
        match.player4Id,
      ].filter((id) => id !== null)
    );

    const possibleTeammates = activePlayers.filter(
      (player) => !assignedPlayerIds.has(player.id)
    );

    res.status(200).json(possibleTeammates);
  } catch (error) {
    console.error("Error fetching possible teammates:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getRankings = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const lastMatch = await prisma.match.findFirst({
      where: {
        userId: parseInt(req.user.userId),
      },
      orderBy: {
        season: "desc",
      },
      select: {
        season: true,
      },
    });

    if (!lastMatch) {
      res.status(404).json({ error: "No matches found" });
      return;
    }

    const players = await prisma.player.findMany({
      where: {
        userId: parseInt(req.user.userId),
      },
      select: {
        id: true,
        name: true,
        status: true,
        userId: true,
        imageUrl: true,
      },
    });

    const playersStats = await Promise.all(
      players.map(async (player) => {
        const matches = await prisma.match.findMany({
          where: {
            userId: parseInt(req.user!.userId),
            season: lastMatch.season,
            OR: [
              { player1Id: player.id },
              { player2Id: player.id },
              { player3Id: player.id },
              { player4Id: player.id },
            ],
            winnerTeam: {
              not: 0,
            },
          },
          select: {
            id: true,
            winnerTeam: true,
            player1Id: true,
            player2Id: true,
            player3Id: true,
            player4Id: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

        let wins = 0;
        let losses = 0;
        let eloHistory: number[] = [];

        matches.forEach((match, index) => {
          const isTeam1 =
            match.player1Id === player.id || match.player2Id === player.id;
          const isTeam2 =
            match.player3Id === player.id || match.player4Id === player.id;

          if (
            (isTeam1 && match.winnerTeam === 1) ||
            (isTeam2 && match.winnerTeam === 2)
          ) {
            wins++;
            eloHistory.push((eloHistory[index - 1] || 0) + 1);
          } else if (
            (isTeam1 && match.winnerTeam === 2) ||
            (isTeam2 && match.winnerTeam === 1)
          ) {
            losses++;
            eloHistory.push((eloHistory[index - 1] || 0) - 1);
          } else {
            eloHistory.push(eloHistory[index - 1] || 0);
          }
        });

        return {
          player: {
            id: player.id,
            name: player.name,
            status: player.status,
            user_id: player.userId,
            imageUrl: player.imageUrl,
          },
          totalMatches: matches.length,
          wins,
          losses,
          eloHistory,
        };
      })
    );

    res.status(200).json({
      players: playersStats,
      season: lastMatch.season,
    });
  } catch (error) {
    console.error("Error fetching players stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getPlayerStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
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
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        name: true,
        status: true,
        userId: true,
        imageUrl: true,
      },
    });

    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    // Fetch matches where the player was involved, filtered by season if provided
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { player1Id: playerId },
          { player2Id: playerId },
          { player3Id: playerId },
          { player4Id: playerId },
        ],
        ...(season ? { season: season } : {}), // Apply season filter if provided
        winnerTeam: {
          not: 0,
        },
      },
      select: {
        id: true,
        winnerTeam: true,
        player1Id: true,
        player2Id: true,
        player3Id: true,
        player4Id: true,
      },
    });

    let wins = 0;
    let losses = 0;
    let eloHistory: number[] = [];

    matches.forEach((match, index) => {
      const isTeam1 =
        match.player1Id === playerId || match.player2Id === playerId;
      const isTeam2 =
        match.player3Id === playerId || match.player4Id === playerId;

      if (
        (isTeam1 && match.winnerTeam === 1) ||
        (isTeam2 && match.winnerTeam === 2)
      ) {
        wins++;
        eloHistory.push((eloHistory[index - 1] || 0) + 1); // Win = +1
      } else if (
        (isTeam1 && match.winnerTeam === 2) ||
        (isTeam2 && match.winnerTeam === 1)
      ) {
        losses++;
        eloHistory.push((eloHistory[index - 1] || 0) - 1); // Loss = -1
      } else {
        eloHistory.push(eloHistory[index - 1] || 0); // No change
      }
    });

    res.status(200).json({
      player: {
        id: player.id,
        name: player.name,
        status: player.status,
        user_id: player.userId,
        imageUrl: player.imageUrl,
      },
      totalMatches: matches.length,
      wins,
      losses,
      eloHistory,
    });
  } catch (error) {
    console.error("Error fetching player stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export {
  getAllPlayers,
  getPlayerById,
  createPlayer,
  getActivePlayers,
  updateStatus,
  getPossibleTeammates,
  getPlayerStats,
  getRankings,
};
