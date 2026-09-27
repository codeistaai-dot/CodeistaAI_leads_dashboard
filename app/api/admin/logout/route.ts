import { NextRequest, NextResponse } from 'next/server';
import { clearAdminSessionCookie, validateSameOrigin, getPrivateCacheHeaders } from '@/server/utils/auth';

export async function POST(req: NextRequest) {
  const headers = getPrivateCacheHeaders();

  if (!validateSameOrigin(req)) {
    return NextResponse.json(
      { success: false, message: 'Invalid request origin.' },
      { status: 403, headers }
    );
  }

  const response = NextResponse.json(
    { success: true, message: 'Logged out successfully.' },
    { status: 200, headers }
  );

  clearAdminSessionCookie(response);
  return response;
}
