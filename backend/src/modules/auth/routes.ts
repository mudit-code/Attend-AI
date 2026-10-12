import { Router, Request, Response } from 'express';
import { validate } from '../../middlewares/validate';
import { authenticate, AuthRequest } from '../../middlewares/auth';
import { loginSchema, otpSendSchema, otpVerifySchema } from './schema';
import * as authService from './service';
import { env } from '../../config/env';

const router = Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// POST /auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.loginService(req.body);
    res.cookie('refresh_token', result.refreshToken, COOKIE_OPTIONS);
    res.json({
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err: unknown) {
    const e = err as { code: string; status: number };
    if (e.code === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: { code: e.code, message: 'Invalid email or password' } });
    } else {
      throw err;
    }
  }
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  const rawToken = req.cookies?.refresh_token;
  if (!rawToken) {
    res.status(401).json({ error: { code: 'MISSING_REFRESH_TOKEN', message: 'Refresh token not found' } });
    return;
  }

  try {
    const result = await authService.refreshService(rawToken);
    res.cookie('refresh_token', result.refreshToken, COOKIE_OPTIONS);
    res.json({ accessToken: result.accessToken });
  } catch (err: unknown) {
    const e = err as { code: string; status: number };
    res.clearCookie('refresh_token');
    res.status(e.status || 401).json({ error: { code: e.code, message: 'Session expired, please login again' } });
  }
});

// POST /auth/logout
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  const rawToken = req.cookies?.refresh_token;
  if (rawToken) {
    await authService.logoutService(rawToken);
  }
  res.clearCookie('refresh_token');
  res.json({ message: 'Logged out successfully' });
});

// POST /auth/otp/send  (Parent login step 1)
router.post('/otp/send', validate(otpSendSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // parentId comes from query for unauthenticated parent
    const parentId = parseInt(req.query.parentId as string);
    if (!parentId) {
      res.status(400).json({ error: { code: 'MISSING_PARENT_ID', message: 'parentId query param required' } });
      return;
    }
    const result = await authService.sendParentOTPService(req.body, parentId);
    res.json(result);
  } catch (err: unknown) {
    const e = err as { code: string; status: number };
    res.status(e.status || 500).json({ error: { code: e.code, message: 'Failed to send OTP' } });
  }
});

// POST /auth/otp/verify  (Parent login step 2)
router.post('/otp/verify', validate(otpVerifySchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await authService.verifyParentOTPService(req.body);
    res.cookie('refresh_token', result.refreshToken, COOKIE_OPTIONS);
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err: unknown) {
    const e = err as { code: string; status: number };
    res.status(e.status || 400).json({ error: { code: e.code, message: 'OTP verification failed' } });
  }
});

export default router;
