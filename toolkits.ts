import { D1Database } from '@cloudflare/workers-types';
import { nanoid } from 'nanoid';

export interface Toolkit {
  id: string;
  consultant_id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  file_urls: string[]; // Stored as JSON
  preview_url: string | null;
  downloads: number;
  rating: number | null;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface ToolkitPurchase {
  id: string;
  toolkit_id: string;
  sme_id: string;
  price: number;
  stripe_payment_id: string | null;
  status: 'pending' | 'completed' | 'refunded';
  created_at: string;
  updated_at: string;
}

export interface ToolkitReview {
  id: string;
  toolkit_id: string;
  sme_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export async function createToolkit(
  db: D1Database,
  consultantId: string,
  toolkitData: Omit<Toolkit, 'id' | 'consultant_id' | 'downloads' | 'rating' | 'review_count' | 'created_at' | 'updated_at'>
): Promise<Toolkit> {
  // Generate toolkit ID
  const toolkitId = nanoid();
  const now = new Date().toISOString();

  // Create toolkit
  await db
    .prepare(
      `INSERT INTO toolkits (
        id, consultant_id, title, description, category, price, 
        file_urls, preview_url, downloads, rating, review_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      toolkitId,
      consultantId,
      toolkitData.title,
      toolkitData.description,
      toolkitData.category,
      toolkitData.price,
      JSON.stringify(toolkitData.file_urls),
      toolkitData.preview_url,
      0, // Initial downloads
      null, // Initial rating
      0, // Initial review count
      now,
      now
    )
    .run();

  // Get created toolkit
  const toolkit = await getToolkitWithParsedJson(db, toolkitId);

  if (!toolkit) {
    throw new Error('Failed to create toolkit');
  }

  return toolkit;
}

export async function updateToolkit(
  db: D1Database,
  toolkitId: string,
  consultantId: string,
  toolkitData: Partial<Omit<Toolkit, 'id' | 'consultant_id' | 'downloads' | 'rating' | 'review_count' | 'created_at' | 'updated_at'>>
): Promise<Toolkit> {
  // Check if toolkit exists and belongs to the consultant
  const existingToolkit = await db
    .prepare('SELECT * FROM toolkits WHERE id = ? AND consultant_id = ?')
    .bind(toolkitId, consultantId)
    .first<Toolkit>();

  if (!existingToolkit) {
    throw new Error('Toolkit not found or you do not have permission to update it');
  }

  const now = new Date().toISOString();
  
  // Build update query dynamically based on provided fields
  const updateFields = [];
  const values = [];
  
  if (toolkitData.title !== undefined) {
    updateFields.push('title = ?');
    values.push(toolkitData.title);
  }
  
  if (toolkitData.description !== undefined) {
    updateFields.push('description = ?');
    values.push(toolkitData.description);
  }
  
  if (toolkitData.category !== undefined) {
    updateFields.push('category = ?');
    values.push(toolkitData.category);
  }
  
  if (toolkitData.price !== undefined) {
    updateFields.push('price = ?');
    values.push(toolkitData.price);
  }
  
  if (toolkitData.file_urls !== undefined) {
    updateFields.push('file_urls = ?');
    values.push(JSON.stringify(toolkitData.file_urls));
  }
  
  if (toolkitData.preview_url !== undefined) {
    updateFields.push('preview_url = ?');
    values.push(toolkitData.preview_url);
  }
  
  // Always update the updated_at timestamp
  updateFields.push('updated_at = ?');
  values.push(now);
  
  // Add toolkit ID as the last parameter
  values.push(toolkitId);
  
  // Execute update query
  await db
    .prepare(`UPDATE toolkits SET ${updateFields.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  // Get updated toolkit
  const updatedToolkit = await getToolkitWithParsedJson(db, toolkitId);

  if (!updatedToolkit) {
    throw new Error('Failed to update toolkit');
  }

  return updatedToolkit;
}

export async function getToolkit(
  db: D1Database,
  toolkitId: string
): Promise<Toolkit> {
  return getToolkitWithParsedJson(db, toolkitId);
}

export async function listToolkits(
  db: D1Database,
  filters: {
    category?: string;
    priceMin?: number;
    priceMax?: number;
    consultantId?: string;
    searchTerm?: string;
  } = {},
  page = 1,
  pageSize = 10
): Promise<{ toolkits: (Toolkit & { consultant_name: string })[]; total: number }> {
  const offset = (page - 1) * pageSize;
  
  // Build query conditions based on filters
  const conditions = [];
  const values = [];
  
  if (filters.category) {
    conditions.push("t.category = ?");
    values.push(filters.category);
  }
  
  if (filters.priceMin !== undefined) {
    conditions.push("t.price >= ?");
    values.push(filters.priceMin);
  }
  
  if (filters.priceMax !== undefined) {
    conditions.push("t.price <= ?");
    values.push(filters.priceMax);
  }
  
  if (filters.consultantId) {
    conditions.push("t.consultant_id = ?");
    values.push(filters.consultantId);
  }
  
  if (filters.searchTerm) {
    conditions.push("(t.title LIKE ? OR t.description LIKE ?)");
    values.push(`%${filters.searchTerm}%`);
    values.push(`%${filters.searchTerm}%`);
  }
  
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  
  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM toolkits t 
    ${whereClause}
  `;
  
  const countResult = await db
    .prepare(countQuery)
    .bind(...values)
    .first<{ total: number }>();
  
  const total = countResult?.total || 0;
  
  // Get toolkits with pagination and consultant name
  const query = `
    SELECT t.*, cp.full_name as consultant_name
    FROM toolkits t
    LEFT JOIN consultant_profiles cp ON t.consultant_id = cp.id
    ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  const toolkitsResult = await db
    .prepare(query)
    .bind(...values, pageSize, offset)
    .all<any>();
  
  // Parse file_urls JSON
  const toolkits = toolkitsResult.results.map(toolkit => ({
    ...toolkit,
    file_urls: JSON.parse(toolkit.file_urls)
  }));
  
  return {
    toolkits,
    total
  };
}

export async function deleteToolkit(
  db: D1Database,
  toolkitId: string,
  consultantId: string
): Promise<boolean> {
  // Check if toolkit exists and belongs to the consultant
  const existingToolkit = await db
    .prepare('SELECT * FROM toolkits WHERE id = ? AND consultant_id = ?')
    .bind(toolkitId, consultantId)
    .first<Toolkit>();

  if (!existingToolkit) {
    throw new Error('Toolkit not found or you do not have permission to delete it');
  }

  // Check if toolkit has any purchases
  const purchaseCount = await db
    .prepare('SELECT COUNT(*) as count FROM toolkit_purchases WHERE toolkit_id = ?')
    .bind(toolkitId)
    .first<{ count: number }>();

  if (purchaseCount && purchaseCount.count > 0) {
    throw new Error('Cannot delete toolkit with existing purchases');
  }

  // Delete toolkit reviews first (foreign key constraint)
  await db
    .prepare('DELETE FROM toolkit_reviews WHERE toolkit_id = ?')
    .bind(toolkitId)
    .run();

  // Delete toolkit
  await db
    .prepare('DELETE FROM toolkits WHERE id = ?')
    .bind(toolkitId)
    .run();

  return true;
}

export async function purchaseToolkit(
  db: D1Database,
  toolkitId: string,
  smeId: string,
  stripePaymentId: string | null = null
): Promise<ToolkitPurchase> {
  // Check if toolkit exists
  const toolkit = await getToolkitWithParsedJson(db, toolkitId);

  if (!toolkit) {
    throw new Error('Toolkit not found');
  }

  // Check if already purchased
  const existingPurchase = await db
    .prepare('SELECT * FROM toolkit_purchases WHERE toolkit_id = ? AND sme_id = ?')
    .bind(toolkitId, smeId)
    .first<ToolkitPurchase>();

  if (existingPurchase) {
    throw new Error('You have already purchased this toolkit');
  }

  // Create purchase record
  const purchaseId = nanoid();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO toolkit_purchases (
        id, toolkit_id, sme_id, price, stripe_payment_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      purchaseId,
      toolkitId,
      smeId,
      toolkit.price,
      stripePaymentId,
      stripePaymentId ? 'completed' : 'pending',
      now,
      now
    )
    .run();

  // If payment is completed, increment download count
  if (stripePaymentId) {
    await db
      .prepare('UPDATE toolkits SET downloads = downloads + 1 WHERE id = ?')
      .bind(toolkitId)
      .run();
  }

  // Get created purchase
  const purchase = await db
    .prepare('SELECT * FROM toolkit_purchases WHERE id = ?')
    .bind(purchaseId)
    .first<ToolkitPurchase>();

  if (!purchase) {
    throw new Error('Failed to create purchase');
  }

  return purchase;
}

export async function reviewToolkit(
  db: D1Database,
  toolkitId: string,
  smeId: string,
  rating: number,
  comment: string | null = null
): Promise<ToolkitReview> {
  // Check if toolkit exists
  const toolkit = await getToolkitWithParsedJson(db, toolkitId);

  if (!toolkit) {
    throw new Error('Toolkit not found');
  }

  // Check if purchased
  const purchase = await db
    .prepare('SELECT * FROM toolkit_purchases WHERE toolkit_id = ? AND sme_id = ? AND status = ?')
    .bind(toolkitId, smeId, 'completed')
    .first<ToolkitPurchase>();

  if (!purchase) {
    throw new Error('You must purchase this toolkit before reviewing it');
  }

  // Check if already reviewed
  const existingReview = await db
    .prepare('SELECT * FROM toolkit_reviews WHERE toolkit_id = ? AND sme_id = ?')
    .bind(toolkitId, smeId)
    .first<ToolkitReview>();

  const now = new Date().toISOString();

  if (existingReview) {
    // Update existing review
    await db
      .prepare('UPDATE toolkit_reviews SET rating = ?, comment = ?, updated_at = ? WHERE id = ?')
      .bind(rating, comment, now, existingReview.id)
      .run();

    // Get updated review
    const updatedReview = await db
      .prepare('SELECT * FROM toolkit_reviews WHERE id = ?')
      .bind(existingReview.id)
      .first<ToolkitReview>();

    if (!updatedReview) {
      throw new Error('Failed to update review');
    }

    // Update toolkit rating
    await updateToolkitRating(db, toolkitId);

    return updatedReview;
  } else {
    // Create new review
    const reviewId = nanoid();

    await db
      .prepare(
        `INSERT INTO toolkit_reviews (
          id, toolkit_id, sme_id, rating, comment, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        reviewId,
        toolkitId,
        smeId,
        rating,
        comment,
        now,
        now
      )
      .run();

    // Get created review
    const review = await db
      .prepare('SELECT * FROM toolkit_reviews WHERE id = ?')
      .bind(reviewId)
      .first<ToolkitReview>();

    if (!review) {
      throw new Error('Failed to create review');
    }

    // Update toolkit rating
    await updateToolkitRating(db, toolkitId);

    return review;
  }
}

export async function getToolkitReviews(
  db: D1Database,
  toolkitId: string,
  page = 1,
  pageSize = 10
): Promise<{ reviews: (ToolkitReview & { sme_name: string })[]; total: number }> {
  const offset = (page - 1) * pageSize;
  
  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM toolkit_reviews WHERE toolkit_id = ?`;
  const countResult = await db
    .prepare(countQuery)
    .bind(toolkitId)
    .first<{ total: number }>();
  
  const total = countResult?.total || 0;
  
  // Get reviews with pagination and SME name
  const query = `
    SELECT tr.*, sp.company_name as sme_name
    FROM toolkit_reviews tr
    LEFT JOIN sme_profiles sp ON tr.sme_id = sp.id
    WHERE tr.toolkit_id = ?
    ORDER BY tr.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  const reviewsResult = await db
    .prepare(query)
    .bind(toolkitId, pageSize, offset)
    .all<any>();
  
  return {
    reviews: reviewsResult.results,
    total
  };
}

export async function getUserPurchasedToolkits(
  db: D1Database,
  smeId: string,
  page = 1,
  pageSize = 10
): Promise<{ toolkits: (Toolkit & { consultant_name: string; purchase_date: string })[]; total: number }> {
  const offset = (page - 1) * pageSize;
  
  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM toolkit_purchases tp
    WHERE tp.sme_id = ? AND tp.status = ?
  `;
  
  const countResult = await db
    .prepare(countQuery)
    .bind(smeId, 'completed')
    .first<{ total: number }>();
  
  const total = countResult?.total || 0;
  
  // Get purchased toolkits with pagination
  const query = `
    SELECT t.*, cp.full_name as consultant_name, tp.created_at as purchase_date
    FROM toolkit_purchases tp
    JOIN toolkits t ON tp.toolkit_id = t.id
    LEFT JOIN consultant_profiles cp ON t.consultant_id = cp.id
    WHERE tp.sme_id = ? AND tp.status = ?
    ORDER BY tp.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  const toolkitsResult = await db
    .prepare(query)
    .bind(smeId, 'completed', pageSize, offset)
    .all<any>();
  
  // Parse file_urls JSON
  const toolkits = toolkitsResult.results.map(toolkit => ({
    ...toolkit,
    file_urls: JSON.parse(toolkit.file_urls)
  }));
  
  return {
    toolkits,
    total
  };
}

export async function getConsultantToolkits(
  db: D1Database,
  consultantId: string,
  page = 1,
  pageSize = 10
): Promise<{ toolkits: Toolkit[]; total: number }> {
  const offset = (page - 1) * pageSize;
  
  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM toolkits WHERE consultant_id = ?`;
  const countResult = await db
    .prepare(countQuery)
    .bind(consultantId)
    .first<{ total: number }>();
  
  const total = countResult?.total || 0;
  
  // Get toolkits with pagination
  const query = `
    SELECT * FROM toolkits 
    WHERE consultant_id = ? 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `;
  
  const toolkitsResult = await db
    .prepare(query)
    .bind(consultantId, pageSize, offset)
    .all<any>();
  
  // Parse file_urls JSON
  const toolkits = toolkitsResult.results.map(toolkit => ({
    ...toolkit,
    file_urls: JSON.parse(toolkit.file_urls)
  }));
  
  return {
    toolkits,
    total
  };
}

// Helper function to get toolkit with parsed JSON
async function getToolkitWithParsedJson(
  db: D1Database,
  toolkitId: string
): Promise<Toolkit> {
  const toolkit = await db
    .prepare('SELECT * FROM toolkits WHERE id = ?')
    .bind(toolkitId)
    .first<any>();

  if (!toolkit) {
    throw new Error('Toolkit not found');
  }

  return {
    ...toolkit,
    file_urls: JSON.parse(toolkit.file_urls)
  };
}

// Helper function to update toolkit rating
async function updateToolkitRating(
  db: D1Database,
  toolkitId: string
): Promise<void> {
  // Calculate average rating
  const ratingResult = await db
    .prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM toolkit_reviews WHERE toolkit_id = ?')
    .bind(toolkitId)
    .first<{ avg_rating: number; count: number }>();

  if (!ratingResult) {
    return;
  }

  // Update toolkit rating and review count
  await db
    .prepare('UPDATE toolkits SET rating = ?, review_count = ? WHERE id = ?')
    .bind(
      ratingResult.avg_rating ? Math.round(ratingResult.avg_rating * 10) / 10 : null,
      ratingResult.count,
      toolkitId
    )
    .run();
}
