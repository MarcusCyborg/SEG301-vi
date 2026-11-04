import { DatabaseSync } from 'node:sqlite';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const now = () => new Date().toISOString();

export async function openDatabase(root) {
  const dataDir = resolve(root, 'data');
  await mkdir(dataDir, { recursive: true });
  const db = new DatabaseSync(resolve(dataDir, 'tutor.sqlite'));
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000');
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`);
  if (!db.prepare('SELECT 1 FROM schema_migrations WHERE version = 1').get()) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(`
        CREATE TABLE conversations (
          id TEXT PRIMARY KEY, title TEXT NOT NULL, selected_leaf_id TEXT,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE messages (
          id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          parent_id TEXT REFERENCES messages(id) ON DELETE SET NULL,
          role TEXT NOT NULL CHECK(role IN ('user','assistant')),
          content TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'complete',
          context_json TEXT, model TEXT, effort TEXT, usage_json TEXT,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE INDEX messages_conversation ON messages(conversation_id);
        CREATE TABLE generations (
          id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          user_message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
          assistant_message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
          idempotency_key TEXT NOT NULL UNIQUE, model TEXT NOT NULL, effort TEXT NOT NULL,
          status TEXT NOT NULL, error_code TEXT, error_message TEXT,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE attachments (
          id TEXT PRIMARY KEY, original_name TEXT NOT NULL, media_type TEXT NOT NULL,
          byte_size INTEGER NOT NULL, extracted_text TEXT, path TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE message_attachments (
          message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
          attachment_id TEXT NOT NULL REFERENCES attachments(id) ON DELETE CASCADE,
          PRIMARY KEY(message_id, attachment_id)
        );
        CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      `);
      db.prepare('INSERT INTO schema_migrations VALUES (1, ?)').run(now());
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); db.close(); throw error; }
  }
  if (!db.prepare('SELECT 1 FROM schema_migrations WHERE version = 2').get()) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(`
        CREATE TABLE projects (
          id TEXT PRIMARY KEY, name TEXT NOT NULL,
          created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        ALTER TABLE conversations ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE SET NULL;
        CREATE INDEX conversations_project ON conversations(project_id);
      `);
      db.prepare('INSERT INTO schema_migrations VALUES (2, ?)').run(now());
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); db.close(); throw error; }
  }
  if (!db.prepare('SELECT 1 FROM schema_migrations WHERE version = 3').get()) {
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(`
        ALTER TABLE conversations ADD COLUMN context_summary TEXT;
        ALTER TABLE conversations ADD COLUMN compacted_through_id TEXT;
        ALTER TABLE conversations ADD COLUMN compacted_at TEXT;
      `);
      db.prepare('INSERT INTO schema_migrations VALUES (3, ?)').run(now());
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); db.close(); throw error; }
  }
  db.prepare("UPDATE generations SET status='interrupted', updated_at=? WHERE status IN ('sending','generating')").run(now());
  db.prepare("UPDATE messages SET status='interrupted', updated_at=? WHERE status IN ('sending','generating')").run(now());
  return db;
}

export function listConversations(db, search = '') {
  return db.prepare(`SELECT id,title,project_id AS projectId,selected_leaf_id AS selectedLeafId,created_at AS createdAt,updated_at AS updatedAt
    FROM conversations WHERE title LIKE ? ORDER BY updated_at DESC`).all(`%${search.replace(/[%_]/g, '')}%`);
}

export function listProjects(db) {
  return db.prepare(`SELECT p.id,p.name,p.created_at AS createdAt,p.updated_at AS updatedAt,
    count(c.id) AS conversationCount FROM projects p LEFT JOIN conversations c ON c.project_id=p.id
    GROUP BY p.id ORDER BY p.updated_at DESC,p.name`).all();
}

export function createProject(db, name) {
  const item = { id: randomUUID(), name, createdAt: now() };
  db.prepare('INSERT INTO projects(id,name,created_at,updated_at) VALUES (?,?,?,?)')
    .run(item.id, item.name, item.createdAt, item.createdAt);
  return item;
}

export function updateProject(db, id, name) {
  const result = db.prepare('UPDATE projects SET name=?,updated_at=? WHERE id=?').run(name, now(), id);
  return result.changes ? db.prepare(`SELECT id,name,created_at AS createdAt,updated_at AS updatedAt FROM projects WHERE id=?`).get(id) : null;
}

export function deleteProject(db, id) {
  return db.prepare('DELETE FROM projects WHERE id=?').run(id).changes > 0;
}

export function createConversation(db, projectId = null) {
  if (projectId && !db.prepare('SELECT 1 FROM projects WHERE id=?').get(projectId))
    throw Object.assign(new Error('Project does not exist.'), { status: 400, code: 'invalid_project' });
  const item = { id: randomUUID(), title: 'New chat', projectId, createdAt: now() };
  db.prepare('INSERT INTO conversations(id,title,project_id,created_at,updated_at) VALUES (?,?,?,?,?)')
    .run(item.id, item.title, item.projectId, item.createdAt, item.createdAt);
  return item;
}

export function getConversation(db, id) {
  const conversation = db.prepare(`SELECT id,title,project_id AS projectId,selected_leaf_id AS selectedLeafId,
    compacted_through_id AS compactedThroughId,compacted_at AS compactedAt,created_at AS createdAt,updated_at AS updatedAt
    FROM conversations WHERE id=?`).get(id);
  if (!conversation) return null;
  const messages = db.prepare(`SELECT m.id,m.parent_id AS parentId,m.role,m.content,m.status,m.context_json AS contextJson,
    m.model,m.effort,m.usage_json AS usageJson,m.created_at AS createdAt,m.updated_at AS updatedAt,
    g.error_code AS errorCode,g.error_message AS errorMessage
    FROM messages m LEFT JOIN generations g ON g.assistant_message_id=m.id
    WHERE m.conversation_id=? ORDER BY m.rowid`).all(id);
  const activeGeneration = db.prepare(`SELECT id FROM generations WHERE conversation_id=? AND status IN ('sending','generating') ORDER BY created_at DESC LIMIT 1`).get(id);
  return { ...conversation, activeGenerationId: activeGeneration?.id ?? null, messages: messages.map((m) => ({
    ...m, context: m.contextJson ? JSON.parse(m.contextJson) : null,
    usage: m.usageJson ? JSON.parse(m.usageJson) : null,
    contextJson: undefined, usageJson: undefined,
    attachments: db.prepare(`SELECT a.id,a.original_name AS name,a.media_type AS mediaType,a.byte_size AS size
      FROM attachments a JOIN message_attachments ma ON ma.attachment_id=a.id WHERE ma.message_id=?`).all(m.id)
      .map((item) => ({ ...item, downloadUrl: `/api/attachments/${item.id}/download` }))
  })) };
}

export function getConversationCompaction(db, id) {
  return db.prepare(`SELECT context_summary AS summary,compacted_through_id AS throughId,compacted_at AS compactedAt
    FROM conversations WHERE id=?`).get(id) ?? null;
}

export function setConversationCompaction(db, id, summary, throughId) {
  const time = now();
  const result = db.prepare(`UPDATE conversations SET context_summary=?,compacted_through_id=?,compacted_at=?,updated_at=? WHERE id=?`)
    .run(summary, throughId, time, time, id);
  return result.changes ? { throughId, compactedAt: time } : null;
}

export function pathToLeaf(db, conversationId, leafId) {
  if (!leafId) return [];
  const rows = db.prepare(`WITH RECURSIVE path AS (
    SELECT id,parent_id,role,content,context_json,0 AS depth FROM messages WHERE id=? AND conversation_id=?
    UNION ALL SELECT m.id,m.parent_id,m.role,m.content,m.context_json,p.depth+1
    FROM messages m JOIN path p ON m.id=p.parent_id WHERE m.conversation_id=?
  ) SELECT * FROM path ORDER BY depth DESC`).all(leafId, conversationId, conversationId);
  if (!rows.length) throw Object.assign(new Error('Nhánh trò chuyện không hợp lệ.'), { status: 400, code: 'invalid_branch' });
  return rows;
}

export function updateConversation(db, id, { title, selectedLeafId, projectId }) {
  const current = getConversation(db, id);
  if (!current) return null;
  if (selectedLeafId !== undefined) pathToLeaf(db, id, selectedLeafId);
  if (projectId && !db.prepare('SELECT 1 FROM projects WHERE id=?').get(projectId))
    throw Object.assign(new Error('Project does not exist.'), { status: 400, code: 'invalid_project' });
  db.prepare('UPDATE conversations SET title=?,selected_leaf_id=?,project_id=?,updated_at=? WHERE id=?')
    .run(title === undefined ? current.title : title, selectedLeafId === undefined ? current.selectedLeafId : selectedLeafId,
      projectId === undefined ? current.projectId : projectId, now(), id);
  return getConversation(db, id);
}

export function createGeneration(db, conversationId, input) {
  const existing = db.prepare('SELECT id FROM generations WHERE idempotency_key=?').get(input.idempotencyKey);
  if (existing) return { id: existing.id, duplicate: true };
  const conversation = getConversation(db, conversationId);
  if (!conversation) return null;
  const time = now(), generationId = randomUUID(), assistantId = randomUUID();
  let userId = input.userMessageId;
  let parentId = input.parentId === undefined ? conversation.selectedLeafId : input.parentId;
  if (input.editMessageId) {
    const original = conversation.messages.find((m) => m.id === input.editMessageId && m.role === 'user');
    if (!original) throw Object.assign(new Error('Tin nhắn sửa không tồn tại.'), { status: 400, code: 'invalid_edit' });
    parentId = original.parentId;
  }
  if (userId) {
    const existingUser = conversation.messages.find((m) => m.id === userId && m.role === 'user');
    if (!existingUser) throw Object.assign(new Error('Tin nhắn gốc không tồn tại.'), { status: 400, code: 'invalid_regenerate' });
  } else if (parentId) pathToLeaf(db, conversationId, parentId);
  db.exec('BEGIN IMMEDIATE');
  try {
    if (!userId) {
      userId = randomUUID();
      db.prepare(`INSERT INTO messages(id,conversation_id,parent_id,role,content,status,context_json,created_at,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?)`).run(userId, conversationId, parentId, 'user', input.content, 'complete', JSON.stringify(input.context ?? null), time, time);
      for (const attachmentId of input.attachmentIds ?? []) {
        if (!db.prepare('SELECT id FROM attachments WHERE id=?').get(attachmentId)) throw Object.assign(new Error('Tệp đính kèm không tồn tại.'), { status: 400, code: 'invalid_attachment' });
        db.prepare('INSERT INTO message_attachments VALUES (?,?)').run(userId, attachmentId);
      }
    }
    db.prepare(`INSERT INTO messages(id,conversation_id,parent_id,role,content,status,model,effort,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(assistantId, conversationId, userId, 'assistant', '', 'sending', input.model, input.effort, time, time);
    db.prepare(`INSERT INTO generations(id,conversation_id,user_message_id,assistant_message_id,idempotency_key,model,effort,status,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`).run(generationId, conversationId, userId, assistantId, input.idempotencyKey, input.model, input.effort, 'sending', time, time);
    const title = conversation.messages.length ? conversation.title : input.content.replace(/\s+/g, ' ').trim().slice(0, 70) || 'Tệp đính kèm';
    db.prepare('UPDATE conversations SET title=?,selected_leaf_id=?,updated_at=? WHERE id=?').run(title, assistantId, time, conversationId);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  return { id: generationId, userMessageId: userId, assistantMessageId: assistantId, duplicate: false };
}

export function updateGeneration(db, id, { status, content, usage, errorCode, errorMessage }) {
  const generation = db.prepare('SELECT * FROM generations WHERE id=?').get(id);
  if (!generation) return null;
  const time = now();
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('UPDATE generations SET status=?,error_code=?,error_message=?,updated_at=? WHERE id=?')
      .run(status, errorCode ?? null, errorMessage ?? null, time, id);
    db.prepare('UPDATE messages SET content=?,status=?,usage_json=?,updated_at=? WHERE id=?')
      .run(content, status, usage ? JSON.stringify(usage) : null, time, generation.assistant_message_id);
    db.prepare('UPDATE conversations SET updated_at=? WHERE id=?').run(time, generation.conversation_id);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  return generation;
}

export function getGeneration(db, id) {
  return db.prepare(`SELECT g.*,m.content FROM generations g JOIN messages m ON m.id=g.assistant_message_id WHERE g.id=?`).get(id);
}
