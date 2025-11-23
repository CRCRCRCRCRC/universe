import { sql } from "@vercel/postgres";

export type MessageRecord = {
  id: number;
  title: string;
  content: string;
  pos_x: number;
  pos_y: number;
  order_index: number;
  created_at: string;
  updated_at: string;
};

// Ensure the table exists once per runtime.
let tableReady: Promise<void> | null = null;

async function ensureTable() {
  ensureConnection();

  if (!tableReady) {
    tableReady = sql`CREATE TABLE IF NOT EXISTS guestbook_messages (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      pos_x INTEGER NOT NULL DEFAULT 0,
      pos_y INTEGER NOT NULL DEFAULT 0,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`.then(() => undefined);
  }
  await tableReady;

  // Add missing columns for older tables (safe to run repeatedly).
  await sql`ALTER TABLE guestbook_messages ADD COLUMN IF NOT EXISTS pos_x INTEGER NOT NULL DEFAULT 0;`;
  await sql`ALTER TABLE guestbook_messages ADD COLUMN IF NOT EXISTS pos_y INTEGER NOT NULL DEFAULT 0;`;
}

function ensureConnection() {
  if (!process.env.POSTGRES_URL) {
    throw new Error("NO_POSTGRES_URL");
  }
}

export async function fetchMessages(): Promise<MessageRecord[]> {
  await ensureTable();

  const { rows } = await sql<MessageRecord>`
    SELECT id, title, content, pos_x, pos_y, order_index, created_at, updated_at
    FROM guestbook_messages
    ORDER BY order_index ASC, created_at DESC;
  `;

  return rows;
}

export async function createMessage(
  title: string,
  content: string,
): Promise<MessageRecord> {
  await ensureTable();

  const sanitizedTitle = (title ?? "").trim() || "無題";
  const sanitizedContent = (content ?? "").trim();

  if (!sanitizedContent) {
    throw new Error("CONTENT_REQUIRED");
  }

  const nextOrderResult = await sql<{ next: number | null; count: number }>`
    SELECT COALESCE(MAX(order_index) + 1, 0) AS next, COUNT(*)::int AS count
    FROM guestbook_messages;
  `;

  const stats = nextOrderResult.rows[0];
  const nextOrder = stats?.next ?? 0;
  const count = stats?.count ?? 0;

  // Simple initial layout: spread cards in columns.
  const col = count % 3;
  const row = Math.floor(count / 3);
  const posX = 32 + col * 260;
  const posY = 32 + row * 180;

  const { rows } = await sql<MessageRecord>`
    INSERT INTO guestbook_messages (title, content, order_index, pos_x, pos_y)
    VALUES (${sanitizedTitle.slice(0, 120)}, ${sanitizedContent.slice(
    0,
    2000,
  )}, ${nextOrder}, ${posX}, ${posY})
    RETURNING id, title, content, pos_x, pos_y, order_index, created_at, updated_at;
  `;

  return rows[0];
}

export async function updateMessageContent(options: {
  id: number;
  title?: string;
  content?: string;
}): Promise<MessageRecord> {
  const { id, title, content } = options;
  await ensureTable();

  const newTitle = title?.trim();
  const newContent = content?.trim();

  if (newContent !== undefined && newContent.length === 0) {
    throw new Error("CONTENT_REQUIRED");
  }

  if (newTitle === undefined && newContent === undefined) {
    throw new Error("NOTHING_TO_UPDATE");
  }

  const { rows } = await sql<MessageRecord>`
    UPDATE guestbook_messages
    SET
      title = COALESCE(${newTitle ?? null}, title),
      content = COALESCE(${newContent ?? null}, content),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, title, content, pos_x, pos_y, order_index, created_at, updated_at;
  `;

  if (!rows[0]) {
    throw new Error("NOT_FOUND");
  }

  return rows[0];
}

export async function updatePositions(
  positions: Array<{ id: number; pos_x: number; pos_y: number }>,
): Promise<void> {
  await ensureTable();

  if (positions.length === 0) return;

  for (const item of positions) {
    await sql`
      UPDATE guestbook_messages
      SET pos_x = ${item.pos_x}, pos_y = ${item.pos_y}, updated_at = NOW()
      WHERE id = ${item.id};
    `;
  }
}
