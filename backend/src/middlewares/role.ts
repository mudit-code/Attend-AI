import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

type RoleType = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT' | 'HOD';

export function requireRole(...roles: RoleType[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
      return;
    }

    if (!roles.includes(req.user.role as RoleType)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `This action requires one of: ${roles.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
}
