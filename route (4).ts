import { D1Database } from '@cloudflare/workers-types';
import { NextRequest, NextResponse } from 'next/server';
import { 
  createProject,
  updateProject,
  getProject,
  listProjects,
  deleteProject,
  getProjectMatches,
  getConsultantMatches,
  submitProposal,
  updateMatchStatus
} from '@/lib/projects';

export async function POST(request: NextRequest) {
  try {
    const db = (request.env as any).DB as D1Database;
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create-project':
        const { smeId, projectData } = body;
        const project = await createProject(db, smeId, projectData);
        return NextResponse.json(project);

      case 'update-project':
        const { projectId, smeId: updateSmeId, projectData: updateData } = body;
        const updatedProject = await updateProject(db, projectId, updateSmeId, updateData);
        return NextResponse.json(updatedProject);

      case 'get-project':
        const { projectId: getProjectId } = body;
        const retrievedProject = await getProject(db, getProjectId);
        return NextResponse.json(retrievedProject);

      case 'list-projects':
        const { smeId: listSmeId, status, page, pageSize } = body;
        const projects = await listProjects(db, listSmeId, status, page, pageSize);
        return NextResponse.json(projects);

      case 'delete-project':
        const { projectId: deleteProjectId, smeId: deleteSmeId } = body;
        const deleteResult = await deleteProject(db, deleteProjectId, deleteSmeId);
        return NextResponse.json({ success: deleteResult });

      case 'get-project-matches':
        const { projectId: matchesProjectId, smeId: matchesSmeId } = body;
        const matches = await getProjectMatches(db, matchesProjectId, matchesSmeId);
        return NextResponse.json(matches);

      case 'get-consultant-matches':
        const { consultantId, status: matchStatus, page: matchPage, pageSize: matchPageSize } = body;
        const consultantMatches = await getConsultantMatches(db, consultantId, matchStatus, matchPage, matchPageSize);
        return NextResponse.json(consultantMatches);

      case 'submit-proposal':
        const { matchId, consultantId: proposalConsultantId, proposal, price } = body;
        const submittedProposal = await submitProposal(db, matchId, proposalConsultantId, proposal, price);
        return NextResponse.json(submittedProposal);

      case 'update-match-status':
        const { matchId: statusMatchId, smeId: statusSmeId, status: newStatus } = body;
        const updatedMatch = await updateMatchStatus(db, statusMatchId, statusSmeId, newStatus);
        return NextResponse.json(updatedMatch);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
