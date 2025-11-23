"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Message = {
  id: number;
  title: string;
  content: string;
  pos_x: number;
  pos_y: number;
  order_index: number;
  created_at: string;
  updated_at: string;
};

type ToastState = { type: "success" | "error"; message: string } | null;

const glassCard =
  "backdrop-blur-lg bg-white/80 ring-1 ring-slate-200 shadow-[0_15px_45px_-25px_rgba(15,23,42,0.35)]";

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DragIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M9 5h.01M9 9h.01M9 13h.01M9 17h.01M15 5h.01M15 9h.01M15 13h.01M15 17h.01"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EditIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m14.06 6.19 2.12-2.12a1.5 1.5 0 1 1 2.12 2.12l-2.12 2.12"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M5 13.5 9.5 18 19 7"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="m6 6 12 12M6 18 18 6"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingOrder = useRef<Message[] | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const hasMessages = messages.length > 0;

  const pushToast = (type: "success" | "error", message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  const loadMessages = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch("/api/messages", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "failed");
      }
      const data = (await res.json()) as { messages: Message[] };
      setMessages(data.messages);
    } catch (err) {
      console.error(err);
      setError("載入留言時出現問題，請確認 Storage/Postgres 設定。");
      pushToast("error", "載入留言失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [loadMessages]);

  const handleCreate = async () => {
    if (!newContent.trim()) {
      pushToast("error", "內容不能是空白哦！");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim() || "未命名的靈感",
          content: newContent.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "新增失敗");
      }
      const data = (await res.json()) as { message: Message };
      setMessages((prev) => [...prev, data.message]);
      setNewTitle("");
      setNewContent("");
      setIsModalOpen(false);
      pushToast("success", "留言已新增 🚀");
    } catch (err) {
      console.error(err);
      pushToast("error", "新增留言失敗，請再試一次");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (
    id: number,
    title: string,
    content: string,
  ) => {
    if (!content.trim()) {
      pushToast("error", "內容不能是空白哦！");
      throw new Error("內容不能為空");
    }

    const res = await fetch("/api/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        title: title.trim() || "未命名的靈感",
        content: content.trim(),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      pushToast("error", data?.error || "更新失敗");
      throw new Error(data?.error || "更新失敗");
    }

    const data = (await res.json()) as { message: Message };
    setMessages((prev) =>
      prev.map((item) => (item.id === id ? data.message : item)),
    );
    pushToast("success", "已更新這張卡片");
  };

  const handleDragEnd = async (
    message: Message,
    offset: { x: number; y: number },
  ) => {
    const nextX = Math.round(message.pos_x + offset.x);
    const nextY = Math.round(message.pos_y + offset.y);
    const nextState = messages.map((m) =>
      m.id === message.id ? { ...m, pos_x: nextX, pos_y: nextY } : m,
    );
    setMessages(nextState);
    pendingOrder.current = nextState;
    await commitReorder();
  };

  const commitReorder = useCallback(async () => {
    if (!pendingOrder.current) return;
    const snapshot = pendingOrder.current;
    setSavingOrder(true);
    try {
      const positions = snapshot.map((item) => ({
        id: item.id,
        pos_x: item.pos_x,
        pos_y: item.pos_y,
      }));
      const res = await fetch("/api/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "更新座標失敗");
      }
      setMessages(snapshot);
      pushToast("success", "位置已同步到資料庫");
    } catch (err) {
      console.error(err);
      pushToast("error", "位置同步失敗，稍後再試");
    } finally {
      pendingOrder.current = null;
      setSavingOrder(false);
    }
  }, []);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (e.target !== boardRef.current) return;
    isPanning.current = true;
    panStart.current = panRef.current;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    const next = { x: panStart.current.x + dx, y: panStart.current.y + dy };
    panRef.current = next;
    setPan(next);
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning.current) return;
    isPanning.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900">
      <AuroraBackground />

      <main className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-5 pb-28 pt-8 md:px-8">
        {savingOrder && (
          <div className="absolute right-6 top-6 z-20 flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 ring-1 ring-emerald-100">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            同步中…
          </div>
        )}

        <section className="relative mt-4 flex-1">
          {loading ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, idx) => (
                <motion.div
                  key={idx}
                  className="h-32 rounded-2xl bg-slate-100"
                  animate={{ opacity: [0.4, 0.8, 0.4] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.4,
                    delay: idx * 0.08,
                  }}
                />
              ))}
            </div>
          ) : error ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-700">
              <p>{error}</p>
              <button
                onClick={loadMessages}
                className="rounded-full bg-slate-900 px-4 py-2 text-white shadow-sm transition hover:translate-y-px"
              >
                重新嘗試
              </button>
            </div>
          ) : (
            <div
              ref={boardRef}
              className="relative min-h-[70vh] cursor-grab active:cursor-grabbing"
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerLeave={handleCanvasPointerUp}
            >
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(0deg,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[size:160px_160px] opacity-70" />
              {!hasMessages && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
                  尚無留言，點擊右下「新增留言」
                </div>
              )}
              {messages.map((message) => (
                <StickyCard
                  key={message.id}
                  message={message}
                  onSave={handleSaveEdit}
                  onDragEnd={handleDragEnd}
                  pan={pan}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <motion.button
        onClick={() => setIsModalOpen(true)}
        className="group fixed bottom-6 right-6 z-30 inline-flex items-center gap-3 rounded-full bg-slate-900 px-5 py-3 text-base font-semibold text-white shadow-xl shadow-slate-900/20 transition hover:translate-y-px hover:shadow-2xl"
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.15 } }}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition group-hover:rotate-6">
          <span className="text-xl leading-none">+</span>
        </span>
        新增留言
      </motion.button>

      <CreateModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSubmitting(false);
        }}
        title={newTitle}
        content={newContent}
        onTitleChange={setNewTitle}
        onContentChange={setNewContent}
        onSubmit={handleCreate}
        submitting={submitting}
      />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className={`fixed right-4 top-6 z-50 flex items-center gap-3 rounded-full px-4 py-3 text-sm shadow-lg ${
              toast.type === "success"
                ? "bg-emerald-500 text-emerald-50"
                : "bg-rose-500 text-rose-50"
            }`}
          >
            {toast.type === "success" ? (
              <CheckIcon className="h-5 w-5" />
            ) : (
              <XIcon className="h-5 w-5" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type StickyCardProps = {
  message: Message;
  onSave: (id: number, title: string, content: string) => Promise<void>;
  onDragEnd: (message: Message, offset: { x: number; y: number }) => void;
  pan: { x: number; y: number };
};

function StickyCard({
  message,
  onSave,
  onDragEnd,
  pan,
}: StickyCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(message.title);
  const [draftContent, setDraftContent] = useState(message.content);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraftTitle(message.title);
    setDraftContent(message.content);
  }, [message.title, message.content]);

  const save = async () => {
    try {
      setSaving(true);
      await onSave(message.id, draftTitle, draftContent);
      setIsEditing(false);
    } catch {
      // Toast already handled.
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragEnd={(_, info) => onDragEnd(message, info.offset)}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`absolute w-72 cursor-grab rounded-2xl border border-slate-200 ${glassCard}`}
      style={{ x: message.pos_x + pan.x, y: message.pos_y + pan.y }}
    >
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          {isEditing ? (
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="w-full rounded-lg bg-white px-3 py-2 text-base font-semibold text-slate-900 outline-none ring-1 ring-transparent transition focus:ring-slate-200"
              maxLength={120}
            />
          ) : (
            <h3 className="text-lg font-semibold text-slate-900">
              {message.title}
            </h3>
          )}
          <button
            onClick={() => setIsEditing((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:translate-y-px"
            title="編輯"
          >
            <EditIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
          {isEditing ? (
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              className="w-full resize-none bg-transparent text-sm leading-relaxed text-slate-900 outline-none"
              rows={4}
              maxLength={2000}
            />
          ) : (
            <p className="text-sm leading-relaxed text-slate-800">
              {message.content}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
            <DragIcon className="h-4 w-4" />
            拖到任意位置
          </div>
          <span>{formatTime(message.updated_at || message.created_at)}</span>
        </div>

        {isEditing && (
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => {
                setDraftTitle(message.title);
                setDraftContent(message.content);
                setIsEditing(false);
              }}
              className="rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              取消
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "儲存中…" : "儲存"}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function CreateModal({
  open,
  onClose,
  onSubmit,
  title,
  content,
  onTitleChange,
  onContentChange,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  content: string;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  submitting: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              transition: { type: "spring", damping: 18 },
            }}
            exit={{ scale: 0.96, opacity: 0 }}
            className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                新增留言
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-600">標題</label>
                <input
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="給這則留言一個名字"
                  className="w-full rounded-2xl bg-white px-4 py-3 text-base text-slate-900 outline-none ring-1 ring-slate-200 transition focus:ring-slate-300"
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-600">內容</label>
                <textarea
                  value={content}
                  onChange={(e) => onContentChange(e.target.value)}
                  placeholder="寫下任何想法、感受或提醒。大家都能看見，也能拖移或修改。"
                  className="h-36 w-full resize-none rounded-2xl bg-white px-4 py-3 text-base text-slate-900 outline-none ring-1 ring-slate-200 transition focus:ring-slate-300"
                  maxLength={2000}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-slate-500">
                不需登入，送出即刻出現在牆上。
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  取消
                </button>
                <button
                  onClick={onSubmit}
                  disabled={submitting}
                  className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "送出中…" : "新增"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AuroraBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(59,130,246,0.08),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.08),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(236,72,153,0.05),transparent_35%)]" />
      <motion.div
        className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-sky-400/20 blur-[120px]"
        animate={{ y: [0, -10, 0], x: [0, 10, 0] }}
        transition={{
          repeat: Infinity,
          duration: 10,
          ease: [0.45, 0, 0.55, 1] as const,
        }}
      />
      <motion.div
        className="absolute -right-12 top-32 h-72 w-72 rounded-full bg-amber-300/20 blur-[120px]"
        animate={{ y: [0, 12, 0], x: [0, -8, 0] }}
        transition={{
          repeat: Infinity,
          duration: 12,
          ease: [0.45, 0, 0.55, 1] as const,
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-[length:160px_160px] opacity-15" />
    </div>
  );
}
