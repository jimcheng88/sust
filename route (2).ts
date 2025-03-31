import { D1Database } from '@cloudflare/workers-types';
import { NextRequest, NextResponse } from 'next/server';
import { 
  getOrCreateConversation,
  sendMessage,
  getConversationMessages,
  getUserConversations,
  getUnreadMessageCount,
  deleteMessage
} from '@/lib/messaging';

export async function POST(request: NextRequest) {
  try {
    const db = (request.env as any).DB as D1Database;
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'get-or-create-conversation':
        const { smeId, consultantId, projectId } = body;
        const conversation = await getOrCreateConversation(db, smeId, consultantId, projectId);
        return NextResponse.json(conversation);

      case 'send-message':
        const { conversationId, senderId, senderType, content, attachments } = body;
        const message = await sendMessage(db, conversationId, senderId, senderType, content, attachments);
        return NextResponse.json(message);

      case 'get-conversation-messages':
        const { conversationId: getConvId, userId, userType, page, pageSize } = body;
        const messages = await getConversationMessages(db, getConvId, userId, userType, page, pageSize);
        return NextResponse.json(messages);

      case 'get-user-conversations':
        const { userId: getUserConvId, userType: getUserConvType, page: convPage, pageSize: convPageSize } = body;
        const conversations = await getUserConversations(db, getUserConvId, getUserConvType, convPage, convPageSize);
        return NextResponse.json(conversations);

      case 'get-unread-message-count':
        const { userId: unreadUserId, userType: unreadUserType } = body;
        const unreadCount = await getUnreadMessageCount(db, unreadUserId, unreadUserType);
        return NextResponse.json({ count: unreadCount });

      case 'delete-message':
        const { messageId, userId: deleteUserId } = body;
        const deleteResult = await deleteMessage(db, messageId, deleteUserId);
        return NextResponse.json({ success: deleteResult });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
