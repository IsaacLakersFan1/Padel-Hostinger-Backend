import { Request, Response } from "express";
import path from "path";
import fs from "fs";

const DB_PATH = path.resolve(__dirname, "../../prisma/dev.db");


const downloadDB = async (req: Request, res: Response): Promise<void> => {
    if (!fs.existsSync(DB_PATH)) {
        res.status(404).send("Database file not found.");
        return;
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.setHeader("Content-Disposition", 'attachment; filename="database.db"');
    res.setHeader("Content-Type", "application/x-sqlite3");
    res.setHeader("Content-Length", fs.statSync(DB_PATH).size.toString());

    const fileStream = fs.createReadStream(DB_PATH);
    fileStream.pipe(res);
};



export { downloadDB };
