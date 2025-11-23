"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  Reorder,
  useDragControls,
} from "framer-motion";

type Message = {
  id: number;
  title: string;
  content: string;
  order_index: number;
  created_at: string;
  updated_at: string;
};

type ToastState = { type: "success" | "error"; message: string } | null;

const fadeIn = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const glassCard =
  "backdrop-blur-xl bg-white/5 ring-1 ring-white/10 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.6)]";

function formatTime(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M10 3.5 8.6 7.9 4 9.3l4.6 1.4L10 15l1.4-4.3L16 9.3l-4.6-1.4L10 3.5Z"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 4.5 15.7 6.8 13.5 7.5l2.2.7.8 2.3.8-2.3 2.2-.7-2.2-.7-.8-2.3Z"
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 14.5 16.4 16.1 14.8 16.6 16.4 17.1 17 18.7 17.6 17.1 19.2 16.6 17.6 16.1 17 14.5Z"
        stroke="currentColor"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);
  const pendingOrder = useRef<Message[] | null>(null);

  const headline = useMemo(
    () => [
      "投下你的想法，不用登入、不留痕跡。",
      "拖移、編輯，就像玩弄一片星雲。",
    ],
    [],
  );

  useEffect(() => {
    loadMessages();
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const pushToast = (type: "success" | "error", message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, message });
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  const loadMessages = async () => {
    try {
      setError(null);
      setLoading(true);
      const res = await fetch("/api/messages", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("failed");
      }
      const data = (await res.json()) as { messages: Message[] };
      setMessages(data.messages);
    } catch (err) {
      console.error(err);
      setError("載入留言時出現問題，請稍後重試。");
    } finally {
      setLoading(false);
    }
  };

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
      setMessages((prev) =>
        [...prev, data.message].sort(
          (a, b) => a.order_index - b.order_index || a.id - b.id,
        ),
      );

      setNewTitle("");
      setNewContent("");
      setIsSheetOpen(false);
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

  const handleReorder = (next: Message[]) => {
    setMessages(next);
    pendingOrder.current = next;
  };

  const commitReorder = async () => {
    if (!pendingOrder.current) return;
    const snapshot = pendingOrder.current;
    setSavingOrder(true);

    try {
      const order = snapshot.map((item, index) => ({
        id: item.id,
        order_index: index,
      }));

      const res = await fetch("/api/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "排序儲存失敗");
      }

      setMessages(
        snapshot.map((item, idx) => ({ ...item, order_index: idx })),
      );
      pushToast("success", "排序已同步到資料庫");
    } catch (err) {
      console.error(err);
      pushToast("error", "排序同步失敗，稍後再試");
    } finally {
      pendingOrder.current = null;
      setSavingOrder(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <AuroraBackground />

      <main className="relative mx-auto flex max-w-6xl flex-col gap-8 px-6 pb-32 pt-16 md:px-10">
        <motion.header
          {...fadeIn}
          className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex flex-col gap-4">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-200 shadow-lg shadow-teal-500/10">
              <SparklesIcon className="h-5 w-5 text-teal-300" />
              Vercel Storage · Neon · 開放留言
            </div>
            <div className="space-y-3">
              <h1 className="font-display text-4xl font-semibold leading-tight text-white md:text-5xl">
                星雲留言牆
              </h1>
              <p className="max-w-3xl text-base text-slate-300 md:text-lg">
                {headline[0]}
                <br />
                {headline[1]}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <StatusPill color="emerald">即時同步到 Neon</StatusPill>
              <StatusPill color="cyan">
                {savingOrder ? "儲存排序中…" : "拖曳卡片隨你排"}
              </StatusPill>
              <StatusPill color="violet">無需註冊、即填即現</StatusPill>
            </div>
          </div>

          <motion.div
            className={`relative hidden w-full max-w-sm overflow-hidden rounded-3xl ${glassCard} md:block`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0, transition: { delay: 0.1 } }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/30 via-cyan-400/20 to-purple-600/30 blur-3xl" />
            <div className="relative space-y-3 p-5">
              <div className="flex items-center justify-between text-sm text-slate-200">
                <span>最新新增</span>
                <span className="text-teal-200">
                  {messages.length > 0
                    ? formatTime(messages[messages.length - 1].created_at)
                    : "尚無留言"}
                </span>
              </div>
              <div className="h-[1px] w-full bg-gradient-to-r from-white/5 via-white/25 to-white/5" />
              <p className="text-sm text-slate-200">
                這裡的每張卡片都存進 Vercel Storage (Neon)，
                拖移、編輯都會即時同步。
              </p>
            </div>
          </motion.div>
        </motion.header>

        <section className="relative">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-b from-white/5 via-transparent to-transparent blur-3xl" />
          <div
            className={`rounded-3xl ${glassCard} border border-white/5 px-4 py-6 md:px-6 md:py-8`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-200">
                <span className="inline-flex h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_0_6px_rgba(45,212,191,0.2)]" />
                所有人都能拖移排序或編輯
              </div>
              {savingOrder && (
                <motion.div
                  className="flex items-center gap-2 text-xs text-teal-200"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="h-2 w-2 rounded-full bg-teal-300"
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.2 }}
                  />
                  同步中
                </motion.div>
              )}
            </div>

            {loading ? (
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {[...Array(4)].map((_, idx) => (
                  <motion.div
                    key={idx}
                    className="h-32 rounded-2xl bg-white/5"
                    animate={{ opacity: [0.4, 0.7, 0.4] }}
                    transition={{ repeat: Infinity, duration: 1.8, delay: idx * 0.1 }}
                  />
                ))}
              </div>
            ) : error ? (
              <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-white/5 p-8 text-center text-slate-200">
                <p>{error}</p>
                <button
                  onClick={loadMessages}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
                >
                  重試
                </button>
              </div>
            ) : (
              <div className="mt-6">
                <AnimatePresence mode="popLayout">
                  {messages.length === 0 ? (
                    <motion.div
                      {...fadeIn}
                      className="flex flex-col items-center gap-4 rounded-2xl bg-white/5 p-8 text-center text-slate-200"
                    >
                      <p>還沒有任何留言，按下「新增留言」立即填上一張！</p>
                      <button
                        onClick={() => setIsSheetOpen(true)}
                        className="rounded-full bg-gradient-to-r from-teal-400 to-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:shadow-cyan-500/50"
                      >
                        新增留言
                      </button>
                    </motion.div>
                  ) : (
                    <Reorder.Group
                      axis="y"
                      values={messages}
                      onReorder={handleReorder}
                      className="flex flex-col gap-4"
                    >
                      {messages.map((message) => (
                        <MessageCard
                          key={message.id}
                          message={message}
                          onSave={handleSaveEdit}
                          onDragEnd={commitReorder}
                        />
                      ))}
                    </Reorder.Group>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </section>
      </main>

      <motion.button
        onClick={() => setIsSheetOpen(true)}
        className="group fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-gradient-to-r from-teal-400 via-cyan-300 to-emerald-300 px-6 py-3 text-base font-semibold text-slate-950 shadow-[0_20px_60px_-24px_rgba(16,185,129,0.8)] transition hover:scale-[1.02] hover:shadow-[0_24px_80px_-30px_rgba(34,211,238,0.8)]"
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.25 } }}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/10 text-slate-950 ring-1 ring-white/40 transition group-hover:rotate-6">
          <span className="text-xl leading-none">+</span>
        </span>
        新增留言
      </motion.button>

      <CreateSheet
        open={isSheetOpen}
        onClose={() => {
          setIsSheetOpen(false);
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
                ? "bg-emerald-500/90 text-emerald-50"
                : "bg-rose-500/90 text-rose-50"
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

type MessageCardProps = {
  message: Message;
  onSave: (id: number, title: string, content: string) => Promise<void>;
  onDragEnd: () => void;
};

function MessageCard({ message, onSave, onDragEnd }: MessageCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(message.title);
  const [draftContent, setDraftContent] = useState(message.content);
  const [saving, setSaving] = useState(false);
  const controls = useDragControls();

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
      // Error is handled by parent toast.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Reorder.Item
      value={message}
      dragControls={controls}
      dragListener={false}
      onDragEnd={onDragEnd}
      className={`relative overflow-hidden rounded-2xl border border-white/5 ${glassCard}`}
      layoutScroll
    >
      <motion.div
        layout
        className="flex flex-col gap-3 p-5"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onPointerDown={(event) => {
                event.preventDefault();
                controls.start(event);
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10"
              title="拖移卡片"
            >
              <DragIcon className="h-5 w-5" />
            </button>
            <div>
              {isEditing ? (
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className="w-full rounded-lg bg-white/5 px-3 py-2 text-base font-semibold text-white outline-none ring-1 ring-transparent transition focus:ring-white/30"
                  maxLength={120}
                />
              ) : (
                <h3 className="font-display text-xl font-semibold text-white">
                  {message.title}
                </h3>
              )}
              <p className="text-xs text-slate-400">
                {formatTime(message.updated_at || message.created_at)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsEditing((prev) => !prev)}
            className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
          >
            <EditIcon className="h-4 w-4" />
            {isEditing ? "取消" : "編輯"}
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 via-transparent to-white/5" />
          {isEditing ? (
            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              className="relative z-10 mt-1 w-full resize-none rounded-xl bg-transparent px-3 py-3 text-sm leading-relaxed text-slate-100 outline-none ring-1 ring-transparent transition focus:ring-white/30"
              rows={4}
              maxLength={2000}
            />
          ) : (
            <p className="relative z-10 text-base leading-relaxed text-slate-100">
              {message.content}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
          <span>#{message.id}</span>
          <div className="flex items-center gap-2">
            {isEditing && (
              <button
                onClick={() => {
                  setDraftTitle(message.title);
                  setDraftContent(message.content);
                  setIsEditing(false);
                }}
                className="rounded-full px-3 py-2 font-medium text-slate-300 transition hover:bg-white/5"
              >
                還原
              </button>
            )}
            {isEditing ? (
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 px-4 py-2 font-semibold text-slate-950 transition hover:shadow-[0_12px_40px_-20px_rgba(52,211,153,0.8)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "儲存中…" : "儲存"}
              </button>
            ) : (
              <span className="rounded-full bg-white/5 px-3 py-2 text-slate-200">
                可拖曳排序
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Reorder.Item>
  );
}

function CreateSheet({
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
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0, transition: { type: "spring", damping: 18 } }}
            exit={{ y: "100%" }}
            className="w-full max-w-3xl rounded-t-[28px] border border-white/10 bg-slate-900/90 p-6 shadow-2xl md:rounded-3xl md:pb-8"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-200">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(52,211,153,0.25)]" />
                新增留言
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">標題</label>
                <input
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="給這則留言一個名字"
                  className="w-full rounded-2xl bg-white/5 px-4 py-3 text-base text-white outline-none ring-1 ring-transparent transition focus:ring-white/30"
                  maxLength={120}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm text-slate-300">內容</label>
                <textarea
                  value={content}
                  onChange={(e) => onContentChange(e.target.value)}
                  placeholder="寫下任何想法、感受或提醒。大家都能看見，也能拖移或修改。"
                  className="h-36 w-full resize-none rounded-2xl bg-white/5 px-4 py-3 text-base text-white outline-none ring-1 ring-transparent transition focus:ring-white/30"
                  maxLength={2000}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                不需登入，送出即刻出現在牆上。
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
                >
                  取消
                </button>
                <button
                  onClick={onSubmit}
                  disabled={submitting}
                  className="rounded-full bg-gradient-to-r from-teal-400 to-cyan-300 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:shadow-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-60"
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

function StatusPill({
  children,
  color = "teal",
}: {
  children: React.ReactNode;
  color?: "teal" | "emerald" | "cyan" | "violet";
}) {
  const palette: Record<string, string> = {
    teal: "from-teal-500/25 to-cyan-500/25 text-teal-100",
    emerald: "from-emerald-500/25 to-teal-500/25 text-emerald-100",
    cyan: "from-cyan-500/25 to-blue-500/25 text-cyan-100",
    violet: "from-violet-500/25 to-fuchsia-500/25 text-violet-100",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-white/10 bg-gradient-to-r ${palette[color]}`}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-white/70" />
      {children}
    </span>
  );
}

function AuroraBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(236,72,153,0.08),transparent_35%)]" />
      <motion.div
        className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-teal-500/20 blur-[120px]"
        animate={{ y: [0, -12, 0], x: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 10, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-12 top-32 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-[120px]"
        animate={{ y: [0, 16, 0], x: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:140px_140px] opacity-10" />
    </div>
  );
}
