import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
    departmentId?: number;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'MISSING_TOKEN', message: 'Authorization token required' } });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as unknown as {
      sub: number;
      role: string;
      departmentId?: number;
    };

    // Ensure user is still active
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, status: true, role: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      res.status(401).json({ error: { code: 'USER_INACTIVE', message: 'User account is inactive' } });
      return;
    }

    req.user = { id: payload.sub, role: payload.role, departmentId: payload.departmentId };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' } });
    } else {
      res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
    }
  }
}
