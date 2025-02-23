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
  
  console.log({
    function: 'filterLastRunPlayersPairs',
    player1,
    player2,
    pair,
    lastRunPairs: Array.from(lastRunPlayersPairs),
    isPairAlreadyPlayed
  });
  
  return !isPairAlreadyPlayed;
};

const createValidTeams = (players: Player[], teams: Set<string>, gameModeId: number) => {
  console.group('Generating Valid Matches');

  // if (gameModeId !== 1) {
  //   // console.log("Game mode not supported.");
  //   // console.groupEnd();
  //   return [];
  // }

  let attempts = 0;
  let maxAttempts = 100; // To prevent infinite loops
  let validTeam: number[] = [];

  while (attempts < maxAttempts) {
    console.log(`Attempt #${attempts + 1}`);

    const shuffledPlayers = shufflePlayers(players);
    const teamIds: number[] = [];
    let isValid = true;
    let remainingPlayer: number | null = null;

    for (let i = 0; i < shuffledPlayers.length - 1; i += 2) {
      const player1 = shuffledPlayers[i];
      const player2 = shuffledPlayers[i + 1];

      const pairId = [player1.id, player2.id].sort().join('-');

      console.log({
        checking: 'pair',
        player1: player1.name,
        player2: player2.name,
        pairString: pairId,
        existsInTeams: teams.has(pairId)
      });

      if (teams.has(pairId)) {
        console.log('Invalid: Pair already exists in teams');
        isValid = false;
        break;
      }

      teamIds.push(player1.id, player2.id); // Push as integers, maintaining order
    }

    // If there's an odd player left, store their ID
    if (shuffledPlayers.length % 2 === 1) {
      remainingPlayer = shuffledPlayers[shuffledPlayers.length - 1].id;
    }

    if (isValid) {
      console.log({
        status: 'valid',
        generatedTeams: teamIds,
        remainingPlayer: remainingPlayer ?? 'none'
      });

      validTeam = remainingPlayer !== null ? [...teamIds, remainingPlayer] : teamIds;
      break; // Exit loop when a valid set of pairs is found
    }

    attempts++;
  }

  console.groupEnd();

  if (validTeam.length === 0) {
    console.warn('Could not generate valid teams after multiple attempts.');
  }

  return validTeam;
};


const shufflePlayers = (players: Player[]) => {

  let newOrder = [...players];
  let maxAttempts = 10;
  let lastOrder = players.map((p) => p.id).join(",");
  let attempt = 1;

  while (maxAttempts > 0) {
    // console.log({
    //   attempt,
    //   maxAttemptsLeft: maxAttempts,
    //   lastOrder
    // });

    for (let i = newOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newOrder[i], newOrder[j]] = [newOrder[j], newOrder[i]];
    }

    const newOrderStr = newOrder.map((p) => p.id).join(",");

    // console.log({
    //   newOrderStr,
    //   isUnique: newOrderStr !== lastOrder
    // });

    if (newOrderStr !== lastOrder) {
      // console.log({
      //   function: 'shufflePlayers',
      //   status: 'success',
      //   finalOrder: newOrder.map(p => ({ id: p.id, name: p.name }))
      // });
      return newOrder;
    }

    maxAttempts--;
    attempt++;
  }

  // console.log({
  //   function: 'shufflePlayers',
  //   status: 'fallback',
  //   reason: 'Failed to generate unique shuffle',
  //   finalOrder: newOrder.map(p => ({ id: p.id, name: p.name }))
  // });
  
  return newOrder;
};

const getSeason = () => {
  return 2;
};

