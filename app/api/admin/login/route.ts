import { NextRequest, NextResponse } from 'next/server';
import {
  validateAdminCredentials,
  createAdminToken,
  setAdminSessionCookie,
  checkLoginRateLimit,
  recordFailedLogin,
  clearLoginRateLimit,
  validateSameOrigin,
  getPrivateCacheHeaders,
} from '@/server/utils/auth';
import { AdminLoginSchema } from '@/server/validators/admin.validator';

export async function POST(req: NextRequest) {
  const headers = getPrivateCacheHeaders();

  // 1. Same-Origin Check
  if (!validateSameOrigin(req)) {
    return NextResponse.json(
      { success: false, message: 'Invalid request origin.' },
      { status: 403, headers }
    );
  }

  // 2. IP Rate Limiting Check
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  const rateCheck = checkLoginRateLimit(clientIp);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      {
        success: false,
        message: `Too many failed login attempts. Please try again in ${rateCheck.retryAfterSeconds || 900} seconds.`,
      },
      { status: 429, headers }
    );
  }

  // 3. Body Parsing & Validation
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid request format.' },
      { status: 400, headers }
    );
  }

  const parsed = AdminLoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: 'Invalid username or password.' },
      { status: 400, headers }
    );
  }

  const { username, password } = parsed.data;

  // 4. Timing-safe Credential Verification
  const isValid = validateAdminCredentials(username, password);

  if (!isValid) {
    recordFailedLogin(clientIp);
    return NextResponse.json(
      { success: false, message: 'Invalid username or password.' },
      { status: 401, headers }
    );
  }

  // 5. Successful Authentication
  clearLoginRateLimit(clientIp);
  const token = await createAdminToken(username);

  const response = NextResponse.json(
    {
      success: true,
      message: 'Admin authentication successful.',
      data: { username },
    },
    { status: 200, headers }
  );

  setAdminSessionCookie(response, token);
  return response;
}
