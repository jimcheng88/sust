import { D1Database } from '@cloudflare/workers-types';
import { NextRequest, NextResponse } from 'next/server';
import { 
  createSMEProfile, 
  updateSMEProfile, 
  getSMEProfile,
  createConsultantProfile,
  updateConsultantProfile,
  getConsultantProfile,
  listConsultants
} from '@/lib/profiles';

export async function POST(request: NextRequest) {
  try {
    const db = (request.env as any).DB as D1Database;
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create-sme-profile':
        const { userId: smeUserId, profileData: smeProfileData } = body;
        const smeProfile = await createSMEProfile(db, smeUserId, smeProfileData);
        return NextResponse.json(smeProfile);

      case 'update-sme-profile':
        const { userId: smeUpdateUserId, profileData: smeUpdateData } = body;
        const updatedSmeProfile = await updateSMEProfile(db, smeUpdateUserId, smeUpdateData);
        return NextResponse.json(updatedSmeProfile);

      case 'get-sme-profile':
        const { userId: smeGetUserId } = body;
        const retrievedSmeProfile = await getSMEProfile(db, smeGetUserId);
        return NextResponse.json(retrievedSmeProfile);

      case 'create-consultant-profile':
        const { userId: consultantUserId, profileData: consultantProfileData } = body;
        const consultantProfile = await createConsultantProfile(db, consultantUserId, consultantProfileData);
        return NextResponse.json(consultantProfile);

      case 'update-consultant-profile':
        const { userId: consultantUpdateUserId, profileData: consultantUpdateData } = body;
        const updatedConsultantProfile = await updateConsultantProfile(db, consultantUpdateUserId, consultantUpdateData);
        return NextResponse.json(updatedConsultantProfile);

      case 'get-consultant-profile':
        const { userId: consultantGetUserId } = body;
        const retrievedConsultantProfile = await getConsultantProfile(db, consultantGetUserId);
        return NextResponse.json(retrievedConsultantProfile);

      case 'list-consultants':
        const { filters, page, pageSize } = body;
        const consultants = await listConsultants(db, filters, page, pageSize);
        return NextResponse.json(consultants);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
