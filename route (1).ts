import { D1Database } from '@cloudflare/workers-types';
import { NextRequest, NextResponse } from 'next/server';
import { 
  createToolkit,
  updateToolkit,
  getToolkit,
  listToolkits,
  deleteToolkit,
  purchaseToolkit,
  reviewToolkit,
  getToolkitReviews,
  getUserPurchasedToolkits,
  getConsultantToolkits
} from '@/lib/toolkits';

export async function POST(request: NextRequest) {
  try {
    const db = (request.env as any).DB as D1Database;
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'create-toolkit':
        const { consultantId, toolkitData } = body;
        const toolkit = await createToolkit(db, consultantId, toolkitData);
        return NextResponse.json(toolkit);

      case 'update-toolkit':
        const { toolkitId, consultantId: updateConsultantId, toolkitData: updateData } = body;
        const updatedToolkit = await updateToolkit(db, toolkitId, updateConsultantId, updateData);
        return NextResponse.json(updatedToolkit);

      case 'get-toolkit':
        const { toolkitId: getToolkitId } = body;
        const retrievedToolkit = await getToolkit(db, getToolkitId);
        return NextResponse.json(retrievedToolkit);

      case 'list-toolkits':
        const { filters, page, pageSize } = body;
        const toolkits = await listToolkits(db, filters, page, pageSize);
        return NextResponse.json(toolkits);

      case 'delete-toolkit':
        const { toolkitId: deleteToolkitId, consultantId: deleteConsultantId } = body;
        const deleteResult = await deleteToolkit(db, deleteToolkitId, deleteConsultantId);
        return NextResponse.json({ success: deleteResult });

      case 'purchase-toolkit':
        const { toolkitId: purchaseToolkitId, smeId, stripePaymentId } = body;
        const purchase = await purchaseToolkit(db, purchaseToolkitId, smeId, stripePaymentId);
        return NextResponse.json(purchase);

      case 'review-toolkit':
        const { toolkitId: reviewToolkitId, smeId: reviewSmeId, rating, comment } = body;
        const review = await reviewToolkit(db, reviewToolkitId, reviewSmeId, rating, comment);
        return NextResponse.json(review);

      case 'get-toolkit-reviews':
        const { toolkitId: reviewsToolkitId, page: reviewsPage, pageSize: reviewsPageSize } = body;
        const reviews = await getToolkitReviews(db, reviewsToolkitId, reviewsPage, reviewsPageSize);
        return NextResponse.json(reviews);

      case 'get-user-purchased-toolkits':
        const { smeId: purchasedSmeId, page: purchasedPage, pageSize: purchasedPageSize } = body;
        const purchasedToolkits = await getUserPurchasedToolkits(db, purchasedSmeId, purchasedPage, purchasedPageSize);
        return NextResponse.json(purchasedToolkits);

      case 'get-consultant-toolkits':
        const { consultantId: toolkitsConsultantId, page: consultantPage, pageSize: consultantPageSize } = body;
        const consultantToolkits = await getConsultantToolkits(db, toolkitsConsultantId, consultantPage, consultantPageSize);
        return NextResponse.json(consultantToolkits);

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
