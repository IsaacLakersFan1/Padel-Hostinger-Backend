import { Request, Response } from "express";
import  bcrypt  from "bcrypt";
import  jwt  from "jsonwebtoken";
import prisma from "../utils/prismaClient";

const JWT_SECRET = process.env.JWT_SECRET || "isaac_padel_2025";

const signup = async (req: Request, res: Response): Promise<void> => {
    const { email, password, username } = req.body;
    try {
        const usernameExists = await prisma.user.findUnique({
            where: { username }
        });

        const emailExists = await prisma.user.findUnique({
            where: { email }
        });
    
        if (usernameExists || emailExists) {
            res.status(400).json({ message: "Username or email already exists" });
            return;
        }
    
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: { email, password: hashedPassword, username }
        });
    
        res.status(201).json({ message: "User created successfully", user: newUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
}

const login = async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body;
    try {
        const user = await prisma.user.findUnique({
            where: { username }
        });

        if (!user) {
            res.status(400).json({ message: "Invalid username or password" });
            return;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            res.status(400).json({ message: "Invalid username or password" });
            return;
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
        res.status(200).json({ message: "Login successful", token, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
    }
}

export {
    signup,
    login
}

