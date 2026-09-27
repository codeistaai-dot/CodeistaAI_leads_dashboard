import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createAdminToken,
  verifyAdminToken,
  validateAdminCredentials,
  validateSameOrigin,
  checkLoginRateLimit,
  recordFailedLogin,
  clearLoginRateLimit,
  getPrivateCacheHeaders,
} from '../server/utils/auth';
import {
  getDateRangeBounds,
  getNowInIST,
  getStartOfDayIST,
  formatDateIST,
} from '../server/utils/timezone';
import {
  AdminLoginSchema,
  AdminLeadsQuerySchema,
  ObjectIdSchema,
  escapeRegex,
} from '../server/validators/admin.validator';

describe('Admin Authentication & Session Verification', () => {
  it('should reject invalid credentials with timing-safe check', () => {
    assert.equal(validateAdminCredentials('invalid_user', 'invalid_pass'), false);
    assert.equal(validateAdminCredentials('', ''), false);
  });

  it('should create and verify valid admin JWT token', async () => {
    // Provide a test session secret in env if not present
    process.env.ADMIN_SESSION_SECRET = 'test_secret_key_minimum_32_characters_long_for_tests!';
    const token = await createAdminToken('admin_test_user');
    assert.ok(token);

    const session = await verifyAdminToken(token);
    assert.ok(session);
    assert.equal(session.username, 'admin_test_user');
    assert.equal(session.role, 'admin');
  });

  it('should reject tampered or malformed tokens', async () => {
    const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature';
    const session = await verifyAdminToken(tamperedToken);
    assert.equal(session, null);

    const emptySession = await verifyAdminToken('');
    assert.equal(emptySession, null);
  });

  it('should enforce login rate limiting after 5 failed attempts', () => {
    const testIp = '192.168.1.99';
    clearLoginRateLimit(testIp);

    assert.equal(checkLoginRateLimit(testIp).allowed, true);

    // Record 5 failed attempts
    for (let i = 0; i < 5; i++) {
      recordFailedLogin(testIp);
    }

    const rateLimitResult = checkLoginRateLimit(testIp);
    assert.equal(rateLimitResult.allowed, false);
    assert.ok(rateLimitResult.retryAfterSeconds && rateLimitResult.retryAfterSeconds > 0);

    clearLoginRateLimit(testIp);
    assert.equal(checkLoginRateLimit(testIp).allowed, true);
  });

  it('should supply strict private cache prevention headers', () => {
    const headers = getPrivateCacheHeaders();
    assert.ok(headers['Cache-Control'].includes('no-store'));
    assert.ok(headers['Cache-Control'].includes('no-cache'));
  });
});

describe('Timezone & Half-Open Date Bounds (Asia/Kolkata)', () => {
  it('should compute exact IST calendar date components', () => {
    const testDate = new Date('2026-09-27T12:00:00.000Z');
    const ist = getNowInIST(testDate);
    // 12:00 UTC + 5:30 = 17:30 IST on 2026-09-27
    assert.equal(ist.year, 2026);
    assert.equal(ist.month, 8); // September (0-indexed)
    assert.equal(ist.day, 27);
  });

  it('should compute half-open boundaries for today in IST', () => {
    const bounds = getDateRangeBounds('today');
    assert.ok(bounds.start);
    assert.ok(bounds.end);
    // Difference between start and end must be exactly 24 hours (86400000 ms)
    const diff = bounds.end.getTime() - bounds.start.getTime();
    assert.equal(diff, 24 * 60 * 60 * 1000);
    assert.equal(bounds.label, 'Today (IST)');
  });

  it('should compute half-open boundaries for yesterday in IST', () => {
    const bounds = getDateRangeBounds('yesterday');
    assert.ok(bounds.start);
    assert.ok(bounds.end);
    const diff = bounds.end.getTime() - bounds.start.getTime();
    assert.equal(diff, 24 * 60 * 60 * 1000);
  });

  it('should compute exact custom date range bounds', () => {
    const bounds = getDateRangeBounds('custom', '2026-09-01', '2026-09-10');
    assert.ok(bounds.start);
    assert.ok(bounds.end);
    // 10 calendar days in half-open [start, end)
    const diffDays = (bounds.end.getTime() - bounds.start.getTime()) / (24 * 60 * 60 * 1000);
    assert.equal(diffDays, 10);
  });

  it('should format dates in Asia/Kolkata (IST)', () => {
    const utcDate = new Date('2026-09-27T00:00:00.000Z');
    const formatted = formatDateIST(utcDate);
    assert.ok(formatted.includes('IST'));
    assert.ok(formatted.includes('2026'));
  });
});

describe('Admin Validators & Sanitization', () => {
  it('should escape regex characters to prevent injection', () => {
    const raw = 'user+test@example.com (555)';
    const escaped = escapeRegex(raw);
    assert.equal(escaped, 'user\\+test@example\\.com \\(555\\)');
  });

  it('should validate valid MongoDB ObjectIds and reject invalid ones', () => {
    assert.equal(ObjectIdSchema.safeParse('507f1f77bcf86cd799439011').success, true);
    assert.equal(ObjectIdSchema.safeParse('invalid-id').success, false);
    assert.equal(ObjectIdSchema.safeParse('123').success, false);
  });

  it('should validate and bound query parameters', () => {
    const validQuery = {
      range: '7days',
      pythonStartingPoint: 'new',
      attributionStatus: 'all',
      search: 'Rahul',
      page: '2',
      limit: '25',
    };
    const parsed = AdminLeadsQuerySchema.safeParse(validQuery);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.page, 2);
      assert.equal(parsed.data.limit, 25);
    }
  });

  it('should reject unbounded page limit', () => {
    const excessiveLimit = {
      limit: '500',
    };
    const parsed = AdminLeadsQuerySchema.safeParse(excessiveLimit);
    assert.equal(parsed.success, false);
  });
});
