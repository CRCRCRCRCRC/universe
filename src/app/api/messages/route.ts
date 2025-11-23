import { NextResponse } from "next/server";
import {
  createMessage,
  fetchMessages,
  reorderMessages,
  updateMessageContent,
} from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const messages = await fetchMessages();
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[GET_MESSAGES]", error);
    if (error instanceof Error && error.message === "NO_POSTGRES_URL") {
      return NextResponse.json(
        { error: "請在 Vercel 專案設定 Storage/Postgres，讓 POSTGRES_URL 生效。" },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Failed to load messages." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const { title = "", content = "" } = await request.json();

    const message = await createMessage(title, content);
    return NextResponse.json({ message });
  } catch (error) {
    console.error("[CREATE_MESSAGE]", error);
    let message = "新增留言時發生錯誤";
    if (error instanceof Error) {
      if (error.message === "NO_POSTGRES_URL") {
        message = "請先在 Vercel 設定 Storage/Postgres，啟用 POSTGRES_URL。";
      } else if (error.message === "CONTENT_REQUIRED") {
        message = "內容不能為空白";
      }
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, title, content } = await request.json();

    if (!id || typeof id !== "number") {
      return NextResponse.json({ error: "缺少留言 ID" }, { status: 400 });
    }

    const message = await updateMessageContent({ id, title, content });
    return NextResponse.json({ message });
  } catch (error) {
    console.error("[UPDATE_MESSAGE]", error);
    let message = "更新留言失敗";

    if (error instanceof Error) {
      if (error.message === "CONTENT_REQUIRED") {
        message = "內容不能為空白";
      } else if (error.message === "NOT_FOUND") {
        message = "找不到這則留言";
      } else if (error.message === "NO_POSTGRES_URL") {
        message = "請先在 Vercel 設定 Storage/Postgres，啟用 POSTGRES_URL。";
      }
    }

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const { order } = await request.json();

    if (
      !Array.isArray(order) ||
      order.some(
        (item) =>
          typeof item !== "object" ||
          typeof item.id !== "number" ||
          typeof item.order_index !== "number",
      )
    ) {
      return NextResponse.json(
        { error: "排序資料格式錯誤" },
        { status: 400 },
      );
    }

    await reorderMessages(order);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[REORDER_MESSAGES]", error);
    if (error instanceof Error && error.message === "NO_POSTGRES_URL") {
      return NextResponse.json(
        { error: "請先在 Vercel 設定 Storage/Postgres，啟用 POSTGRES_URL。" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "更新排序時發生錯誤" },
      { status: 400 },
    );
  }
}
