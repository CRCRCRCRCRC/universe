import { sql } from "@vercel/postgres";

export type MessageRecord = {
  id: number;
  title: string;
  content: string;
  order_index: number;
  created_at: string;
  updated_at: string;
};

// Ensure the table exists once per runtime.
let tableReady: Promise<void> | null = null;

async function ensureTable() {
  if (!tableReady) {
    tableReady = sql`CREATE TABLE IF NOT EXISTS guestbook_messages (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`.then(() => undefined);
  }
  await tableReady;
}

export async function fetchMessages(): Promise<MessageRecord[]> {
  await ensureTable();

  const { rows } = await sql<MessageRecord>`
    SELECT id, title, content, order_index, created_at, updated_at
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

  const nextOrderResult = await sql<{ next: number | null }>`
    SELECT COALESCE(MAX(order_index) + 1, 0) AS next FROM guestbook_messages;
  `;

  const nextOrder = nextOrderResult.rows[0]?.next ?? 0;

  const { rows } = await sql<MessageRecord>`
    INSERT INTO guestbook_messages (title, content, order_index)
    VALUES (${sanitizedTitle.slice(0, 120)}, ${sanitizedContent.slice(
    0,
    2000,
  )}, ${nextOrder})
    RETURNING id, title, content, order_index, created_at, updated_at;
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
    RETURNING id, title, content, order_index, created_at, updated_at;
  `;

  if (!rows[0]) {
    throw new Error("NOT_FOUND");
  }

  return rows[0];
}

export async function reorderMessages(
  order: Array<{ id: number; order_index: number }>,
): Promise<void> {
  await ensureTable();

  if (order.length === 0) return;

  for (const item of order) {
    await sql`
      UPDATE guestbook_messages
      SET order_index = ${item.order_index}, updated_at = NOW()
      WHERE id = ${item.id};
    `;
  }
}
