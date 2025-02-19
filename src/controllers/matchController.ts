import { Request, Response } from "express";
import prisma from "../utils/prismaClient";
import { AuthRequest } from "../middleware/interfaces/authRequestUser";
import { Player } from "./interfaces/player";

const filterLastRunPlayersPairs = (
  player1: number,
  player2: number,
  lastRunPlayersPairs: Set<string>
) => {
  const pair = [player1, player2].sort().join("-");
  const isPairAlreadyPlayed = lastRunPlayersPairs.has(pair);
  console.log(
    "Checking pair",
    pair,
    "Is pair already played",
    isPairAlreadyPlayed
  );
  return !isPairAlreadyPlayed;
};

const getSeason = () => {
  return 2;
};

const shufflePlayers = (players: Player[]) => {
  return players.sort(() => Math.random() - 0.5);
};

const createMatchesMode1 = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { userId } = req.user;
  try {
    await prisma.match.deleteMany({
      where: {
        userId: parseInt(userId),
        winnerTeam: 0,
      },
    });
    console.log("Matches with no winner deleted");

    const players = await prisma.player.findMany({
      where: {
        userId: parseInt(userId),
        status: "active",
      },
    });
    console.log(
      "Active players fetched",
      players.map((player) => player.name)
    );

    if (players.length < 4) {
      res.status(400).json({ error: "Not enough active players" });
      return;
    }

    const lastRunPlayersPairs = new Set<string>();

    const lastRunMatch = await prisma.match.findMany({
      where: {
        userId: parseInt(userId),
        winnerTeam: {
          not: 0,
        },
      },
      orderBy: [{ run: "desc" }, { id: "desc" }],
      take: 1,
    });

    let lastRun = 0;

    if (lastRunMatch.length > 0) {
      lastRun = lastRunMatch[0].run;
      const matchesFromLastRun = await prisma.match.findMany({
        where: {
          userId: parseInt(userId),
          run: lastRun,
        },
      });

      matchesFromLastRun.forEach((match) => {
        const pair1 = [match.player1Id, match.player2Id].sort().join("-");
        const pair2 = [match.player3Id, match.player4Id].sort().join("-");
        lastRunPlayersPairs.add(pair1);
        lastRunPlayersPairs.add(pair2);
      });
    }

    console.log("Last run players pairs", lastRunPlayersPairs);

    let shuffledPlayers = shufflePlayers(players);
    console.log("Shuffled players", shuffledPlayers);

    //Aquí tendría que exluir a los ganadores si fuera el otro modo

    const newRun = lastRun + 1 || 1;
    const season = getSeason();

    while (shuffledPlayers.length > 3) {
      const player1 = shuffledPlayers[0];
      const player2 = shuffledPlayers[1];
      const player3 = shuffledPlayers[2];
      const player4 = shuffledPlayers[3];
      
      let maxRetries = 10;
      let validMatchFound = false;

      while (maxRetries > 0 && !validMatchFound) {
        if (
          filterLastRunPlayersPairs(player1.id, player2.id, lastRunPlayersPairs) &&
          filterLastRunPlayersPairs(player3.id, player4.id, lastRunPlayersPairs)
        ) {
          await prisma.match.create({
            data: {
              userId: parseInt(userId),
              player1Id: shuffledPlayers[0].id,
              player2Id: shuffledPlayers[1].id,
              player3Id: shuffledPlayers[2].id,
              player4Id: shuffledPlayers[3].id,
              run: newRun,
              season: season,
              winnerTeam: 0,
              gameModeId: 1,
              createdAt: new Date(),
              date: new Date(),
            },
          });
          shuffledPlayers = shuffledPlayers.slice(4);
          validMatchFound = true;
        } else {
          console.log("Conflict in pairs, reshuffling players pairs");
          shuffledPlayers = shufflePlayers(shuffledPlayers);
          maxRetries--;
        }
      }

      if (!validMatchFound) {
        console.log("Max retries reached, creating match anyway");
        await prisma.match.create({
          data: {
            userId: parseInt(userId),
            player1Id: shuffledPlayers[0].id,
            player2Id: shuffledPlayers[1].id,
            player3Id: shuffledPlayers[2].id,
            player4Id: shuffledPlayers[3].id,
            run: newRun,
            season: season,
            winnerTeam: 0,
            gameModeId: 1,
            createdAt: new Date(),
            date: new Date(),
          },
        });
        shuffledPlayers = shuffledPlayers.slice(4);
      }
    }

    while (shuffledPlayers.length > 2) {
      const player1 = shuffledPlayers[0];
      const player2 = shuffledPlayers[1];
      
      let maxRetries = 10;
      let validMatchFound = false;

      while (maxRetries > 0 && !validMatchFound) {
        if (filterLastRunPlayersPairs(player1.id, player2.id, lastRunPlayersPairs)) {
          await prisma.match.create({
            data: {
              userId: parseInt(userId),
              player1Id: shuffledPlayers[0].id,
              player2Id: shuffledPlayers[1].id,
              player3Id: shuffledPlayers[2].id,
              player4Id: null,
              run: newRun,
              season: season,
              winnerTeam: 0,
              gameModeId: 1,
              createdAt: new Date(),
              date: new Date(),
            },
          });
          shuffledPlayers = shuffledPlayers.slice(3);
          validMatchFound = true;
        } else {
          console.log("Conflict in pairs, reshuffling players pairs");
          shuffledPlayers = shufflePlayers(shuffledPlayers);
          maxRetries--;
        }
      }

      if (!validMatchFound) {
        console.log("Max retries reached, creating match anyway");
        await prisma.match.create({
          data: {
            userId: parseInt(userId),
            player1Id: shuffledPlayers[0].id,
            player2Id: shuffledPlayers[1].id,
            player3Id: shuffledPlayers[2].id,
            player4Id: null,
            run: newRun,
            season: season,
            winnerTeam: 0,
            gameModeId: 1,
            createdAt: new Date(),
            date: new Date(),
          },
        });
        shuffledPlayers = shuffledPlayers.slice(3);
      }
    }

    while (shuffledPlayers.length > 1) {
      const player1 = shuffledPlayers[0];
      const player2 = shuffledPlayers[1];
      let maxRetries = 10;  
      let validMatchFound = false;

      while (maxRetries > 0 && !validMatchFound) {
        if (filterLastRunPlayersPairs(player1.id, player2.id, lastRunPlayersPairs)) {
          await prisma.match.create({
            data: {
              userId: parseInt(userId),
              player1Id: shuffledPlayers[0].id,
              player2Id: null,
              player3Id: shuffledPlayers[1].id,
              player4Id: null,
              run: newRun,
              season: season,
              winnerTeam: 0,
              gameModeId: 1,
              createdAt: new Date(),
              date: new Date(),
            },
          });
          shuffledPlayers = shuffledPlayers.slice(2);
          validMatchFound = true;
        } else {
          console.log("Conflict in pairs, reshuffling players pairs");
          shuffledPlayers = shufflePlayers(shuffledPlayers);
          maxRetries--;
        }
      }

      if (!validMatchFound) {
        console.log("Max retries reached, creating match anyway");
        await prisma.match.create({
          data: {
            userId: parseInt(userId),
            player1Id: shuffledPlayers[0].id,
            player2Id: null,
            player3Id: shuffledPlayers[1].id,
            player4Id: null,
            run: newRun,
            season: season,
            winnerTeam: 0,
            gameModeId: 1,
            createdAt: new Date(),
            date: new Date(),
          },
        });
        shuffledPlayers = shuffledPlayers.slice(2); // Remove used players
      }
    }

    while (shuffledPlayers.length === 1) {
      await prisma.match.create({
        data: {
          userId: parseInt(userId),
          player1Id: shuffledPlayers[0].id,
          player2Id: null,
          player3Id: null,
          player4Id: null,
          run: newRun,
          season: season,
          winnerTeam: 0,
          gameModeId: 1,
          createdAt: new Date(),
          date: new Date(),
        },
      });
      shuffledPlayers = shuffledPlayers.slice(1);
    }

    console.log("Matches created");
    res.status(200).json({ message: "Matches created" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createMatchesMode2 = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { userId } = req.user;
  try {
    await prisma.match.deleteMany({
      where: {
        userId: parseInt(userId),
        winnerTeam: 0,
      },
    });
    console.log("Matches with no winner deleted");

    const players = await prisma.player.findMany({
      where: {
        userId: parseInt(userId),
        status: "active",
      },
    });
    console.log(
      "Active players fetched",
      players.map((player) => player.name)
    );

    if (players.length < 4) {
      res.status(400).json({ error: "Not enough active players" });
      return;
    }

    const lastRunPlayersPairs = new Set<string>();

    const lastRunMatch = await prisma.match.findMany({
      where: {
        userId: parseInt(userId),
        winnerTeam: {
          not: 0,
        },
      },
      orderBy: [{ run: "desc" }, { id: "desc" }],
      take: 1,
    });

    let lastRun = 0;

    if (lastRunMatch.length > 0) {
      lastRun = lastRunMatch[0].run;
      const matchesFromLastRun = await prisma.match.findMany({
        where: {
          userId: parseInt(userId),
          run: lastRun,
        },
      });

      matchesFromLastRun.forEach((match) => {
        const pair1 = [match.player1Id, match.player2Id].sort().join("-");
        const pair2 = [match.player3Id, match.player4Id].sort().join("-");
        lastRunPlayersPairs.add(pair1);
        lastRunPlayersPairs.add(pair2);
      });
    }

    console.log("Last run players pairs", lastRunPlayersPairs);

    const lastWinnerTeam = lastRunMatch[0]?.winnerTeam;
    const lastWinnerPlayer1 =
      lastWinnerTeam === 1
        ? lastRunMatch[0]?.player1Id
        : lastRunMatch[0]?.player3Id;
    const lastWinnerPlayer2 =
      lastWinnerTeam === 1
        ? lastRunMatch[0]?.player2Id
        : lastRunMatch[0]?.player4Id;

    const isLastWinnerPlayer1Active =
      players.find((player) => player.id === lastWinnerPlayer1)?.status ===
      "active";
    const isLastWinnerPlayer2Active =
      players.find((player) => player.id === lastWinnerPlayer2)?.status ===
      "active";

    console.log("Last winner player 1", lastWinnerPlayer1);
    console.log("Is last winner player 1 active", isLastWinnerPlayer1Active);
    console.log("Last winner player 2", lastWinnerPlayer2);
    console.log("Is last winner player 2 active", isLastWinnerPlayer2Active);

    let shuffledPlayers = shufflePlayers(players);
    console.log("Shuffled players", shuffledPlayers);

    //Aquí tendría que exluir a los ganadores si fuera el otro modo

    const newRun = lastRun + 1 || 1;
    const season = getSeason();

    if (isLastWinnerPlayer1Active && isLastWinnerPlayer2Active) {
      console.log("Case 1: Both last winner players are active");
      shuffledPlayers = shuffledPlayers.filter(
        (player) =>
          player.id !== lastWinnerPlayer1 && player.id !== lastWinnerPlayer2
      );
      console.log(
        "Remaining players excluding the last winner players",
        shuffledPlayers
      );

      let maxRetries = 10;
      let validMatchFound = false;

      while (maxRetries > 0 && !validMatchFound) {
        if (
          lastWinnerPlayer1 &&
          lastWinnerPlayer2 &&
          filterLastRunPlayersPairs(
            lastWinnerPlayer1,
            shuffledPlayers[0].id,
            lastRunPlayersPairs
          ) &&
          filterLastRunPlayersPairs(
            lastWinnerPlayer2,
            shuffledPlayers[1].id,
            lastRunPlayersPairs
          )
        ) {
          await prisma.match.create({
            data: {
              userId: parseInt(userId),
              player1Id: lastWinnerPlayer1,
              player2Id: shuffledPlayers[0].id,
              player3Id: lastWinnerPlayer2,
              player4Id: shuffledPlayers[1].id,
              run: newRun,
              season: season,
              winnerTeam: 0,
              gameModeId: 2,
              createdAt: new Date(),
              date: new Date(),
            },
          });
          validMatchFound = true;
          shuffledPlayers = shuffledPlayers.slice(2);
        } else {
          console.log("Conflict in pairs, reshuffling players pairs...");
          shuffledPlayers = shufflePlayers(shuffledPlayers);
          maxRetries--;
        }
      }

      if (!validMatchFound) {
        console.log("Max retries reached, creating match anyway");
        await prisma.match.create({
          data: {
            userId: parseInt(userId),
            player1Id: lastWinnerPlayer1,
            player2Id: shuffledPlayers[0].id,
            player3Id: lastWinnerPlayer2,
            player4Id: shuffledPlayers[1].id,
            run: newRun,
            season: season,
            winnerTeam: 0,
            gameModeId: 2,
            createdAt: new Date(),
            date: new Date(),
          },
        });
        shuffledPlayers = shuffledPlayers.slice(2);
      }
    }

    if (
      (isLastWinnerPlayer1Active && !isLastWinnerPlayer2Active) ||
      (!isLastWinnerPlayer1Active && isLastWinnerPlayer2Active)
    ) {
      console.log("Case 2: Only one of the last winner players is active");
      const lastActiveWinnerPlayer = isLastWinnerPlayer1Active
        ? lastWinnerPlayer1
        : lastWinnerPlayer2;
      shuffledPlayers = shuffledPlayers.filter(
        (player) => player.id !== lastActiveWinnerPlayer
      );
      console.log(
        "Remaining players excluding the last winner player",
        shuffledPlayers
      );

      let maxRetries = 10;
      let validMatchFound = false;

      while (maxRetries > 0 && !validMatchFound) {
        if (
          lastActiveWinnerPlayer &&
          filterLastRunPlayersPairs(
            lastActiveWinnerPlayer,
            shuffledPlayers[0].id,
            lastRunPlayersPairs
          ) &&
          filterLastRunPlayersPairs(
            shuffledPlayers[1].id,
            shuffledPlayers[2].id,
            lastRunPlayersPairs
          )
        ) {
          await prisma.match.create({
            data: {
              userId: parseInt(userId),
              player1Id: lastWinnerPlayer1,
              player2Id: shuffledPlayers[0].id,
              player3Id: shuffledPlayers[1].id,
              player4Id: shuffledPlayers[2].id,
              run: newRun,
              season: season,
              winnerTeam: 0,
              gameModeId: 2,
              createdAt: new Date(),
              date: new Date(),
            },
          });
          validMatchFound = true;
          shuffledPlayers = shuffledPlayers.slice(3);
        } else {
          console.log("Conflict in pairs, reshuffling players pairs...");
          shuffledPlayers = shufflePlayers(shuffledPlayers);
          maxRetries--;
        }
      }

      if (!validMatchFound) {
        console.log("Max retries reached, creating match anyway");
        await prisma.match.create({
          data: {
            userId: parseInt(userId),
            player1Id: lastWinnerPlayer1,
            player2Id: shuffledPlayers[0].id,
            player3Id: shuffledPlayers[1].id,
            player4Id: shuffledPlayers[2].id,
            run: newRun,
            season: season,
            winnerTeam: 0,
            gameModeId: 2,
            createdAt: new Date(),
            date: new Date(),
          },
        });
        shuffledPlayers = shuffledPlayers.slice(3);
      }
    }

    if (!isLastWinnerPlayer1Active && !isLastWinnerPlayer2Active) {
      console.log("Case 3: Both last winner players are inactive");
      while (shuffledPlayers.length > 3) {
        let maxRetries = 10;
        let validMatchFound = false;

        while (maxRetries > 0 && !validMatchFound) {
          if (filterLastRunPlayersPairs(
            shuffledPlayers[0].id,
            shuffledPlayers[1].id,
            lastRunPlayersPairs
          ) &&
          filterLastRunPlayersPairs(
            shuffledPlayers[2].id,
            shuffledPlayers[3].id,
            lastRunPlayersPairs
          )) {
            await prisma.match.create({
              data: {
                userId: parseInt(userId),
                player1Id: shuffledPlayers[0].id,
                player2Id: shuffledPlayers[1].id,
                player3Id: shuffledPlayers[2].id,
                player4Id: shuffledPlayers[3].id,
                run: newRun,
                season: season,
                winnerTeam: 0,
                gameModeId: 2,
                createdAt: new Date(),
                date: new Date(),
              },
            });
            shuffledPlayers = shuffledPlayers.slice(4);
            validMatchFound = true;
          } else {
            shuffledPlayers = shufflePlayers(shuffledPlayers);
            maxRetries--;
          }
        }

        if (!validMatchFound) {
          console.log("Max retries reached, creating match anyway");
          await prisma.match.create({
            data: {
              userId: parseInt(userId),
              player1Id: shuffledPlayers[0].id,
              player2Id: shuffledPlayers[1].id,
              player3Id: shuffledPlayers[2].id,
              player4Id: shuffledPlayers[3].id,
              run: newRun,
              season: season,
              winnerTeam: 0,
              gameModeId: 2,
              createdAt: new Date(),
              date: new Date(),
            },
          });
          shuffledPlayers = shuffledPlayers.slice(4);
        }
      }
    }

    while (shuffledPlayers.length > 1) {
      const player1 = shuffledPlayers[0];
      const player2 = shuffledPlayers[1];
      
      let maxRetries = 10;
      let validMatchFound = false;

      while (maxRetries > 0 && !validMatchFound) {
        if (filterLastRunPlayersPairs(player1.id, player2.id, lastRunPlayersPairs)) {
          await prisma.match.create({
            data: {
              userId: parseInt(userId),
              player1Id: shuffledPlayers[0].id,
              player2Id: shuffledPlayers[1].id,
              player3Id: null,
              player4Id: null,
              run: newRun,
              season: season,
              winnerTeam: 0,
              gameModeId: 2,
              createdAt: new Date(),
              date: new Date(),
            },
          });
          shuffledPlayers = shuffledPlayers.slice(2);
          validMatchFound = true;
        } else {
          console.log("Conflict in pairs, reshuffling players pairs");
          shuffledPlayers = shufflePlayers(shuffledPlayers);
          maxRetries--;
        }
      }

      if (!validMatchFound) {
        console.log("Max retries reached, creating match anyway");
        await prisma.match.create({
          data: {
            userId: parseInt(userId),
            player1Id: shuffledPlayers[0].id,
            player2Id: shuffledPlayers[1].id,
            player3Id: null,
            player4Id: null,
            run: newRun,
            season: season,
            winnerTeam: 0,
            gameModeId: 2,
            createdAt: new Date(),
            date: new Date(),
          },
        });
        shuffledPlayers = shuffledPlayers.slice(2);
      }
    }

    while (shuffledPlayers.length === 1) {
      const player1 = shuffledPlayers[0] ? shuffledPlayers[0].id : null;
      const player2 = null;
      const player3 = null;
      const player4 = null;

      await prisma.match.create({
        data: {
          userId: parseInt(userId),
          player1Id: shuffledPlayers[0].id,
          player2Id: player2,
          player3Id: player3,
          player4Id: player4,
          run: newRun,
          season: season,
          winnerTeam: 0,
          gameModeId: 2,
          createdAt: new Date(),
          date: new Date(),
        },
      });
      shuffledPlayers = shuffledPlayers.slice(1);
    }

    console.log("Matches created");
    res.status(200).json({ message: "Matches created" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getLastRunMatches = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { userId } = req.user;
  try {
    const lastRunMatch = await prisma.match.findMany({
      where: {
        userId: parseInt(userId),
      },
      orderBy: [{ run: "desc" }, { id: "desc" }],
      take: 1,
    });

    if (lastRunMatch.length === 0) {
      res.status(400).json({ error: "No matches found" });
      return;
    }

    const lastRun = lastRunMatch[0].run;

    const matches = await prisma.match.findMany({
      where: {
        userId: parseInt(userId),
        run: lastRun,
      },
      include: {
        player1: true,
        player2: true,
        player3: true,
        player4: true
      }
    });

    res.status(200).json({ message: "Matches fetched", matches });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateMatchTeamWinner = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
  }

  const { matchId, winnerTeam } = req.body;

  if (!matchId || typeof winnerTeam !== "number") {
      res.status(400).json({ error: "Invalid request data. matchId and winnerTeam are required." });
      return;
  }

  try {
      // Update and fetch match in one step to avoid redundant queries
      const match = await prisma.match.update({
          where: { id: matchId },
          data: { winnerTeam },
          select: { userId: true, run: true, gameModeId: true, player1Id: true, player2Id: true, player3Id: true, player4Id: true },
      });

      // If gameModeId is 2, find and update next match
      if (match.gameModeId === 2) {
          const nextMatch = await prisma.match.findFirst({
              where: {
                  userId: match.userId,
                  run: match.run,
                  winnerTeam: 0, // Next match should not have a winner yet
              },
              orderBy: { id: "asc" },
          });

          if (nextMatch) {
              await prisma.match.update({
                  where: { id: nextMatch.id },
                  data: {
                      player3Id: winnerTeam === 1 ? match.player1Id : match.player3Id,
                      player4Id: winnerTeam === 1 ? match.player2Id : match.player4Id,
                  },
              });
          }
      }

      res.status(200).json({ message: "Match updated successfully." });
  } catch (error) {
      console.error("Error updating match winner:", error);
      res.status(500).json({ message: "Internal server error" });
  }
};


const addTeammate = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
  }

  try {
      const { matchId, playerId, slot } = req.body;

      // Mapping slot number to the correct field name
      const slotMapping: Record<number, string> = {
          2: "player2Id",
          3: "player3Id",
          4: "player4Id"
      };

      // Validate that the slot number is valid
      if (!(slot in slotMapping)) {
          res.status(400).json({ error: "Invalid slot number. Use 2, 3, or 4." });
          return;
      }

      const slotField = slotMapping[slot]; // Get the correct field name

      // Fetch match to check current player slots
      const match = await prisma.match.findUnique({
          where: { id: matchId },
          select: { player1Id: true, player2Id: true, player3Id: true, player4Id: true },
      });

      if (!match) {
          res.status(404).json({ error: "Match not found" });
          return;
      }

      // Ensure the selected slot is empty before updating
      if (match[slotField as keyof typeof match] !== null) {
          res.status(400).json({ error: `Slot ${slotField} is already occupied.` });
          return;
      }

      // Perform the update dynamically on the requested slot
      const updateData = { [slotField]: playerId }; // Dynamically set the field to update

      await prisma.match.update({
          where: { id: matchId },
          data: updateData,
      });

      res.status(200).json({ message: `Player added to ${slotField} successfully.` });

  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
  }
};


export { createMatchesMode1, createMatchesMode2, getLastRunMatches, updateMatchTeamWinner, addTeammate };
