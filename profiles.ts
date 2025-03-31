import { D1Database } from '@cloudflare/workers-types';
import { nanoid } from 'nanoid';

export interface SMEProfile {
  id: string;
  user_id: string;
  company_name: string;
  industry: string;
  company_size: string;
  location: string;
  sustainability_goals: string;
  budget_range: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  created_at: string;
  updated_at: string;
}

export interface ConsultantProfile {
  id: string;
  user_id: string;
  full_name: string;
  headline: string;
  bio: string;
  expertise: string[]; // Stored as JSON
  experience_years: number;
  certifications?: string[]; // Stored as JSON
  hourly_rate: number;
  availability?: string;
  location: string;
  languages: string[]; // Stored as JSON
  portfolio_links?: string[]; // Stored as JSON
  created_at: string;
  updated_at: string;
}

export async function createSMEProfile(
  db: D1Database,
  userId: string,
  profileData: Omit<SMEProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<SMEProfile> {
  // Check if profile already exists
  const existingProfile = await db
    .prepare('SELECT * FROM sme_profiles WHERE user_id = ?')
    .bind(userId)
    .first<SMEProfile>();

  if (existingProfile) {
    throw new Error('Profile already exists for this user');
  }

  // Generate profile ID
  const profileId = nanoid();
  const now = new Date().toISOString();

  // Create profile
  await db
    .prepare(
      `INSERT INTO sme_profiles (
        id, user_id, company_name, industry, company_size, location, 
        sustainability_goals, budget_range, contact_person, contact_email, 
        contact_phone, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      profileId,
      userId,
      profileData.company_name,
      profileData.industry,
      profileData.company_size,
      profileData.location,
      profileData.sustainability_goals,
      profileData.budget_range,
      profileData.contact_person,
      profileData.contact_email,
      profileData.contact_phone,
      now,
      now
    )
    .run();

  // Update user profile_complete status
  await db
    .prepare('UPDATE users SET profile_complete = ? WHERE id = ?')
    .bind(true, userId)
    .run();

  // Get created profile
  const profile = await db
    .prepare('SELECT * FROM sme_profiles WHERE id = ?')
    .bind(profileId)
    .first<SMEProfile>();

  if (!profile) {
    throw new Error('Failed to create profile');
  }

  return profile;
}

export async function updateSMEProfile(
  db: D1Database,
  userId: string,
  profileData: Partial<Omit<SMEProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<SMEProfile> {
  // Check if profile exists
  const existingProfile = await db
    .prepare('SELECT * FROM sme_profiles WHERE user_id = ?')
    .bind(userId)
    .first<SMEProfile>();

  if (!existingProfile) {
    throw new Error('Profile not found for this user');
  }

  const now = new Date().toISOString();
  
  // Build update query dynamically based on provided fields
  const updateFields = [];
  const values = [];
  
  if (profileData.company_name !== undefined) {
    updateFields.push('company_name = ?');
    values.push(profileData.company_name);
  }
  
  if (profileData.industry !== undefined) {
    updateFields.push('industry = ?');
    values.push(profileData.industry);
  }
  
  if (profileData.company_size !== undefined) {
    updateFields.push('company_size = ?');
    values.push(profileData.company_size);
  }
  
  if (profileData.location !== undefined) {
    updateFields.push('location = ?');
    values.push(profileData.location);
  }
  
  if (profileData.sustainability_goals !== undefined) {
    updateFields.push('sustainability_goals = ?');
    values.push(profileData.sustainability_goals);
  }
  
  if (profileData.budget_range !== undefined) {
    updateFields.push('budget_range = ?');
    values.push(profileData.budget_range);
  }
  
  if (profileData.contact_person !== undefined) {
    updateFields.push('contact_person = ?');
    values.push(profileData.contact_person);
  }
  
  if (profileData.contact_email !== undefined) {
    updateFields.push('contact_email = ?');
    values.push(profileData.contact_email);
  }
  
  if (profileData.contact_phone !== undefined) {
    updateFields.push('contact_phone = ?');
    values.push(profileData.contact_phone);
  }
  
  // Always update the updated_at timestamp
  updateFields.push('updated_at = ?');
  values.push(now);
  
  // Add profile ID as the last parameter
  values.push(existingProfile.id);
  
  // Execute update query
  await db
    .prepare(`UPDATE sme_profiles SET ${updateFields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  // Get updated profile
  const updatedProfile = await db
    .prepare('SELECT * FROM sme_profiles WHERE id = ?')
    .bind(existingProfile.id)
    .first<SMEProfile>();

  if (!updatedProfile) {
    throw new Error('Failed to update profile');
  }

  return updatedProfile;
}

export async function getSMEProfile(
  db: D1Database,
  userId: string
): Promise<SMEProfile> {
  const profile = await db
    .prepare('SELECT * FROM sme_profiles WHERE user_id = ?')
    .bind(userId)
    .first<SMEProfile>();

  if (!profile) {
    throw new Error('Profile not found for this user');
  }

  return profile;
}

export async function getSMEProfileById(
  db: D1Database,
  profileId: string
): Promise<SMEProfile> {
  const profile = await db
    .prepare('SELECT * FROM sme_profiles WHERE id = ?')
    .bind(profileId)
    .first<SMEProfile>();

  if (!profile) {
    throw new Error('Profile not found');
  }

  return profile;
}

export async function createConsultantProfile(
  db: D1Database,
  userId: string,
  profileData: Omit<ConsultantProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<ConsultantProfile> {
  // Check if profile already exists
  const existingProfile = await db
    .prepare('SELECT * FROM consultant_profiles WHERE user_id = ?')
    .bind(userId)
    .first<ConsultantProfile>();

  if (existingProfile) {
    throw new Error('Profile already exists for this user');
  }

  // Generate profile ID
  const profileId = nanoid();
  const now = new Date().toISOString();

  // Create profile
  await db
    .prepare(
      `INSERT INTO consultant_profiles (
        id, user_id, full_name, headline, bio, expertise, experience_years,
        certifications, hourly_rate, availability, location, languages,
        portfolio_links, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      profileId,
      userId,
      profileData.full_name,
      profileData.headline,
      profileData.bio,
      JSON.stringify(profileData.expertise),
      profileData.experience_years,
      profileData.certifications ? JSON.stringify(profileData.certifications) : null,
      profileData.hourly_rate,
      profileData.availability || null,
      profileData.location,
      JSON.stringify(profileData.languages),
      profileData.portfolio_links ? JSON.stringify(profileData.portfolio_links) : null,
      now,
      now
    )
    .run();

  // Update user profile_complete status
  await db
    .prepare('UPDATE users SET profile_complete = ? WHERE id = ?')
    .bind(true, userId)
    .run();

  // Get created profile
  const profile = await getConsultantProfileWithParsedJson(db, profileId);

  if (!profile) {
    throw new Error('Failed to create profile');
  }

  return profile;
}

export async function updateConsultantProfile(
  db: D1Database,
  userId: string,
  profileData: Partial<Omit<ConsultantProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<ConsultantProfile> {
  // Check if profile exists
  const existingProfile = await db
    .prepare('SELECT * FROM consultant_profiles WHERE user_id = ?')
    .bind(userId)
    .first<ConsultantProfile>();

  if (!existingProfile) {
    throw new Error('Profile not found for this user');
  }

  const now = new Date().toISOString();
  
  // Build update query dynamically based on provided fields
  const updateFields = [];
  const values = [];
  
  if (profileData.full_name !== undefined) {
    updateFields.push('full_name = ?');
    values.push(profileData.full_name);
  }
  
  if (profileData.headline !== undefined) {
    updateFields.push('headline = ?');
    values.push(profileData.headline);
  }
  
  if (profileData.bio !== undefined) {
    updateFields.push('bio = ?');
    values.push(profileData.bio);
  }
  
  if (profileData.expertise !== undefined) {
    updateFields.push('expertise = ?');
    values.push(JSON.stringify(profileData.expertise));
  }
  
  if (profileData.experience_years !== undefined) {
    updateFields.push('experience_years = ?');
    values.push(profileData.experience_years);
  }
  
  if (profileData.certifications !== undefined) {
    updateFields.push('certifications = ?');
    values.push(JSON.stringify(profileData.certifications));
  }
  
  if (profileData.hourly_rate !== undefined) {
    updateFields.push('hourly_rate = ?');
    values.push(profileData.hourly_rate);
  }
  
  if (profileData.availability !== undefined) {
    updateFields.push('availability = ?');
    values.push(profileData.availability);
  }
  
  if (profileData.location !== undefined) {
    updateFields.push('location = ?');
    values.push(profileData.location);
  }
  
  if (profileData.languages !== undefined) {
    updateFields.push('languages = ?');
    values.push(JSON.stringify(profileData.languages));
  }
  
  if (profileData.portfolio_links !== undefined) {
    updateFields.push('portfolio_links = ?');
    values.push(JSON.stringify(profileData.portfolio_links));
  }
  
  // Always update the updated_at timestamp
  updateFields.push('updated_at = ?');
  values.push(now);
  
  // Add profile ID as the last parameter
  values.push(existingProfile.id);
  
  // Execute update query
  await db
    .prepare(`UPDATE consultant_profiles SET ${updateFields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  // Get updated profile
  const updatedProfile = await getConsultantProfileWithParsedJson(db, existingProfile.id);

  if (!updatedProfile) {
    throw new Error('Failed to update profile');
  }

  return updatedProfile;
}

export async function getConsultantProfile(
  db: D1Database,
  userId: string
): Promise<ConsultantProfile> {
  const profile = await db
    .prepare('SELECT * FROM consultant_profiles WHERE user_id = ?')
    .bind(userId)
    .first<any>();

  if (!profile) {
    throw new Error('Profile not found for this user');
  }

  return parseConsultantProfileJson(profile);
}

export async function getConsultantProfileById(
  db: D1Database,
  profileId: string
): Promise<ConsultantProfile> {
  return getConsultantProfileWithParsedJson(db, profileId);
}

export async function getConsultantProfileWithParsedJson(
  db: D1Database,
  profileId: string
): Promise<ConsultantProfile> {
  const profile = await db
    .prepare('SELECT * FROM consultant_profiles WHERE id = ?')
    .bind(profileId)
    .first<any>();

  if (!profile) {
    throw new Error('Profile not found');
  }

  return parseConsultantProfileJson(profile);
}

export async function listConsultants(
  db: D1Database,
  filters: {
    expertise?: string;
    location?: string;
    hourlyRateMin?: number;
    hourlyRateMax?: number;
    experienceYears?: number;
  } = {},
  page = 1,
  pageSize = 10
): Promise<{ consultants: ConsultantProfile[]; total: number }> {
  const offset = (page - 1) * pageSize;
  
  // Build query conditions based on filters
  const conditions = [];
  const values = [];
  
  if (filters.expertise) {
    conditions.push("expertise LIKE ?");
    values.push(`%${filters.expertise}%`);
  }
  
  if (filters.location) {
    conditions.push("location LIKE ?");
    values.push(`%${filters.location}%`);
  }
  
  if (filters.hourlyRateMin !== undefined) {
    conditions.push("hourly_rate >= ?");
    values.push(filters.hourlyRateMin);
  }
  
  if (filters.hourlyRateMax !== undefined) {
    conditions.push("hourly_rate <= ?");
    values.push(filters.hourlyRateMax);
  }
  
  if (filters.experienceYears !== undefined) {
    conditions.push("experience_years >= ?");
    values.push(filters.experienceYears);
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM consultant_profiles ${whereClause}`;
  const countResult = await db
    .prepare(countQuery)
    .bind(...values)
    .first<{ total: number }>();
  
  const total = countResult?.total || 0;
  
  // Get consultants with pagination
  const query = `
    SELECT * FROM consultant_profiles 
    ${whereClause} 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `;
  
  const consultantsResult = await db
    .prepare(query)
    .bind(...values, pageSize, offset)
    .all<any>();
  
  const consultants = consultantsResult.results.map(parseConsultantProfileJson);
  
  return {
    consultants,
    total
  };
}

// Helper function to parse JSON fields in consultant profile
function parseConsultantProfileJson(profile: any): ConsultantProfile {
  return {
    ...profile,
    expertise: JSON.parse(profile.expertise),
    certifications: profile.certifications ? JSON.parse(profile.certifications) : undefined,
    languages: JSON.parse(profile.languages),
    portfolio_links: profile.portfolio_links ? JSON.parse(profile.portfolio_links) : undefined
  };
}
