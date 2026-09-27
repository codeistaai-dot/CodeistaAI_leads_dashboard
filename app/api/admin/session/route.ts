import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession, getPrivateCacheHeaders } from '@/server/utils/auth';

export async function GET(req: NextRequest) {
  const headers = getPrivateCacheHeaders();
  const session = await getAdminSession(req);

  if (!session) {
    return NextResponse.json(
      { success: false, authenticated: false },
      { status: 401, headers }
    );
  }

  return NextResponse.json(
    {
      success: true,
      authenticated: true,
      data: { username: session.username },
    },
    { status: 200, headers }
  );
}
