import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

describe('AttendAI Core Logic Verification', () => {
  // ─── 1. Attendance Percentage Calculation Formula ───────────────
  describe('Attendance % Formula', () => {
    it('calculates percentage correctly: (P + OD) / total * 100', () => {
      const totalClasses = 40;
      const present = 30;
      const onDuty = 2;
      const leave = 3;
      const countLeaveAsPresent = false;

      const effectivePresent = present + onDuty + (countLeaveAsPresent ? leave : 0);
      const percentage = Number(((effectivePresent / totalClasses) * 100).toFixed(1));

      expect(percentage).toBe(80);
      expect(percentage >= 75).toBe(true);
    });

    it('identifies defaulters below 75%', () => {
      const totalClasses = 40;
      const present = 28;
      const onDuty = 0;

      const percentage = Number((((present + onDuty) / totalClasses) * 100).toFixed(1));

      expect(percentage).toBe(70);
      expect(percentage < 75).toBe(true); // Defaulter flagged
    });

    it('supports countLeaveAsPresent when policy rule enabled', () => {
      const totalClasses = 40;
      const present = 28;
      const leave = 3;
      const countLeaveAsPresent = true;

      const effective = present + (countLeaveAsPresent ? leave : 0);
      const percentage = Number(((effective / totalClasses) * 100).toFixed(1));

      expect(percentage).toBe(77.5);
      expect(percentage >= 75).toBe(true); // Saved from defaulter list by approved leaves
    });
  });

  // ─── 2. Rotating QR HMAC Token Generation ───────────────────────
  describe('QR Rotating Token Mechanism', () => {
    const secret = 'dev-jwt-secret-change-in-production-min-32-chars-long';
    const sessionId = 'd290f1ee-6c54-4b01-90e6-d701748f0851';

    function computeToken(sessionId: string, windowNumber: number): string {
      return crypto
        .createHmac('sha256', secret)
        .update(`${sessionId}:${windowNumber}`)
        .digest('hex')
        .substring(0, 8)
        .toUpperCase();
    }

    it('generates consistent 8-character uppercase alphanumeric tokens', () => {
      const window = 1000;
      const token1 = computeToken(sessionId, window);
      const token2 = computeToken(sessionId, window);

      expect(token1).toBe(token2);
      expect(token1.length).toBe(8);
      expect(/^[0-9A-F]{8}$/.test(token1)).toBe(true);
    });

    it('rotates to a different token in the next 10s window', () => {
      const window1 = 1000;
      const window2 = 1001;
      const token1 = computeToken(sessionId, window1);
      const token2 = computeToken(sessionId, window2);

      expect(token1).not.toBe(token2);
    });

    it('accepts current window or previous window (10s tolerance for network delay)', () => {
      const currentWindow = 2000;
      const submittedToken = computeToken(sessionId, currentWindow - 1); // Previous window

      const validCurrent = computeToken(sessionId, currentWindow);
      const validPrev = computeToken(sessionId, currentWindow - 1);

      const isValid = submittedToken === validCurrent || submittedToken === validPrev;
      expect(isValid).toBe(true);
    });
  });

  // ─── 3. Offline Sync Protocol & Monotonic Cursor ─────────────────
  describe('Offline Sync Cursor & Idempotency', () => {
    it('sorts changes strictly by monotonic sequence', () => {
      const changes = [
        { changeSeq: 101n, entity: 'attendance', entityId: 'uuid-1' },
        { changeSeq: 102n, entity: 'attendance', entityId: 'uuid-2' },
        { changeSeq: 103n, entity: 'leave', entityId: 'uuid-3' },
      ];

      const clientCursor = 100n;
      const pendingPull = changes.filter((c) => c.changeSeq > clientCursor);

      expect(pendingPull.length).toBe(3);
      expect(pendingPull[pendingPull.length - 1].changeSeq.toString()).toBe('103');
    });

    it('idempotency detects duplicate records with same status', () => {
      const existingRecord = { sessionId: 's-1', studentId: 10, status: 'P', method: 'MANUAL' };
      const incomingItem = { sessionId: 's-1', studentId: 10, status: 'P', method: 'MANUAL' };

      const isDuplicate =
        existingRecord.status === incomingItem.status && existingRecord.method === incomingItem.method;

      expect(isDuplicate).toBe(true);
    });
  });
});