const createMatchesMode1 = async (req: AuthRequest, res: Response): Promise<void> => {
  console.group('createMatchesMode1');
  if (!req.user) {
    // console.log('Unauthorized request');
    res.status(401).json({ error: "Unauthorized" });
    console.groupEnd();
    return;
  }
  
  const { userId } = req.user;
  try {
    // Delete unfinished matches
    await prisma.match.deleteMany({
      where: { userId: parseInt(userId), winnerTeam: 0 }
    });
    // console.log({ action: 'deleted_unfinished_matches', userId });

    // Fetch active players
    const players = await prisma.player.findMany({
      where: { userId: parseInt(userId), status: "active" }
    });
    // console.log({
    //   action: 'fetched_active_players',
    //   count: players.length,
    //   players: players.map(p => ({ id: p.id, name: p.name }))
    // });

    if (players.length < 4) {
      // console.log({ error: 'insufficient_players', count: players.length });
      res.status(400).json({ error: "Not enough active players" });
      // console.groupEnd();
      return;
    }

    // Get last run info
    const lastRunMatch = await prisma.match.findMany({
      where: {
        userId: parseInt(userId),
        winnerTeam: { not: 0 }
      },
      orderBy: [{ run: "desc" }, { id: "desc" }],
      take: 1
    });
    // console.log({ action: 'last_run_match_found', match: lastRunMatch[0] });

    let lastRun = 0;
    const lastRunPlayersPairs = new Set<string>();

    if (lastRunMatch.length > 0) {
      lastRun = lastRunMatch[0].run;
      const matchesFromLastRun = await prisma.match.findMany({
        where: { userId: parseInt(userId), run: lastRun }
      });
      // console.log({
      //   action: 'fetched_last_run_matches',
      //   run: lastRun,
      //   matchCount: matchesFromLastRun.length
      // });

      matchesFromLastRun.forEach((match) => {
        const pair1 = [match.player1Id, match.player2Id].sort().join("-");
        const pair2 = [match.player3Id, match.player4Id].sort().join("-");
        lastRunPlayersPairs.add(pair1);
        lastRunPlayersPairs.add(pair2);
      });
      // console.log({
      //   action: 'processed_last_run_pairs',
      //   pairs: Array.from(lastRunPlayersPairs)
      // });
    }

    // let shuffledPlayers = shufflePlayers(players);
    let validTeam = createValidTeams(players, lastRunPlayersPairs, 1);
    const newRun = lastRun + 1 || 1;
    const season = getSeason();

    while (validTeam.length > 3) {
      await prisma.match.create({
        data: {
          userId: parseInt(userId),
          player1Id: validTeam[0],
          player2Id: validTeam[1],
          player3Id: validTeam[2],
          player4Id: validTeam[3],
          run: newRun,
          season,
          winnerTeam: 0,
          gameModeId: 1,
          createdAt: new Date(),
          date: new Date(),
        },
      });
      validTeam = validTeam.slice(4);
    }

    if (validTeam.length === 3) {
      await prisma.match.create({
        data: {
          userId: parseInt(userId),
          player1Id: validTeam[0],
          player2Id: validTeam[1],
          player3Id: validTeam[2],
          player4Id: null,
          run: newRun,
          season,
          winnerTeam: 0,
          gameModeId: 1,
          createdAt: new Date(),
          date: new Date(),
        },
      });
      validTeam = validTeam.slice(3);
    }

    if (validTeam.length === 2) {
      await prisma.match.create({
        data: {
          userId: parseInt(userId),
          player1Id: validTeam[0],
          player2Id: null,
          player3Id: validTeam[1],
          player4Id: null,
          run: newRun,
          season,
          winnerTeam: 0,
          gameModeId: 1,
          createdAt: new Date(),
          date: new Date(),
        },
      });
      validTeam = validTeam.slice(2);
    }

    if (validTeam.length === 1) {
      await prisma.match.create({
        data: {
          userId: parseInt(userId),
          player1Id: validTeam[0],
          player2Id: null,
          player3Id: null,
          player4Id: null,
          run: newRun,
          season,
          winnerTeam: 0,
          gameModeId: 1,
          createdAt: new Date(),
          date: new Date(),
        },
      });
      validTeam = validTeam.slice(1);
    }

          //     const match = await prisma.match.create({
      //       data: {
      //         userId: parseInt(userId),
      //         player1Id: shuffledPlayers[0].id,
      //         player2Id: shuffledPlayers[1].id,
      //         player3Id: shuffledPlayers[2].id,
      //         player4Id: shuffledPlayers[3].id,
      //         run: newRun,
      //         season,
      //         winnerTeam: 0,
      //         gameModeId: 1,
      //         createdAt: new Date(),
      //         date: new Date(),
      //       },
      //     });
    // console.log({
    //   action: 'initial_setup',
    //   newRun,
    //   season,
    //   shuffledPlayers: shuffledPlayers.map(p => ({ id: p.id, name: p.name }))
    // });

    // Create 4-player matches
    // console.group('Creating 4-player matches');
    // while (shuffledPlayers.length > 3) {
    //   console.log({
    //     action: 'processing_4_players',
    //     remainingPlayers: shuffledPlayers.length,
    //     players: shuffledPlayers.slice(0, 4).map(p => ({ id: p.id, name: p.name }))
    //   });

      // let maxRetries = 10;
      // let validMatchFound = false;

      // while (maxRetries > 0 && !validMatchFound) {
      //   const valid = filterLastRunPlayersPairs(shuffledPlayers[0].id, shuffledPlayers[1].id, lastRunPlayersPairs) &&
      //                filterLastRunPlayersPairs(shuffledPlayers[2].id, shuffledPlayers[3].id, lastRunPlayersPairs);
        
      //   console.log({
      //     action: 'checking_pairs',
      //     attempt: 11 - maxRetries,
      //     valid,
      //     pairs: [
      //       [shuffledPlayers[0].id, shuffledPlayers[1].id],
      //       [shuffledPlayers[2].id, shuffledPlayers[3].id]
      //     ]
      //   });

      //   if (valid) {
      //     const match = await prisma.match.create({
      //       data: {
      //         userId: parseInt(userId),
      //         player1Id: shuffledPlayers[0].id,
      //         player2Id: shuffledPlayers[1].id,
      //         player3Id: shuffledPlayers[2].id,
      //         player4Id: shuffledPlayers[3].id,
      //         run: newRun,
      //         season,
      //         winnerTeam: 0,
      //         gameModeId: 1,
      //         createdAt: new Date(),
      //         date: new Date(),
      //       },
      //     });
      //     console.log({
      //       action: 'created_4p_match',
      //       matchId: match.id,
      //       players: shuffledPlayers.slice(0, 4).map(p => ({ id: p.id, name: p.name }))
      //     });
      //     shuffledPlayers = shuffledPlayers.slice(4);
      //     validMatchFound = true;
      //   } else {
      //     shuffledPlayers = shufflePlayers(shuffledPlayers);
      //     maxRetries--;
      //   }
      // }

      // if (!validMatchFound) {
      //   console.log({
      //     action: 'fallback_4p_match',
      //     reason: 'max_retries_reached',
      //     players: shuffledPlayers.slice(0, 4).map(p => ({ id: p.id, name: p.name }))
      //   });
      //   // ... rest of the fallback creation code ...
      // }
    // console.groupEnd();

    // Similar debug groups for 3-player and 2-player matches...
    
    // console.log({
    //   action: 'matches_creation_completed',
    //   newRun,
    //   season,
    //   remainingPlayers: shuffledPlayers.length
    // });
    
    res.status(200).json({ message: "Matches created" });
  } catch (error) {
    console.error(error);
    // console.error({
    //   action: 'error',
    //   error: error instanceof Error ? error.message : 'Unknown error',
    //   stack: error instanceof Error ? error.stack : undefined
    // });
    res.status(500).json({ message: "Internal server error" });
  }
  console.groupEnd();
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
    // console.log("Matches with no winner deleted");

    const players = await prisma.player.findMany({
      where: {
        userId: parseInt(userId),
        status: "active",
      },
    });
    // console.log(
    //   "Active players fetched",
    //   players.map((player) => player.name)
    // );

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

    // console.log("Last run players pairs", lastRunPlayersPairs);

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


    // let shuffledPlayers = shufflePlayers(players);
    // console.log("Shuffled players", shuffledPlayers);

    //Aquí tendría que exluir a los ganadores si fuera el otro modo
    let validTeam = createValidTeams(players, lastRunPlayersPairs, 2);
    const newRun = lastRun + 1 || 1;
    const season = getSeason();

    if (isLastWinnerPlayer1Active && isLastWinnerPlayer2Active) {
      console.log("Case 1: Both last winner players are active");
      // console.log({
      //   action: 'filtering_winners',
      //   before: {
      //     count: validTeam.length,
      //     players: validTeam
      //   },
      //   winners: {
      //     player1: lastWinnerPlayer1,
      //     player2: lastWinnerPlayer2
      //   }
      // });

      validTeam = validTeam.filter(
        (player) => player !== lastWinnerPlayer1 && player !== lastWinnerPlayer2
      );

      // console.log({
      //   action: 'after_filtering',
      //   count: validTeam.length,
      //   players: validTeam,
      //   removedPlayers: validTeam.filter(p => 
      //     p === lastWinnerPlayer1 || p === lastWinnerPlayer2
      //   )
      // });

      await prisma.match.create({
        data: {
          userId: parseInt(userId),
          player1Id: lastWinnerPlayer1,
          player2Id: validTeam[0],
          player3Id: lastWinnerPlayer2,
          player4Id: validTeam[1],
          run: newRun,
          season,
          winnerTeam: 0,
          gameModeId: 2,
          createdAt: new Date(),
          date: new Date(),
        },
      }); 
      validTeam = validTeam.slice(2);
    }

        if (
      (isLastWinnerPlayer1Active && !isLastWinnerPlayer2Active) ||
      (!isLastWinnerPlayer1Active && isLastWinnerPlayer2Active)
    ) {
      console.log("Case 2: Only one of the last winner players is active");
      const lastActiveWinnerPlayer = isLastWinnerPlayer1Active
        ? lastWinnerPlayer1
        : lastWinnerPlayer2;
      validTeam = validTeam.filter(
        (player) => player !== lastActiveWinnerPlayer
      );

      await prisma.match.create({
        data: {
          userId: parseInt(userId),
          player1Id: lastWinnerPlayer1,
          player2Id: validTeam[0],
          player3Id: validTeam[1],
          player4Id: validTeam[2],
          run: newRun,
          season,
          winnerTeam: 0,
          gameModeId: 2,
          createdAt: new Date(),
          date: new Date(),
        },
      }); 
      validTeam = validTeam.slice(3);
    }

    if (
      (!isLastWinnerPlayer1Active && !isLastWinnerPlayer2Active) 
    ) {
      console.log("Case 3: Both last winner players are inactive");

      await prisma.match.create({
        data: {
          userId: parseInt(userId),
          player1Id: validTeam[0],
          player2Id: validTeam[1],
          player3Id: validTeam[2],
          player4Id: validTeam[3],
          run: newRun,
          season,
          winnerTeam: 0,
          gameModeId: 2,
          createdAt: new Date(),
          date: new Date(),
        },
      }); 
      validTeam = validTeam.slice(4);
    }


    while (validTeam.length > 1) {
      console.log("Remaining players", validTeam);
      await prisma.match.create({
        data: {
          userId: parseInt(userId),
          player1Id: validTeam[0],
          player2Id: validTeam[1],
          player3Id: null,
          player4Id: null,
          run: newRun,
          season,
          winnerTeam: 0,
          gameModeId: 2,
          createdAt: new Date(),
          date: new Date(),
        },
      });
      validTeam = validTeam.slice(2);
    } 

    if (validTeam.length === 1) {
      await prisma.match.create({
        data: {
          userId: parseInt(userId),
          player1Id: validTeam[0],
          player2Id: null,
          player3Id: null,
          player4Id: null,
          run: newRun,
          season,
          winnerTeam: 0,
          gameModeId: 2,
          createdAt: new Date(),
          date: new Date(),
        },
      });
    }
    

      // console.log(
      //   "Remaining players excluding the last winner players",
      //   validTeam
      // );

      // let maxRetries = 10;
      // let validMatchFound = false;

      // while (maxRetries > 0 && !validMatchFound) {
      //   if (
      //     lastWinnerPlayer1 &&
      //     lastWinnerPlayer2 &&
      //     filterLastRunPlayersPairs(
      //       lastWinnerPlayer1,
      //       shuffledPlayers[0].id,
      //       lastRunPlayersPairs
      //     ) &&
      //     filterLastRunPlayersPairs(
      //       lastWinnerPlayer2,
      //       shuffledPlayers[1].id,
      //       lastRunPlayersPairs
      //     )
      //   ) {
      //     await prisma.match.create({
      //       data: {
      //         userId: parseInt(userId),
      //         player1Id: lastWinnerPlayer1,
      //         player2Id: shuffledPlayers[0].id,
      //         player3Id: lastWinnerPlayer2,
      //         player4Id: shuffledPlayers[1].id,
      //         run: newRun,
      //         season: season,
      //         winnerTeam: 0,
      //         gameModeId: 2,
      //         createdAt: new Date(),
      //         date: new Date(),
      //       },
      //     });
      //     validMatchFound = true;
      //     shuffledPlayers = shuffledPlayers.slice(2);
      //   } else {
      //     console.log("Conflict in pairs, reshuffling players pairs...");
      //     shuffledPlayers = shufflePlayers(shuffledPlayers);
      //     maxRetries--;
      //   }
      // }

    //   if (!validMatchFound) {
    //     console.log("Max retries reached, creating match anyway");
    //     await prisma.match.create({
    //       data: {
    //         userId: parseInt(userId),
    //         player1Id: lastWinnerPlayer1,
    //         player2Id: shuffledPlayers[0].id,
    //         player3Id: lastWinnerPlayer2,
    //         player4Id: shuffledPlayers[1].id,
    //         run: newRun,
    //         season: season,
    //         winnerTeam: 0,
    //         gameModeId: 2,
    //         createdAt: new Date(),
    //         date: new Date(),
    //       },
    //     });
    //     shuffledPlayers = shuffledPlayers.slice(2);
    //   }
    // }

    // if (
    //   (isLastWinnerPlayer1Active && !isLastWinnerPlayer2Active) ||
    //   (!isLastWinnerPlayer1Active && isLastWinnerPlayer2Active)
    // ) {
    //   console.log("Case 2: Only one of the last winner players is active");
    //   const lastActiveWinnerPlayer = isLastWinnerPlayer1Active
    //     ? lastWinnerPlayer1
    //     : lastWinnerPlayer2;
    //   shuffledPlayers = shuffledPlayers.filter(
    //     (player) => player.id !== lastActiveWinnerPlayer
    //   );
    //   console.log(
    //     "Remaining players excluding the last winner player",
    //     shuffledPlayers
    //   );

    //   let maxRetries = 10;
    //   let validMatchFound = false;

    //   while (maxRetries > 0 && !validMatchFound) {
    //     if (
    //       lastActiveWinnerPlayer &&
    //       filterLastRunPlayersPairs(
    //         lastActiveWinnerPlayer,
    //         shuffledPlayers[0].id,
    //         lastRunPlayersPairs
    //       ) &&
    //       filterLastRunPlayersPairs(
    //         shuffledPlayers[1].id,
    //         shuffledPlayers[2].id,
    //         lastRunPlayersPairs
    //       )
    //     ) {
    //       await prisma.match.create({
    //         data: {
    //           userId: parseInt(userId),
    //           player1Id: lastWinnerPlayer1,
    //           player2Id: shuffledPlayers[0].id,
    //           player3Id: shuffledPlayers[1].id,
    //           player4Id: shuffledPlayers[2].id,
    //           run: newRun,
    //           season: season,
    //           winnerTeam: 0,
    //           gameModeId: 2,
    //           createdAt: new Date(),
    //           date: new Date(),
    //         },
    //       });
    //       validMatchFound = true;
    //       shuffledPlayers = shuffledPlayers.slice(3);
    //     } else {
    //       console.log("Conflict in pairs, reshuffling players pairs...");
    //       shuffledPlayers = shufflePlayers(shuffledPlayers);
    //       maxRetries--;
    //     }
    //   }

    //   if (!validMatchFound) {
    //     console.log("Max retries reached, creating match anyway");
    //     await prisma.match.create({
    //       data: {
    //         userId: parseInt(userId),
    //         player1Id: lastWinnerPlayer1,
    //         player2Id: shuffledPlayers[0].id,
    //         player3Id: shuffledPlayers[1].id,
    //         player4Id: shuffledPlayers[2].id,
    //         run: newRun,
    //         season: season,
    //         winnerTeam: 0,
    //         gameModeId: 2,
    //         createdAt: new Date(),
    //         date: new Date(),
    //       },
    //     });
    //     shuffledPlayers = shuffledPlayers.slice(3);
    //   }
    // }

    // if (!isLastWinnerPlayer1Active && !isLastWinnerPlayer2Active) {
    //   console.log("Case 3: Both last winner players are inactive");
    //   while (shuffledPlayers.length > 3) {
    //     let maxRetries = 10;
    //     let validMatchFound = false;

    //     while (maxRetries > 0 && !validMatchFound) {
    //       if (filterLastRunPlayersPairs(
    //         shuffledPlayers[0].id,
    //         shuffledPlayers[1].id,
    //         lastRunPlayersPairs
    //       ) &&
    //       filterLastRunPlayersPairs(
    //         shuffledPlayers[2].id,
    //         shuffledPlayers[3].id,
    //         lastRunPlayersPairs
    //       )) {
    //         await prisma.match.create({
    //           data: {
    //             userId: parseInt(userId),
    //             player1Id: shuffledPlayers[0].id,
    //             player2Id: shuffledPlayers[1].id,
    //             player3Id: shuffledPlayers[2].id,
    //             player4Id: shuffledPlayers[3].id,
    //             run: newRun,
    //             season: season,
    //             winnerTeam: 0,
    //             gameModeId: 2,
    //             createdAt: new Date(),
    //             date: new Date(),
    //           },
    //         });
    //         shuffledPlayers = shuffledPlayers.slice(4);
    //         validMatchFound = true;
    //       } else {
    //         shuffledPlayers = shufflePlayers(shuffledPlayers);
    //         maxRetries--;
    //       }
    //     }

    //     if (!validMatchFound) {
    //       console.log("Max retries reached, creating match anyway");
    //       await prisma.match.create({
    //         data: {
    //           userId: parseInt(userId),
    //           player1Id: shuffledPlayers[0].id,
    //           player2Id: shuffledPlayers[1].id,
    //           player3Id: shuffledPlayers[2].id,
    //           player4Id: shuffledPlayers[3].id,
    //           run: newRun,
    //           season: season,
    //           winnerTeam: 0,
    //           gameModeId: 2,
    //           createdAt: new Date(),
    //           date: new Date(),
    //         },
    //       });
    //       shuffledPlayers = shuffledPlayers.slice(4);
    //     }
    //   }
    // }

    // while (shuffledPlayers.length > 1) {
    //   const player1 = shuffledPlayers[0];
    //   const player2 = shuffledPlayers[1];
      
    //   let maxRetries = 10;
    //   let validMatchFound = false;

    //   while (maxRetries > 0 && !validMatchFound) {
    //     if (filterLastRunPlayersPairs(player1.id, player2.id, lastRunPlayersPairs)) {
    //       await prisma.match.create({
    //         data: {
    //           userId: parseInt(userId),
    //           player1Id: shuffledPlayers[0].id,
    //           player2Id: shuffledPlayers[1].id,
    //           player3Id: null,
    //           player4Id: null,
    //           run: newRun,
    //           season: season,
    //           winnerTeam: 0,
    //           gameModeId: 2,
    //           createdAt: new Date(),
    //           date: new Date(),
    //         },
    //       });
    //       shuffledPlayers = shuffledPlayers.slice(2);
    //       validMatchFound = true;
    //     } else {
    //       console.log("Conflict in pairs, reshuffling players pairs");
    //       shuffledPlayers = shufflePlayers(shuffledPlayers);
    //       maxRetries--;
    //     }
    //   }

    //   if (!validMatchFound) {
    //     console.log("Max retries reached, creating match anyway");
    //     await prisma.match.create({
    //       data: {
    //         userId: parseInt(userId),
    //         player1Id: shuffledPlayers[0].id,
    //         player2Id: shuffledPlayers[1].id,
    //         player3Id: null,
    //         player4Id: null,
    //         run: newRun,
    //         season: season,
    //         winnerTeam: 0,
    //         gameModeId: 2,
    //         createdAt: new Date(),
    //         date: new Date(),
    //       },
    //     });
    //     shuffledPlayers = shuffledPlayers.slice(2);
    //   }
    // }

    // while (shuffledPlayers.length === 1) {
    //   await prisma.match.create({
    //     data: {
    //       userId: parseInt(userId),
    //       player1Id: shuffledPlayers[0].id,
    //       player2Id: null,
    //       player3Id: null,
    //       player4Id: null,
    //       run: newRun,
    //       season: season,
    //       winnerTeam: 0,
    //       gameModeId: 2,
    //       createdAt: new Date(),
    //       date: new Date(),
    //     },
    //   });
    //   shuffledPlayers = shuffledPlayers.slice(1);
    // }

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
    // First fetch the match to validate players
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { 
        userId: true, 
        run: true, 
        gameModeId: true, 
        player1Id: true, 
        player2Id: true, 
        player3Id: true, 
        player4Id: true 
      },
    });

    if (!match) {
      res.status(404).json({ error: "Cannot set winner: match requires 4 players" });
      return;
    }

    // Validate all players are present
    if (!match.player1Id || !match.player2Id || !match.player3Id || !match.player4Id) {
      res.status(400).json({ error: "Cannot set winner: match requires 4 players" });
      return;
    }

    // Update match with winner
    await prisma.match.update({
      where: { id: matchId },
      data: { winnerTeam },
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

const getMatchById = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { matchId } = req.body;
  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        player1: true,
        player2: true,
        player3: true,
        player4: true,
      }
    });

    if (!match) {
      res.status(404).json({ error: "Match not found" });
      return;
    }

    res.status(200).json({ message: "Match fetched successfully.", match });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
  
};

