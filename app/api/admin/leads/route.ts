import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/server/config/db';
import { getPrivateCacheHeaders } from '@/server/utils/auth';
import { AdminLeadsService } from '@/server/services/admin-leads.service';
import { AdminLeadsQuerySchema } from '@/server/validators/admin.validator';

const adminLeadsService = new AdminLeadsService();

export async function GET(req: NextRequest) {
  const headers = getPrivateCacheHeaders();

  // 1. Validate and Parse Query Parameters
  const searchParams = req.nextUrl.searchParams;
  const rawQuery = Object.fromEntries(searchParams.entries());

  const parsed = AdminLeadsQuerySchema.safeParse(rawQuery);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid query parameters.',
        errors: parsed.error.format(),
      },
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
          ? 'Database configuration is not set up yet. Please check MONGODB_URI in environment variables.'
          : 'Unable to connect to database. Please try again later.',
      },
      { status: 500, headers }
    );
  }

  // 3. Query Leads with Metrics
  try {
    const result = await adminLeadsService.getLeads(parsed.data);
    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200, headers }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve lead records.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500, headers }
    );
  }
}
