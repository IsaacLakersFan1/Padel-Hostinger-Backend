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
exports.downloadDB = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const DB_PATH = path_1.default.resolve(__dirname, "../../prisma/dev.db");
// const downloadDB = async (req: Request, res: Response): Promise<void> => {
//     if (!fs.existsSync(DB_PATH)) {
//         res.status(404).send("Database file not found.");
//         return;
//     }
//     res.setHeader("Access-Control-Allow-Origin", "*");
//     res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
//     res.setHeader("Content-Disposition", 'attachment; filename="database.db"');
//     res.setHeader("Content-Type", "application/x-sqlite3");
//     res.setHeader("Content-Length", fs.statSync(DB_PATH).size.toString());
//     res.setHeader("Content-Security-Policy", "frame-ancestors 'self' http://gkks0gc4c4g4gc4soo0osg08.193.46.198.43.sslip.io");
//     const fileStream = fs.createReadStream(DB_PATH);
//     fileStream.pipe(res);
// };
const downloadDB = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!fs_1.default.existsSync(DB_PATH)) {
        res.status(404).send("Database file not found.");
        return;
    }
    // Use Express' built-in file download helper
    res.download(DB_PATH, "database.db", (err) => {
        if (err) {
            console.error("Download error:", err);
            res.status(500).send("Error downloading the file");
        }
    });
});
exports.downloadDB = downloadDB;