const updateMatch = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { matchId, player1Id, player2Id, player3Id, player4Id,winnerTeam, run, season, gameModeId, date } = req.body;
    await prisma.match.update({
      where: { id: matchId },
      data: { player1Id, player2Id, player3Id, player4Id,winnerTeam, run, season, gameModeId, date }
    });
    res.status(200).json({ message: "Match updated successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const createMatch = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { userId } = req.user;
  try {
    const { player1Id, player2Id, player3Id, player4Id,winnerTeam, run, season, gameModeId, date } = req.body;
    await prisma.match.create({
      data: { player1Id, player2Id, player3Id, player4Id,winnerTeam, run, season, gameModeId, date, userId: parseInt(userId) }
    });
    res.status(200).json({ message: "Match created successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getMatchesByRun = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { userId } = req.user;
  const { run } = req.body;
  
  try {
    if (run) {
      const matches = await prisma.match.findMany({
        where: { run, userId: parseInt(userId) }
      });
      res.status(200).json({ message: "Matches fetched successfully.", matches });
      return;
    }

    // Get last run's matches if no run specified
    const lastRunMatch = await prisma.match.findFirst({
      where: { userId: parseInt(userId), winnerTeam: { not: 0 } },
      orderBy: { run: 'desc' }
    });

    if (!lastRunMatch) {
      res.status(404).json({ message: "No matches found" });
      return;
    }

    const matches = await prisma.match.findMany({
      where: { 
        run: lastRunMatch.run,
        userId: parseInt(userId)
      }
    });
    
    res.status(200).json({ message: "Matches fetched successfully.", matches });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// const generateValidMatches = async (players: any[], userId: number, lastRunPlayersPairs: Set<string>) => {
//     let validMatches = [];
//     let maxAttempts = 1000; // Prevent infinite loops
//     let attempt = 0;

//     while (attempt < maxAttempts) {
//         let shuffledPlayers = shufflePlayers([...players]); // Shuffle all players
//         validMatches = [];

//         let i = 0;
//         while (i + 3 < shuffledPlayers.length) { // Create full 4-player matches
//             const team1 = [shuffledPlayers[i].id, shuffledPlayers[i + 1].id].sort().join("-");
//             const team2 = [shuffledPlayers[i + 2].id, shuffledPlayers[i + 3].id].sort().join("-");

//             if (lastRunPlayersPairs.has(team1) || lastRunPlayersPairs.has(team2)) {
//                 break; // Invalid match, reshuffle needed
//             }

//             validMatches.push({
//                 userId,
//                 player1Id: shuffledPlayers[i].id,
//                 player2Id: shuffledPlayers[i + 1].id,
//                 player3Id: shuffledPlayers[i + 2].id,
//                 player4Id: shuffledPlayers[i + 3].id,
//                 run: 0, // Set later
//                 season: 0, // Set later
//                 winnerTeam: 0,
//                 gameModeId: 1,
//                 createdAt: new Date(),
//                 date: new Date(),
//             });

//             i += 4; // Move to next set of 4 players
//         }

//         let remainingPlayers = shuffledPlayers.slice(i); // Get leftover players

//         // 🔥 Handle Edge Cases (3, 2, 1 players left)
//         if (remainingPlayers.length === 3) {
//             // Check if last two players were teammates
//             const team1 = [remainingPlayers[0].id, remainingPlayers[1].id].sort().join("-");
//             if (!lastRunPlayersPairs.has(team1)) {
//                 validMatches.push({
//                     userId,
//                     player1Id: remainingPlayers[0].id,
//                     player2Id: remainingPlayers[1].id,
//                     player3Id: remainingPlayers[2].id,
//                     player4Id: null, // No 4th player
//                     run: 0,
//                     season: 0,
//                     winnerTeam: 0,
//                     gameModeId: 1,
//                     createdAt: new Date(),
//                     date: new Date(),
//                 });
//             } else {
//                 break; // Invalid, reshuffle needed
//             }
//         } else if (remainingPlayers.length === 2) {
//             validMatches.push({
//                 userId,
//                 player1Id: remainingPlayers[0].id,
//                 player2Id: null,
//                 player3Id: remainingPlayers[1].id,
//                 player4Id: null,
//                 run: 0,
//                 season: 0,
//                 winnerTeam: 0,
//                 gameModeId: 1,
//                 createdAt: new Date(),
//                 date: new Date(),
//             });
//         } else if (remainingPlayers.length === 1) {
//             validMatches.push({
//                 userId,
//                 player1Id: remainingPlayers[0].id,
//                 player2Id: null,
//                 player3Id: null,
//                 player4Id: null,
//                 run: 0,
//                 season: 0,
//                 winnerTeam: 0,
//                 gameModeId: 1,
//                 createdAt: new Date(),
//                 date: new Date(),
//             });
//         }

//         // If all teams are valid, return them
//         if (validMatches.length * 4 >= players.length) {
//             return validMatches;
//         }

//         attempt++;
//     }

//     return []; // No valid match found
// };

// const createMatchesMode1 = async (req: AuthRequest, res: Response): Promise<void> => {
//   console.group('createMatchesMode1');
//   if (!req.user) {
//       console.log('Unauthorized request');
//       res.status(401).json({ error: "Unauthorized" });
//       console.groupEnd();
//       return;
//   }
  
//   const { userId } = req.user;
//   try {
//       await prisma.match.deleteMany({
//           where: { userId: parseInt(userId), winnerTeam: 0 }
//       });
//       console.log({ action: 'deleted_unfinished_matches', userId });

//       const players = await prisma.player.findMany({
//           where: { userId: parseInt(userId), status: "active" }
//       });

//       console.log({
//           action: 'fetched_active_players',
//           count: players.length,
//           players: players.map(p => ({ id: p.id, name: p.name }))
//       });

//       if (players.length < 4) {
//           res.status(400).json({ error: "Not enough active players" });
//           console.groupEnd();
//           return;
//       }

//       // Get last run info
//       const lastRunMatch = await prisma.match.findMany({
//           where: { userId: parseInt(userId), winnerTeam: { not: 0 } },
//           orderBy: [{ run: "desc" }, { id: "desc" }],
//           take: 1
//       });

//       let lastRun = 0;
//       const lastRunPlayersPairs = new Set<string>();

//       if (lastRunMatch.length > 0) {
//           lastRun = lastRunMatch[0].run;
//           const matchesFromLastRun = await prisma.match.findMany({
//               where: { userId: parseInt(userId), run: lastRun }
//           });

//           matchesFromLastRun.forEach((match) => {
//               const pair1 = [match.player1Id, match.player2Id].sort().join("-");
//               const pair2 = [match.player3Id, match.player4Id].sort().join("-");
//               lastRunPlayersPairs.add(pair1);
//               lastRunPlayersPairs.add(pair2);
//           });
//       }

//       const newRun = lastRun + 1 || 1;
//       const season = getSeason();
//       console.log({ action: 'initial_setup', newRun, season });

//       // Generate valid matches
//       const validMatches = await generateValidMatches(players, parseInt(userId), lastRunPlayersPairs);

//       if (validMatches.length === 0) {
//           res.status(500).json({ error: "Unable to generate valid matches" });
//           console.groupEnd();
//           return;
//       }

//       // Assign the correct run & season to matches
//       for (let match of validMatches) {
//           match.run = newRun;
//           match.season = season;
//       }

//       // Create all matches in one transaction
//       await prisma.match.createMany({ data: validMatches });

//       console.log({ action: 'matches_creation_completed', newRun, season, matchesCreated: validMatches.length });

//       res.status(200).json({ message: "Matches created", matchesCreated: validMatches.length });
//   } catch (error) {
//       console.error({
//           action: 'error',
//           error: error instanceof Error ? error.message : 'Unknown error',
//           stack: error instanceof Error ? error.stack : undefined
//       });
//       res.status(500).json({ message: "Internal server error" });
//   }
//   console.groupEnd();
// };


// const generateValidMatchesMode2 = async (
//   players: any[],
//   userId: number,
//   lastRunPlayersPairs: Set<string>,
//   lastWinnerPlayer1: number | null,
//   lastWinnerPlayer2: number | null
// ) => {
//   let validMatches = [];
//   let maxAttempts = 100; // Prevent infinite loop
//   let attempt = 0;

//   while (attempt < maxAttempts) {
//     let shuffledPlayers = shufflePlayers([...players]); // Shuffle players
//     validMatches = [];
//     let remainingPlayers = [...shuffledPlayers];

//     // 🔥 Step 1: First match creation based on last winners
//     if (lastWinnerPlayer1 && lastWinnerPlayer2) {
//       // Scenario 1: Both winners are active
//       const player2 = remainingPlayers.find((p) => p.id !== lastWinnerPlayer1 && p.id !== lastWinnerPlayer2);
//       const player4 = remainingPlayers.find((p) => p.id !== lastWinnerPlayer1 && p.id !== lastWinnerPlayer2 && p.id !== player2?.id);

//       if (player2 && player4) {
//         // Ensure valid teammates
//         const team1 = [lastWinnerPlayer1, player2.id].sort().join("-");
//         const team2 = [lastWinnerPlayer2, player4.id].sort().join("-");
//         if (lastRunPlayersPairs.has(team1) || lastRunPlayersPairs.has(team2)) {
//           attempt++; // Invalid pair, reshuffle
//           continue;
//         }

//         validMatches.push({
//           userId,
//           player1Id: lastWinnerPlayer1,
//           player2Id: player2.id,
//           player3Id: lastWinnerPlayer2,
//           player4Id: player4.id,
//           run: 0,
//           season: 0,
//           winnerTeam: 0,
//           gameModeId: 2,
//           createdAt: new Date(),
//           date: new Date(),
//         });

//         remainingPlayers = remainingPlayers.filter(
//           (p) => p.id !== player2.id && p.id !== player4.id
//         );
//       } else {
//         attempt++;
//         continue;
//       }
//     } else if (lastWinnerPlayer1 || lastWinnerPlayer2) {
//       // Scenario 2: Only one winner is active
//       const activeWinner = lastWinnerPlayer1 || lastWinnerPlayer2;
//       const player2 = remainingPlayers.find((p) => p.id !== activeWinner);
//       const player3 = remainingPlayers.find((p) => p.id !== activeWinner && p.id !== player2?.id);
//       const player4 = remainingPlayers.find((p) => p.id !== activeWinner && p.id !== player2?.id && p.id !== player3?.id);

//       if (player2 && player3 && player4) {
//         const team1 = [activeWinner, player2.id].sort().join("-");
//         const team2 = [player3.id, player4.id].sort().join("-");

//         if (lastRunPlayersPairs.has(team1) || lastRunPlayersPairs.has(team2)) {
//           attempt++;
//           continue;
//         }

//         validMatches.push({
//           userId,
//           player1Id: activeWinner,
//           player2Id: player2.id,
//           player3Id: player3.id,
//           player4Id: player4.id,
//           run: 0,
//           season: 0,
//           winnerTeam: 0,
//           gameModeId: 2,
//           createdAt: new Date(),
//           date: new Date(),
//         });

//         remainingPlayers = remainingPlayers.filter(
//           (p) => p.id !== player2.id && p.id !== player3.id && p.id !== player4.id
//         );
//       } else {
//         attempt++;
//         continue;
//       }
//     } else {
//       // Scenario 3: No last winners are active, shuffle all players
//       let i = 0;
//       while (i + 3 < remainingPlayers.length) {
//         const team1 = [remainingPlayers[i].id, remainingPlayers[i + 1].id].sort().join("-");
//         const team2 = [remainingPlayers[i + 2].id, remainingPlayers[i + 3].id].sort().join("-");

//         if (lastRunPlayersPairs.has(team1) || lastRunPlayersPairs.has(team2)) {
//           attempt++;
//           continue;
//         }

//         validMatches.push({
//           userId,
//           player1Id: remainingPlayers[i].id,
//           player2Id: remainingPlayers[i + 1].id,
//           player3Id: remainingPlayers[i + 2].id,
//           player4Id: remainingPlayers[i + 3].id,
//           run: 0,
//           season: 0,
//           winnerTeam: 0,
//           gameModeId: 2,
//           createdAt: new Date(),
//           date: new Date(),
//         });

//         i += 4;
//       }
//       remainingPlayers = remainingPlayers.slice(i);
//     }

//     // 🔥 Step 2: Create remaining matches with placeholders for winners
//     while (remainingPlayers.length > 1) {
//       validMatches.push({
//         userId,
//         player1Id: remainingPlayers[0].id,
//         player2Id: remainingPlayers[1].id,
//         player3Id: null,
//         player4Id: null,
//         run: 0,
//         season: 0,
//         winnerTeam: 0,
//         gameModeId: 2,
//         createdAt: new Date(),
//         date: new Date(),
//       });

//       remainingPlayers = remainingPlayers.slice(2);
//     }

//     if (remainingPlayers.length === 1) {
//       validMatches.push({
//         userId,
//         player1Id: remainingPlayers[0].id,
//         player2Id: null,
//         player3Id: null,
//         player4Id: null,
//         run: 0,
//         season: 0,
//         winnerTeam: 0,
//         gameModeId: 2,
//         createdAt: new Date(),
//         date: new Date(),
//       });
//     }

//     if (validMatches.length * 4 >= players.length) {
//       return validMatches;
//     }

//     attempt++;
//   }

//   return []; // No valid matches found
// };



export { createMatchesMode1, createMatchesMode2, getLastRunMatches, updateMatchTeamWinner, addTeammate, getMatchById, updateMatch, createMatch, getMatchesByRun };
