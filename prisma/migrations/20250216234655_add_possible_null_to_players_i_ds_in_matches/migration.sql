-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "player1Id" INTEGER,
    "player2Id" INTEGER,
    "player3Id" INTEGER,
    "player4Id" INTEGER,
    "winnerTeam" INTEGER NOT NULL,
    "run" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "season" INTEGER NOT NULL,
    "gameModeId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Match_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_player3Id_fkey" FOREIGN KEY ("player3Id") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_player4Id_fkey" FOREIGN KEY ("player4Id") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Match_gameModeId_fkey" FOREIGN KEY ("gameModeId") REFERENCES "GameMode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Match" ("createdAt", "date", "gameModeId", "id", "player1Id", "player2Id", "player3Id", "player4Id", "run", "season", "updatedAt", "userId", "winnerTeam") SELECT "createdAt", "date", "gameModeId", "id", "player1Id", "player2Id", "player3Id", "player4Id", "run", "season", "updatedAt", "userId", "winnerTeam" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
