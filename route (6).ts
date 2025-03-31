import { D1Database } from '@cloudflare/workers-types';
import { NextRequest, NextResponse } from 'next/server';
import { registerUser, loginUser, verifyMfa, setupMfa, enableMfa } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const db = (request.env as any).DB as D1Database;
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'register':
        const { email, name, password, userType } = body;
        const registerResult = await registerUser(db, email, name, password, userType);
        return NextResponse.json(registerResult);

      case 'login':
        const { loginEmail, loginPassword } = body;
        const loginResult = await loginUser(db, loginEmail, loginPassword);
        return NextResponse.json(loginResult);

      case 'verify-mfa':
        const { userId, mfaCode } = body;
        const verifyResult = await verifyMfa(db, userId, mfaCode);
        return NextResponse.json(verifyResult);

      case 'setup-mfa':
        const { setupUserId } = body;
        const setupResult = await setupMfa(db, setupUserId);
        return NextResponse.json(setupResult);

      case 'enable-mfa':
        const { enableUserId, enableMfaCode } = body;
        const enableResult = await enableMfa(db, enableUserId, enableMfaCode);
        return NextResponse.json({ success: enableResult });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
