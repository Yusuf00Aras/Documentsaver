import { query } from '../../shared/utils/connecting.js'

export async function createConversation({ user_id, title = null }) {
  const sql = `
    INSERT INTO conversations (user_id, title)
    VALUES ($1, $2)
    RETURNING id, user_id, title, created_at, updated_at
  `
  const { rows } = await query(sql, [user_id, title])
  return rows[0]
}

export async function addMessage({ conversation_id, user_id, role, content, source_chunks = [] }) {
  const insertSql = `
    INSERT INTO messages (conversation_id, role, content, source_chunks)
    SELECT $1, $2, $3, $4
    WHERE EXISTS (
      SELECT 1 FROM conversations WHERE id = $1 AND user_id = $5
    )
    RETURNING id, conversation_id, role, content, source_chunks, created_at
  `
  const { rows } = await query(insertSql, [conversation_id, role, content, source_chunks, user_id])
  if (rows.length === 0) return null
  await query(`UPDATE conversations SET updated_at = now() WHERE id = $1`, [conversation_id])
  return rows[0]
}

// For the sidebar
export async function listConversations({ user_id }) {
  const sql = `
    SELECT id, title, created_at, updated_at
    FROM conversations
    WHERE user_id = $1
    ORDER BY updated_at DESC
  `
  const { rows } = await query(sql, [user_id])
  return rows
}

// Builds the conversation for each chat
export async function listMessages({ conversation_id, user_id }) {
  const sql = `
    SELECT mess.id, mess.conversation_id, mess.role, mess.content, mess.source_chunks, mess.created_at
    FROM messages mess
    JOIN conversations convers ON convers.id = mess.conversation_id
    WHERE mess.conversation_id = $1 AND convers.user_id = $2
    ORDER BY mess.created_at ASC
  `
  const { rows } = await query(sql, [conversation_id, user_id])
  return rows
}

export async function deleteConversation({ conversation_id, user_id }) {
  const sql = `
    DELETE FROM conversations 
    WHERE id = $1 AND user_id = $2 
    RETURNING id
  `
  const { rows } = await query(sql, [conversation_id, user_id])
  return rows.length > 0
}