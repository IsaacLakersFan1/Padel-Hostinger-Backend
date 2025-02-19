import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './interfaces/authRequestUser';
import jwt from 'jsonwebtoken';



export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'isaac_padel_2025');
    req.user = decoded as { userId: string };
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid token' });
    return;
  }
};
