import { D1Database } from '@cloudflare/workers-types';
import { nanoid } from 'nanoid';

export interface AnalyticsData {
  id: string;
  user_id: string;
  user_type: 'sme' | 'consultant';
  data_type: 'project_metrics' | 'consultant_metrics' | 'sme_metrics' | 'platform_metrics';
  data: any; // Stored as JSON
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  date: string;
  created_at: string;
  updated_at: string;
}

export async function generateAnalytics(
  db: D1Database,
  userId: string,
  userType: 'sme' | 'consultant',
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly'
): Promise<AnalyticsData[]> {
  const now = new Date().toISOString();
  const date = now.split('T')[0]; // YYYY-MM-DD
  
  // Generate different types of analytics based on user type
  const analyticsData: AnalyticsData[] = [];
  
  if (userType === 'sme') {
    // Generate SME metrics
    const smeMetrics = await generateSMEMetrics(db, userId);
    
    const smeAnalytics: AnalyticsData = {
      id: nanoid(),
      user_id: userId,
      user_type: userType,
      data_type: 'sme_metrics',
      data: smeMetrics,
      period,
      date,
      created_at: now,
      updated_at: now
    };
    
    analyticsData.push(smeAnalytics);
    
    // Store analytics in database
    await db
      .prepare(
        `INSERT INTO analytics (
          id, user_id, user_type, data_type, data, period, date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        smeAnalytics.id,
        smeAnalytics.user_id,
        smeAnalytics.user_type,
        smeAnalytics.data_type,
        JSON.stringify(smeAnalytics.data),
        smeAnalytics.period,
        smeAnalytics.date,
        smeAnalytics.created_at,
        smeAnalytics.updated_at
      )
      .run();
    
    // Generate project metrics for each project
    const projectsResult = await db
      .prepare('SELECT id FROM projects WHERE sme_id = ?')
      .bind(userId)
      .all<{ id: string }>();
    
    for (const project of projectsResult.results) {
      const projectMetrics = await generateProjectMetrics(db, project.id);
      
      const projectAnalytics: AnalyticsData = {
        id: nanoid(),
        user_id: userId,
        user_type: userType,
        data_type: 'project_metrics',
        data: {
          project_id: project.id,
          ...projectMetrics
        },
        period,
        date,
        created_at: now,
        updated_at: now
      };
      
      analyticsData.push(projectAnalytics);
      
      // Store analytics in database
      await db
        .prepare(
          `INSERT INTO analytics (
            id, user_id, user_type, data_type, data, period, date, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          projectAnalytics.id,
          projectAnalytics.user_id,
          projectAnalytics.user_type,
          projectAnalytics.data_type,
          JSON.stringify(projectAnalytics.data),
          projectAnalytics.period,
          projectAnalytics.date,
          projectAnalytics.created_at,
          projectAnalytics.updated_at
        )
        .run();
    }
  } else {
    // Generate consultant metrics
    const consultantMetrics = await generateConsultantMetrics(db, userId);
    
    const consultantAnalytics: AnalyticsData = {
      id: nanoid(),
      user_id: userId,
      user_type: userType,
      data_type: 'consultant_metrics',
      data: consultantMetrics,
      period,
      date,
      created_at: now,
      updated_at: now
    };
    
    analyticsData.push(consultantAnalytics);
    
    // Store analytics in database
    await db
      .prepare(
        `INSERT INTO analytics (
          id, user_id, user_type, data_type, data, period, date, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        consultantAnalytics.id,
        consultantAnalytics.user_id,
        consultantAnalytics.user_type,
        consultantAnalytics.data_type,
        JSON.stringify(consultantAnalytics.data),
        consultantAnalytics.period,
        consultantAnalytics.date,
        consultantAnalytics.created_at,
        consultantAnalytics.updated_at
      )
      .run();
  }
  
  return analyticsData;
}

export async function getAnalytics(
  db: D1Database,
  userId: string,
  userType: 'sme' | 'consultant',
  dataType?: string,
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly',
  limit = 10
): Promise<AnalyticsData[]> {
  // Build query conditions
  let whereClause = 'WHERE user_id = ? AND user_type = ?';
  const values = [userId, userType];
  
  if (dataType) {
    whereClause += ' AND data_type = ?';
    values.push(dataType);
  }
  
  whereClause += ' AND period = ?';
  values.push(period);
  
  // Get analytics
  const query = `
    SELECT * FROM analytics 
    ${whereClause}
    ORDER BY date DESC
    LIMIT ?
  `;
  
  const analyticsResult = await db
    .prepare(query)
    .bind(...values, limit)
    .all<any>();
  
  // Parse data JSON
  return analyticsResult.results.map(analytics => ({
    ...analytics,
    data: JSON.parse(analytics.data)
  }));
}

export async function generatePlatformAnalytics(
  db: D1Database,
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly'
): Promise<AnalyticsData> {
  const now = new Date().toISOString();
  const date = now.split('T')[0]; // YYYY-MM-DD
  
  // Generate platform metrics
  const platformMetrics = await generatePlatformMetrics(db);
  
  const platformAnalytics: AnalyticsData = {
    id: nanoid(),
    user_id: 'system',
    user_type: 'sme', // Placeholder, not relevant for platform metrics
    data_type: 'platform_metrics',
    data: platformMetrics,
    period,
    date,
    created_at: now,
    updated_at: now
  };
  
  // Store analytics in database
  await db
    .prepare(
      `INSERT INTO analytics (
        id, user_id, user_type, data_type, data, period, date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      platformAnalytics.id,
      platformAnalytics.user_id,
      platformAnalytics.user_type,
      platformAnalytics.data_type,
      JSON.stringify(platformAnalytics.data),
      platformAnalytics.period,
      platformAnalytics.date,
      platformAnalytics.created_at,
      platformAnalytics.updated_at
    )
    .run();
  
  return platformAnalytics;
}

export async function getPlatformAnalytics(
  db: D1Database,
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly',
  limit = 10
): Promise<AnalyticsData[]> {
  // Get platform analytics
  const query = `
    SELECT * FROM analytics 
    WHERE data_type = ? AND period = ?
    ORDER BY date DESC
    LIMIT ?
  `;
  
  const analyticsResult = await db
    .prepare(query)
    .bind('platform_metrics', period, limit)
    .all<any>();
  
  // Parse data JSON
  return analyticsResult.results.map(analytics => ({
    ...analytics,
    data: JSON.parse(analytics.data)
  }));
}

// Helper function to generate SME metrics
async function generateSMEMetrics(
  db: D1Database,
  smeId: string
): Promise<any> {
  // Get total projects
  const projectsCount = await db
    .prepare('SELECT COUNT(*) as count FROM projects WHERE sme_id = ?')
    .bind(smeId)
    .first<{ count: number }>();
  
  // Get projects by status
  const projectsByStatus = await db
    .prepare('SELECT status, COUNT(*) as count FROM projects WHERE sme_id = ? GROUP BY status')
    .bind(smeId)
    .all<{ status: string; count: number }>();
  
  // Get total spent on projects
  const totalSpent = await db
    .prepare(`
      SELECT SUM(p.amount) as total
      FROM payments p
      JOIN project_matches pm ON p.project_match_id = pm.id
      JOIN projects proj ON pm.project_id = proj.id
      WHERE proj.sme_id = ? AND p.status = ?
    `)
    .bind(smeId, 'completed')
    .first<{ total: number }>();
  
  // Get total spent on toolkits
  const toolkitSpent = await db
    .prepare(`
      SELECT SUM(tp.price) as total
      FROM toolkit_purchases tp
      WHERE tp.sme_id = ? AND tp.status = ?
    `)
    .bind(smeId, 'completed')
    .first<{ total: number }>();
  
  // Get total consultants worked with
  const consultantsCount = await db
    .prepare(`
      SELECT COUNT(DISTINCT pm.consultant_id) as count
      FROM project_matches pm
      JOIN projects proj ON pm.project_id = proj.id
      WHERE proj.sme_id = ? AND pm.status IN (?, ?)
    `)
    .bind(smeId, 'accepted', 'completed')
    .first<{ count: number }>();
  
  // Get toolkits purchased
  const toolkitsCount = await db
    .prepare(`
      SELECT COUNT(*) as count
      FROM toolkit_purchases tp
      WHERE tp.sme_id = ? AND tp.status = ?
    `)
    .bind(smeId, 'completed')
    .first<{ count: number }>();
  
  return {
    projects_total: projectsCount?.count || 0,
    projects_by_status: projectsByStatus.results.reduce((acc, curr) => {
      acc[curr.status] = curr.count;
      return acc;
    }, {} as Record<string, number>),
    total_spent_projects: totalSpent?.total || 0,
    total_spent_toolkits: toolkitSpent?.total || 0,
    total_spent: (totalSpent?.total || 0) + (toolkitSpent?.total || 0),
    consultants_worked_with: consultantsCount?.count || 0,
    toolkits_purchased: toolkitsCount?.count || 0
  };
}

// Helper function to generate consultant metrics
async function generateConsultantMetrics(
  db: D1Database,
  consultantId: string
): Promise<any> {
  // Get total project matches
  const matchesCount = await db
    .prepare('SELECT COUNT(*) as count FROM project_matches WHERE consultant_id = ?')
    .bind(consultantId)
    .first<{ count: number }>();
  
  // Get matches by status
  const matchesByStatus = await db
    .prepare('SELECT status, COUNT(*) as count FROM project_matches WHERE consultant_id = ? GROUP BY status')
    .bind(consultantId)
    .all<{ status: string; count: number }>();
  
  // Get total earned from projects
  const totalEarned = await db
    .prepare(`
      SELECT SUM(p.amount) as total
      FROM payments p
      JOIN project_matches pm ON p.project_match_id = pm.id
      WHERE pm.consultant_id = ? AND p.status = ?
    `)
    .bind(consultantId, 'completed')
    .first<{ total: number }>();
  
  // Get total earned from toolkits
  const toolkitEarned = await db
    .prepare(`
      SELECT SUM(tp.price) as total
      FROM toolkit_purchases tp
      JOIN toolkits t ON tp.toolkit_id = t.id
      WHERE t.consultant_id = ? AND tp.status = ?
    `)
    .bind(consultantId, 'completed')
    .first<{ total: number }>();
  
  // Get total SMEs worked with
  const smesCount = await db
    .prepare(`
      SELECT COUNT(DISTINCT proj.sme_id) as count
      FROM project_matches pm
      JOIN projects proj ON pm.project_id = proj.id
      WHERE pm.consultant_id = ? AND pm.status IN (?, ?)
    `)
    .bind(consultantId, 'accepted', 'completed')
    .first<{ count: number }>();
  
  // Get toolkits created and sold
  const toolkitsCreated = await db
    .prepare('SELECT COUNT(*) as count FROM toolkits WHERE consultant_id = ?')
    .bind(consultantId)
    .first<{ count: number }>();
  
  const toolkitsSold = await db
    .prepare(`
      SELECT COUNT(*) as count
      FROM toolkit_purchases tp
      JOIN toolkits t ON tp.toolkit_id = t.id
      WHERE t.consultant_id = ? AND tp.status = ?
    `)
    .bind(consultantId, 'completed')
    .first<{ count: number }>();
  
  // Get average rating
  const avgRating = await db
    .prepare(`
      SELECT AVG(tr.rating) as avg_rating
      FROM toolkit_reviews tr
      JOIN toolkits t ON tr.toolkit_id = t.id
      WHERE t.consultant_id = ?
    `)
    .bind(consultantId)
    .first<{ avg_rating: number }>();
  
  return {
    matches_total: matchesCount?.count || 0,
    matches_by_status: matchesByStatus.results.reduce((acc, curr) => {
      acc[curr.status] = curr.count;
      return acc;
    }, {} as Record<string, number>),
    total_earned_projects: totalEarned?.total || 0,
    total_earned_toolkits: toolkitEarned?.total || 0,
    total_earned: (totalEarned?.total || 0) + (toolkitEarned?.total || 0),
    smes_worked_with: smesCount?.count || 0,
    toolkits_created: toolkitsCreated?.count || 0,
    toolkits_sold: toolkitsSold?.count || 0,
    average_rating: avgRating?.avg_rating ? Math.round(avgRating.avg_rating * 10) / 10 : null
  };
}

// Helper function to generate project metrics
async function generateProjectMetrics(
  db: D1Database,
  projectId: string
): Promise<any> {
  // Get project details
  const project = await db
    .prepare('SELECT * FROM projects WHERE id = ?')
    .bind(projectId)
    .first<any>();
  
  if (!project) {
    throw new Error('Project not found');
  }
  
  // Get match count
  const matchesCount = await db
    .prepare('SELECT COUNT(*) as count FROM project_matches WHERE project_id = ?')
    .bind(projectId)
    .first<{ count: number }>();
  
  // Get matches by status
  const matchesByStatus = await db
    .prepare('SELECT status, COUNT(*) as count FROM project_matches WHERE project_id = ? GROUP BY status')
    .bind(projectId)
    .all<{ status: string; count: number }>();
  
  // Get accepted match if any
  const acceptedMatch = await db
    .prepare(`
      SELECT pm.*, cp.full_name as consultant_name
      FROM project_matches pm
      JOIN consultant_profiles cp ON pm.consultant_id = cp.id
      WHERE pm.project_id = ? AND pm.status = ?
    `)
    .bind(projectId, 'accepted')
    .first<any>();
  
  // Get payment if any
  const payment = await db
    .prepare(`
      SELECT p.*
      FROM payments p
      JOIN project_matches pm ON p.project_match_id = pm.id
      WHERE pm.project_id = ?
    `)
    .bind(projectId)
    .first<any>();
  
  return {
    project_title: project.title,
    project_status: project.status,
    project_created_at: project.created_at,
    matches_total: matchesCount?.count || 0,
    matches_by_status: matchesByStatus.results.reduce((acc, curr) => {
      acc[curr.status] = curr.count;
      return acc;
    }, {} as Record<string, number>),
    accepted_match: acceptedMatch ? {
      id: acceptedMatch.id,
      consultant_id: acceptedMatch.consultant_id,
      consultant_name: acceptedMatch.consultant_name,
      match_score: acceptedMatch.match_score,
      price: acceptedMatch.price
    } : null,
    payment: payment ? {
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      created_at: payment.created_at
    } : null
  };
}

// Helper function to generate platform metrics
async function generatePlatformMetrics(
  db: D1Database
): Promise<any> {
  // Get user counts
  const smeCount = await db
    .prepare('SELECT COUNT(*) as count FROM users WHERE user_type = ?')
    .bind('sme')
    .first<{ count: number }>();
  
  const consultantCount = await db
    .prepare('SELECT COUNT(*) as count FROM users WHERE user_type = ?')
    .bind('consultant')
    .first<{ count: number }>();
  
  // Get project counts
  const projectsTotal = await db
    .prepare('SELECT COUNT(*) as count FROM projects')
    .first<{ count: number }>();
  
  const projectsByStatus = await db
    .prepare('SELECT status, COUNT(*) as count FROM projects GROUP BY status')
    .all<{ status: string; count: number }>();
  
  // Get match counts
  const matchesTotal = await db
    .prepare('SELECT COUNT(*) as count FROM project_matches')
    .first<{ count: number }>();
  
  const matchesByStatus = await db
    .prepare('SELECT status, COUNT(*) as count FROM project_matches GROUP BY status')
    .all<{ status: string; count: number }>();
  
  // Get payment metrics
  const paymentsTotal = await db
    .prepare('SELECT COUNT(*) as count FROM payments')
    .first<{ count: number }>();
  
  const paymentsAmount = await db
    .prepare('SELECT SUM(amount) as total FROM payments WHERE status = ?')
    .bind('completed')
    .first<{ total: number }>();
  
  // Get toolkit metrics
  const toolkit
(Content truncated due to size limit. Use line ranges to read in chunks)