import { D1Database } from '@cloudflare/workers-types';
import { nanoid } from 'nanoid';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'sme' | 'consultant';
  content: string;
  attachments: string[] | null; // Stored as JSON
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  sme_id: string;
  consultant_id: string;
  project_id: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export async function getOrCreateConversation(
  db: D1Database,
  smeId: string,
  consultantId: string,
  projectId: string | null = null
): Promise<Conversation> {
  // Check if conversation already exists
  const existingConversation = await db
    .prepare('SELECT * FROM conversations WHERE sme_id = ? AND consultant_id = ?')
    .bind(smeId, consultantId)
    .first<Conversation>();

  if (existingConversation) {
    return existingConversation;
  }

  // Create new conversation
  const conversationId = nanoid();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO conversations (
        id, sme_id, consultant_id, project_id, last_message_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      conversationId,
      smeId,
      consultantId,
      projectId,
      now,
      now,
      now
    )
    .run();

  // Get created conversation
  const conversation = await db
    .prepare('SELECT * FROM conversations WHERE id = ?')
    .bind(conversationId)
    .first<Conversation>();

  if (!conversation) {
    throw new Error('Failed to create conversation');
  }

  return conversation;
}

export async function sendMessage(
  db: D1Database,
  conversationId: string,
  senderId: string,
  senderType: 'sme' | 'consultant',
  content: string,
  attachments: string[] | null = null
): Promise<Message> {
  // Check if conversation exists
  const conversation = await db
    .prepare('SELECT * FROM conversations WHERE id = ?')
    .bind(conversationId)
    .first<Conversation>();

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Verify sender is part of the conversation
  if (
    (senderType === 'sme' && conversation.sme_id !== senderId) ||
    (senderType === 'consultant' && conversation.consultant_id !== senderId)
  ) {
    throw new Error('You are not part of this conversation');
  }

  // Create message
  const messageId = nanoid();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO messages (
        id, conversation_id, sender_id, sender_type, content, 
        attachments, read, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      messageId,
      conversationId,
      senderId,
      senderType,
      content,
      attachments ? JSON.stringify(attachments) : null,
      false,
      now,
      now
    )
    .run();

  // Update conversation last_message_at
  await db
    .prepare('UPDATE conversations SET last_message_at = ?, updated_at = ? WHERE id = ?')
    .bind(now, now, conversationId)
    .run();

  // Get created message
  const message = await db
    .prepare('SELECT * FROM messages WHERE id = ?')
    .bind(messageId)
    .first<any>();

  if (!message) {
    throw new Error('Failed to create message');
  }

  return {
    ...message,
    attachments: message.attachments ? JSON.parse(message.attachments) : null
  };
}

export async function getConversationMessages(
  db: D1Database,
  conversationId: string,
  userId: string,
  userType: 'sme' | 'consultant',
  page = 1,
  pageSize = 20
): Promise<{ messages: Message[]; total: number }> {
  // Check if conversation exists and user is part of it
  const conversation = await db
    .prepare('SELECT * FROM conversations WHERE id = ?')
    .bind(conversationId)
    .first<Conversation>();

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (
    (userType === 'sme' && conversation.sme_id !== userId) ||
    (userType === 'consultant' && conversation.consultant_id !== userId)
  ) {
    throw new Error('You are not part of this conversation');
  }

  const offset = (page - 1) * pageSize;

  // Get total count
  const countQuery = `SELECT COUNT(*) as total FROM messages WHERE conversation_id = ?`;
  const countResult = await db
    .prepare(countQuery)
    .bind(conversationId)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  // Get messages with pagination, ordered by newest first
  const query = `
    SELECT * FROM messages 
    WHERE conversation_id = ? 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `;

  const messagesResult = await db
    .prepare(query)
    .bind(conversationId, pageSize, offset)
    .all<any>();

  // Mark unread messages as read
  const now = new Date().toISOString();
  await db
    .prepare(`
      UPDATE messages 
      SET read = ?, updated_at = ? 
      WHERE conversation_id = ? AND sender_id != ? AND read = ?
    `)
    .bind(true, now, conversationId, userId, false)
    .run();

  // Parse attachments JSON
  const messages = messagesResult.results.map(message => ({
    ...message,
    attachments: message.attachments ? JSON.parse(message.attachments) : null
  }));

  return {
    messages,
    total
  };
}

export async function getUserConversations(
  db: D1Database,
  userId: string,
  userType: 'sme' | 'consultant',
  page = 1,
  pageSize = 10
): Promise<{ conversations: any[]; total: number }> {
  const offset = (page - 1) * pageSize;

  // Build query conditions based on user type
  let whereClause, countQuery, query;
  const values = [userId];

  if (userType === 'sme') {
    whereClause = 'WHERE c.sme_id = ?';
  } else {
    whereClause = 'WHERE c.consultant_id = ?';
  }

  // Get total count
  countQuery = `SELECT COUNT(*) as total FROM conversations c ${whereClause}`;
  const countResult = await db
    .prepare(countQuery)
    .bind(...values)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  // Get conversations with last message and other party's info
  if (userType === 'sme') {
    query = `
      SELECT 
        c.*, 
        cp.full_name as other_party_name,
        cp.id as other_party_id,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.read = false) as unread_count,
        (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message
      FROM conversations c
      JOIN consultant_profiles cp ON c.consultant_id = cp.id
      ${whereClause}
      ORDER BY c.last_message_at DESC
      LIMIT ? OFFSET ?
    `;
  } else {
    query = `
      SELECT 
        c.*, 
        sp.company_name as other_party_name,
        sp.id as other_party_id,
        (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.read = false) as unread_count,
        (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message
      FROM conversations c
      JOIN sme_profiles sp ON c.sme_id = sp.id
      ${whereClause}
      ORDER BY c.last_message_at DESC
      LIMIT ? OFFSET ?
    `;
  }

  const conversationsResult = await db
    .prepare(query)
    .bind(...values, pageSize, offset)
    .all();

  return {
    conversations: conversationsResult.results,
    total
  };
}

export async function getUnreadMessageCount(
  db: D1Database,
  userId: string,
  userType: 'sme' | 'consultant'
): Promise<number> {
  let query;
  
  if (userType === 'sme') {
    query = `
      SELECT COUNT(*) as count
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.sme_id = ? AND m.sender_id != ? AND m.read = false
    `;
  } else {
    query = `
      SELECT COUNT(*) as count
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.consultant_id = ? AND m.sender_id != ? AND m.read = false
    `;
  }
  
  const result = await db
    .prepare(query)
    .bind(userId, userId)
    .first<{ count: number }>();
    
  return result?.count || 0;
}

export async function deleteMessage(
  db: D1Database,
  messageId: string,
  userId: string
): Promise<boolean> {
  // Check if message exists and belongs to the user
  const message = await db
    .prepare(`
      SELECT m.* 
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = ? AND (
        (m.sender_id = ?) OR 
        (c.sme_id = ? OR c.consultant_id = ?)
      )
    `)
    .bind(messageId, userId, userId, userId)
    .first<Message>();

  if (!message) {
    throw new Error('Message not found or you do not have permission to delete it');
  }

  // Only allow deletion if the user is the sender or it's within 24 hours
  const messageTime = new Date(message.created_at).getTime();
  const now = new Date().getTime();
  const hoursDiff = (now - messageTime) / (1000 * 60 * 60);
  
  if (message.sender_id !== userId && hoursDiff > 24) {
    throw new Error('You can only delete messages sent by others within 24 hours');
  }

  // Delete message
  await db
    .prepare('DELETE FROM messages WHERE id = ?')
    .bind(messageId)
    .run();

  return true;
}
