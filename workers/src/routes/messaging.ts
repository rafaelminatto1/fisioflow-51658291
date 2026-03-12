import { Hono } from 'hono';
import type { Env } from '../types/env';
import { requireAuth, type AuthVariables } from '../lib/auth';
import { createPool } from '../lib/db';

const app = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

app.use('*', requireAuth);

/**
 * Get all conversations for the authenticated user
 */
app.get('/conversations', async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);

  // Note: This logic assumes a 'conversations' table or deriving from 'messages'
  // For now, we'll derive active conversations from the messages table
  const result = await pool.query(
    `
    WITH user_messages AS (
      SELECT *
      FROM messages
      WHERE sender_id = $1 OR recipient_id = $1
    ),
    conversation_list AS (
      SELECT DISTINCT
        CASE WHEN sender_id = $1 THEN recipient_id ELSE sender_id END AS participant_id,
        MAX(created_at) as last_message_at
      FROM user_messages
      GROUP BY 1
    )
    SELECT 
      cl.participant_id,
      cl.last_message_at,
      p.full_name as participant_name,
      p.name as participant_short_name,
      p.role as participant_role,
      (SELECT content FROM messages 
       WHERE (sender_id = $1 AND recipient_id = cl.participant_id) 
          OR (sender_id = cl.participant_id AND recipient_id = $1)
       ORDER BY created_at DESC LIMIT 1) as last_message_content
    FROM conversation_list cl
    LEFT JOIN profiles p ON p.user_id = cl.participant_id
    ORDER BY cl.last_message_at DESC
    `,
    [user.uid]
  );

  const conversations = result.rows.map(row => ({
    id: row.participant_id, // Simple conversation ID for 1:1 chats
    participantIds: [user.uid, row.participant_id],
    participantNames: {
      [row.participant_id]: row.participant_name || row.participant_short_name || 'Usuário'
    },
    lastMessage: {
      content: row.last_message_content || '',
      senderId: row.participant_id, // This is a simplification
      createdAt: row.last_message_at
    },
    unreadCount: { [user.uid]: 0 }, // We'll need a way to track this in the DB
    updatedAt: row.last_message_at
  }));

  return c.json({ data: conversations });
});

/**
 * Get messages for a specific conversation
 */
app.get('/conversations/:participantId/messages', async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const participantId = c.req.param('participantId');
  const limit = parseInt(c.req.query('limit') || '50');

  const result = await pool.query(
    `
    SELECT *
    FROM messages
    WHERE (sender_id = $1 AND recipient_id = $2)
       OR (sender_id = $2 AND recipient_id = $1)
    ORDER BY created_at DESC
    LIMIT $3
    `,
    [user.uid, participantId, limit]
  );

  return c.json({ data: result.rows.reverse() });
});

/**
 * Send a message
 */
app.post('/messages', async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const body = await c.req.json();

  const { recipientId, content, type = 'text', attachmentUrl, attachmentName } = body;

  if (!recipientId || !content) {
    return c.json({ error: 'recipientId e content são obrigatórios' }, 400);
  }

  const result = await pool.query(
    `
    INSERT INTO messages (
      sender_id,
      recipient_id,
      content,
      type,
      attachment_url,
      attachment_name,
      status,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, 'sent', NOW())
    RETURNING *
    `,
    [user.uid, recipientId, content, type, attachmentUrl || null, attachmentName || null]
  );

  return c.json({ data: result.rows[0] }, 201);
});

/**
 * Mark messages as read in a conversation
 */
app.post('/conversations/:participantId/read', async (c) => {
  const user = c.get('user');
  const pool = createPool(c.env);
  const participantId = c.req.param('participantId');

  await pool.query(
    `
    UPDATE messages
    SET status = 'read', read_at = NOW()
    WHERE sender_id = $1 AND recipient_id = $2 AND status != 'read'
    `,
    [participantId, user.uid]
  );

  return c.json({ success: true });
});

export { app as messagingRoutes };
