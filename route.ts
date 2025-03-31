import { D1Database } from '@cloudflare/workers-types';
import { NextRequest, NextResponse } from 'next/server';
import { 
  generateAnalytics,
  getAnalytics,
  generatePlatformAnalytics,
  getPlatformAnalytics
} from '@/lib/analytics';

export async function POST(request: NextRequest) {
  try {
    const db = (request.env as any).DB as D1Database;
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'generate-analytics':
        const { userId, userType, period } = body;
        const analytics = await generateAnalytics(db, userId, userType, period);
        return NextResponse.json(analytics);

      case 'get-analytics':
        const { userId: getAnalyticsUserId, userType: getAnalyticsUserType, dataType, period: getAnalyticsPeriod, limit } = body;
        const userAnalytics = await getAnalytics(db, getAnalyticsUserId, getAnalyticsUserType, dataType, getAnalyticsPeriod, limit);
        return NextResponse.json(userAnalytics);

      case 'generate-platform-analytics':
        const { period: platformPeriod } = body;
        const platformAnalytics = await generatePlatformAnalytics(db, platformPeriod);
        return NextResponse.json(platformAnalytics);

      case 'get-platform-analytics':
        const { period: getPlatformPeriod, limit: platformLimit } = body;
        const retrievedPlatformAnalytics = await getPlatformAnalytics(db, getPlatformPeriod, platformLimit);
        return NextResponse.json(retrievedPlatformAnalytics);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
