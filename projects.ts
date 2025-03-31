import { D1Database } from '@cloudflare/workers-types';
import { nanoid } from 'nanoid';
import { getConsultantProfileById } from './profiles';

export interface Project {
  id: string;
  sme_id: string;
  title: string;
  description: string;
  requirements: string;
  budget: number | null;
  deadline: string | null;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface ProjectMatch {
  id: string;
  project_id: string;
  consultant_id: string;
  match_score: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  proposal: string | null;
  price: number | null;
  created_at: string;
  updated_at: string;
}

export async function createProject(
  db: D1Database,
  smeId: string,
  projectData: Omit<Project, 'id' | 'sme_id' | 'status' | 'created_at' | 'updated_at'>
): Promise<Project> {
  // Generate project ID
  const projectId = nanoid();
  const now = new Date().toISOString();

  // Create project
  await db
    .prepare(
      `INSERT INTO projects (
        id, sme_id, title, description, requirements, budget, deadline, 
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      projectId,
      smeId,
      projectData.title,
      projectData.description,
      projectData.requirements,
      projectData.budget,
      projectData.deadline,
      'open', // Initial status is always 'open'
      now,
      now
    )
    .run();

  // Get created project
  const project = await db
    .prepare('SELECT * FROM projects WHERE id = ?')
    .bind(projectId)
    .first<Project>();

  if (!project) {
    throw new Error('Failed to create project');
  }

  // Generate AI matches for the project
  await generateProjectMatches(db, project);

  return project;
}

export async function updateProject(
  db: D1Database,
  projectId: string,
  smeId: string,
  projectData: Partial<Omit<Project, 'id' | 'sme_id' | 'created_at' | 'updated_at'>>
): Promise<Project> {
  // Check if project exists and belongs to the SME
  const existingProject = await db
    .prepare('SELECT * FROM projects WHERE id = ? AND sme_id = ?')
    .bind(projectId, smeId)
    .first<Project>();

  if (!existingProject) {
    throw new Error('Project not found or you do not have permission to update it');
  }

  const now = new Date().toISOString();
  
  // Build update query dynamically based on provided fields
  const updateFields = [];
  const values = [];
  
  if (projectData.title !== undefined) {
    updateFields.push('title = ?');
    values.push(projectData.title);
  }
  
  if (projectData.description !== undefined) {
    updateFields.push('description = ?');
    values.push(projectData.description);
  }
  
  if (projectData.requirements !== undefined) {
    updateFields.push('requirements = ?');
    values.push(projectData.requirements);
  }
  
  if (projectData.budget !== undefined) {
    updateFields.push('budget = ?');
    values.push(projectData.budget);
  }
  
  if (projectData.deadline !== undefined) {
    updateFields.push('deadline = ?');
    values.push(projectData.deadline);
  }
  
  if (projectData.status !== undefined) {
    updateFields.push('status = ?');
    values.push(projectData.status);
  }
  
  // Always update the updated_at timestamp
  updateFields.push('updated_at = ?');
  values.push(now);
  
  // Add project ID as the last parameter
  values.push(projectId);
  
  // Execute update query
  await db
    .prepare(`UPDATE projects SET ${updateFields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  // Get updated project
  const updatedProject = await db
    .prepare('SELECT * FROM projects WHERE id = ?')
    .bind(projectId)
    .first<Project>();

  if (!updatedProject) {
    throw new Error('Failed to update project');
  }

  return updatedProject;
}

export async function getProject(
  db: D1Database,
  projectId: string
): Promise<Project> {
  const project = await db
    .prepare('SELECT * FROM projects WHERE id = ?')
    .bind(projectId)
    .first<Project>();

  if (!project) {
    throw new Error('Project not found');
  }

  return project;
}

export async function listProjects(
  db: D1Database,
  smeId: string,
  status?: string,
  page = 1,
  pageSize = 10
): Promise<{ projects: Project[]; total: number }> {
  const offset = (page - 1) * pageSize;
  
  // Build query conditions
  let whereClause = 'WHERE sme_id = ?';
  const values = [smeId];
  
  if (status) {
    whereClause += ' AND status = ?';
    values.push(status);
  }
  
  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM projects ${whereClause}`;
  const countResult = await db
    .prepare(countQuery)
    .bind(...values)
    .first<{ total: number }>();
  
  const total = countResult?.total || 0;
  
  // Get projects with pagination
  const query = `
    SELECT * FROM projects 
    ${whereClause} 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `;
  
  const projectsResult = await db
    .prepare(query)
    .bind(...values, pageSize, offset)
    .all<Project>();
  
  return {
    projects: projectsResult.results,
    total
  };
}

export async function deleteProject(
  db: D1Database,
  projectId: string,
  smeId: string
): Promise<boolean> {
  // Check if project exists and belongs to the SME
  const existingProject = await db
    .prepare('SELECT * FROM projects WHERE id = ? AND sme_id = ?')
    .bind(projectId, smeId)
    .first<Project>();

  if (!existingProject) {
    throw new Error('Project not found or you do not have permission to delete it');
  }

  // Delete project matches first (foreign key constraint)
  await db
    .prepare('DELETE FROM project_matches WHERE project_id = ?')
    .bind(projectId)
    .run();

  // Delete project
  await db
    .prepare('DELETE FROM projects WHERE id = ?')
    .bind(projectId)
    .run();

  return true;
}

export async function getProjectMatches(
  db: D1Database,
  projectId: string,
  smeId: string
): Promise<ProjectMatch[]> {
  // Check if project exists and belongs to the SME
  const existingProject = await db
    .prepare('SELECT * FROM projects WHERE id = ? AND sme_id = ?')
    .bind(projectId, smeId)
    .first<Project>();

  if (!existingProject) {
    throw new Error('Project not found or you do not have permission to access it');
  }

  // Get project matches
  const matchesResult = await db
    .prepare('SELECT * FROM project_matches WHERE project_id = ? ORDER BY match_score DESC')
    .bind(projectId)
    .all<ProjectMatch>();
  
  return matchesResult.results;
}

export async function getConsultantMatches(
  db: D1Database,
  consultantId: string,
  status?: string,
  page = 1,
  pageSize = 10
): Promise<{ matches: (ProjectMatch & { project: Project })[]; total: number }> {
  const offset = (page - 1) * pageSize;
  
  // Build query conditions
  let whereClause = 'WHERE pm.consultant_id = ?';
  const values = [consultantId];
  
  if (status) {
    whereClause += ' AND pm.status = ?';
    values.push(status);
  }
  
  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM project_matches pm
    ${whereClause}
  `;
  
  const countResult = await db
    .prepare(countQuery)
    .bind(...values)
    .first<{ total: number }>();
  
  const total = countResult?.total || 0;
  
  // Get matches with projects
  const query = `
    SELECT pm.*, p.* 
    FROM project_matches pm
    JOIN projects p ON pm.project_id = p.id
    ${whereClause}
    ORDER BY pm.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  const matchesResult = await db
    .prepare(query)
    .bind(...values, pageSize, offset)
    .all();
  
  // Process results to create proper objects
  const matches = matchesResult.results.map(row => {
    const match: ProjectMatch = {
      id: row.id,
      project_id: row.project_id,
      consultant_id: row.consultant_id,
      match_score: row.match_score,
      status: row.status,
      proposal: row.proposal,
      price: row.price,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
    
    const project: Project = {
      id: row.project_id,
      sme_id: row.sme_id,
      title: row.title,
      description: row.description,
      requirements: row.requirements,
      budget: row.budget,
      deadline: row.deadline,
      status: row.status,
      created_at: row.p_created_at,
      updated_at: row.p_updated_at
    };
    
    return { ...match, project };
  });
  
  return {
    matches,
    total
  };
}

export async function submitProposal(
  db: D1Database,
  matchId: string,
  consultantId: string,
  proposal: string,
  price: number
): Promise<ProjectMatch> {
  // Check if match exists and belongs to the consultant
  const existingMatch = await db
    .prepare('SELECT * FROM project_matches WHERE id = ? AND consultant_id = ?')
    .bind(matchId, consultantId)
    .first<ProjectMatch>();

  if (!existingMatch) {
    throw new Error('Match not found or you do not have permission to submit a proposal');
  }

  if (existingMatch.status !== 'pending') {
    throw new Error('Cannot submit proposal for a match that is not pending');
  }

  const now = new Date().toISOString();

  // Update match with proposal
  await db
    .prepare('UPDATE project_matches SET proposal = ?, price = ?, updated_at = ? WHERE id = ?')
    .bind(proposal, price, now, matchId)
    .run();

  // Get updated match
  const updatedMatch = await db
    .prepare('SELECT * FROM project_matches WHERE id = ?')
    .bind(matchId)
    .first<ProjectMatch>();

  if (!updatedMatch) {
    throw new Error('Failed to update match');
  }

  return updatedMatch;
}

export async function updateMatchStatus(
  db: D1Database,
  matchId: string,
  smeId: string,
  status: 'accepted' | 'rejected' | 'completed'
): Promise<ProjectMatch> {
  // Check if match exists and belongs to the SME's project
  const matchQuery = `
    SELECT pm.* 
    FROM project_matches pm
    JOIN projects p ON pm.project_id = p.id
    WHERE pm.id = ? AND p.sme_id = ?
  `;
  
  const existingMatch = await db
    .prepare(matchQuery)
    .bind(matchId, smeId)
    .first<ProjectMatch>();

  if (!existingMatch) {
    throw new Error('Match not found or you do not have permission to update it');
  }

  const now = new Date().toISOString();

  // Update match status
  await db
    .prepare('UPDATE project_matches SET status = ?, updated_at = ? WHERE id = ?')
    .bind(status, now, matchId)
    .run();

  // If status is 'accepted', update project status to 'in_progress'
  if (status === 'accepted') {
    await db
      .prepare('UPDATE projects SET status = ?, updated_at = ? WHERE id = ?')
      .bind('in_progress', now, existingMatch.project_id)
      .run();
    
    // Reject all other pending matches for this project
    await db
      .prepare('UPDATE project_matches SET status = ?, updated_at = ? WHERE project_id = ? AND id != ? AND status = ?')
      .bind('rejected', now, existingMatch.project_id, matchId, 'pending')
      .run();
  }
  
  // If status is 'completed', update project status to 'completed'
  if (status === 'completed') {
    await db
      .prepare('UPDATE projects SET status = ?, updated_at = ? WHERE id = ?')
      .bind('completed', now, existingMatch.project_id)
      .run();
  }

  // Get updated match
  const updatedMatch = await db
    .prepare('SELECT * FROM project_matches WHERE id = ?')
    .bind(matchId)
    .first<ProjectMatch>();

  if (!updatedMatch) {
    throw new Error('Failed to update match');
  }

  return updatedMatch;
}

// AI-based matching algorithm
async function generateProjectMatches(
  db: D1Database,
  project: Project
): Promise<void> {
  // Get all consultants
  const consultantsResult = await db
    .prepare('SELECT * FROM consultant_profiles')
    .all<any>();
  
  const consultants = consultantsResult.results.map(profile => ({
    ...profile,
    expertise: JSON.parse(profile.expertise),
    languages: JSON.parse(profile.languages)
  }));
  
  // Extract keywords from project
  const projectKeywords = extractKeywords(project.title + ' ' + project.description + ' ' + project.requirements);
  
  // Calculate match scores for each consultant
  const matches = [];
  
  for (const consultant of consultants) {
    // Calculate match score based on expertise match, experience, and other factors
    const expertiseMatch = calculateExpertiseMatch(consultant.expertise, projectKeywords);
    const experienceScore = calculateExperienceScore(consultant.experience_years);
    
    // Weighted scoring
    const matchScore = (
      expertiseMatch * 0.6 + // 60% weight on expertise match
      experienceScore * 0.4   // 40% weight on experience
    );
    
    // Only include consultants with a minimum match score
    if (matchScore >= 0.3) {
      matches.push({
        consultant_id: consultant.id,
        match_score: Math.round(matchScore * 100) / 100, // Round to 2 decimal places
      });
    }
  }
  
  // Sort matches by score (highest first)
  matches.sort((a, b) => b.match_score - a.match_score);
  
  // Take top matches (limit to 10)
  const topMatches = matches.slice(0, 10);
  
  // Insert matches into database
  const now = new Date().toISOString();
  
  for (const match of topMatches) {
    const matchId = nanoid();
    
    await db
      .prepare(
        `INSERT INTO project_matches (
          id, project_id, consultant_id, match_score, status, 
          proposal, price, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        matchId,
        project.id,
        match.consultant_id,
        match.match_score,
        'pending',
        null,
        null,
        now,
        now
      )
      .run();
  }
}

// Helper function to extract keywords from text
function extractKeywords(text: string): string[] {
  // In a real implementation, this would use NLP techniques
  // For this example, we'll use a simple approach
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  // Remove duplicates
  return [...new Set(words)];
}

// Helper function to calculate expertise match
function calculateExpertiseMatch(expertise: string[], projectKeywords: string[]): number {
  // Convert expertise to lowercase for case-insensitive matching
  const lowerExpertise = expertise.map(e => e.toLowerCase());
  
  // Count how many project keywords match the consultant's expertise
  let matches = 0;
  
  for (const keyword of projectKeywords) {
    for (const exp of lowerExpertise) {
      if (exp.includes(keyword) || keyword.includes(exp)) {
        matches++;
        break;
      }
    }
  }
  
  // Calculate match percentage
  return projectKeywords.length > 0 ? matches / projectKeywords.length : 0;
}

// Helper function to calculate experience score
function calculateExperienceScore(experienceYears: number): number {
  // Simple scoring based on years of experience
  if (experienceYears >= 15) return 1.0;
  if (experienceYears >= 10) return 0.9;
  if (experienceYears >= 7) return 0.8;
  if (experienceYears >= 5) return 0.7;
  if (experienceYears >= 3) return 0.6;
  if (experienceYears >= 1) return 0.5;
  return 0.3;
}
