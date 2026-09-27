import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/server/config/db';
import { getPrivateCacheHeaders } from '@/server/utils/auth';
import { AdminLeadsService } from '@/server/services/admin-leads.service';
import { ObjectIdSchema } from '@/server/validators/admin.validator';

const adminLeadsService = new AdminLeadsService();

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const headers = getPrivateCacheHeaders();

  // 1. Validate Lead/User ID
  const { id } = await context.params;
  const parsedId = ObjectIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json(
      { success: false, message: 'Invalid lead ID format.' },
      { status: 400, headers }
    );
  }

  // 2. Connect to Database
  try {
    await connectToDatabase();
  } catch (err: any) {
    const isMissingEnv = err.message && err.message.includes('MONGODB_URI');
    return NextResponse.json(
      {
        success: false,
        code: 'DATABASE_ERROR',
        message: isMissingEnv
          ? 'Database configuration is not set up yet. Please check environment variables.'
          : 'Unable to connect to database. Please try again later.',
      },
      { status: 500, headers }
    );
  }

  // 3. Query Detail
  try {
    const detail = await adminLeadsService.getLeadDetail(parsedId.data);
    if (!detail) {
      return NextResponse.json(
        { success: false, message: 'Lead record not found.' },
        { status: 404, headers }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: detail,
      },
      { status: 200, headers }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve lead details.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500, headers }
    );
  }
}
