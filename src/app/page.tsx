"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  const hasMessages = messages.length > 0;
  const shouldShowBoard = loading || hasMessages || !!error;

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
      setError(
        "\u8f09\u5165\u7559\u8a00\u6642\u51fa\u73fe\u554f\u984c\uff0c\u8acb\u78ba\u8a8d Storage/Postgres \u8a2d\u5b9a\u3002",
      );
      pushToast(
        "error",
        "\u8f09\u5165\u7559\u8a00\u5931\u6557\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002",
      );
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
      pushToast("error", "\u5167\u5bb9\u4e0d\u80fd\u662f\u7a7a\u767d\u54e6\uff01");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim() || "\u672a\u547d\u540d\u7684\u9748\u611f",
          content: newContent.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "\u65b0\u589e\u5931\u6557");
      }
      const data = (await res.json()) as { message: Message };
      setMessages((prev) =>
        [...prev, data.message].sort(
          (a, b) => a.order_index - b.order_index || a.id - b.id,
        ),
      );
      setNewTitle("");
      setNewContent("");
      setIsModalOpen(false);
      pushToast("success", "\u7559\u8a00\u5df2\u65b0\u589e \ud83d\ude80");
    } catch (err) {
      console.error(err);
      pushToast(
        "error",
        "\u65b0\u589e\u7559\u8a00\u5931\u6557\uff0c\u8acb\u518d\u8a66\u4e00\u6b21",
      );
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
      pushToast("error", "\u5167\u5bb9\u4e0d\u80fd\u662f\u7a7a\u767d\u54e6\uff01");
      throw new Error("\u5167\u5bb9\u4e0d\u80fd\u70ba\u7a7a");
    }

    const res = await fetch("/api/messages", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        title: title.trim() || "\u672a\u547d\u540d\u7684\u9748\u611f",
        content: content.trim(),
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      pushToast("error", data?.error || "\u66f4\u65b0\u5931\u6557");
      throw new Error(data?.error || "\u66f4\u65b0\u5931\u6557");
    }

    const data = (await res.json()) as { message: Message };
    setMessages((prev) =>
      prev.map((item) => (item.id === id ? data.message : item)),
    );
    pushToast("success", "\u5df2\u66f4\u65b0\u9019\u5f35\u5361\u7247");
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
        throw new Error(data?.error || "\u6392\u5e8f\u5132\u5b58\u5931\u6557");
      }
      setMessages(
        snapshot.map((item, idx) => ({ ...item, order_index: idx })),
      );
      pushToast("success", "\u6392\u5e8f\u5df2\u540c\u6b65\u5230\u8cc7\u6599\u5eab");
    } catch (err) {
      console.error(err);
      pushToast("error", "\u6392\u5e8f\u540c\u6b65\u5931\u6557\uff0c\u7a0d\u5f8c\u518d\u8a66");
    } finally {
      pendingOrder.current = null;
      setSavingOrder(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <AuroraBackground />

      <main className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-5 pb-28 pt-12 md:px-8">
        {shouldShowBoard && (
          <section className="relative flex-1">
            <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-b from-white/5 via-transparent to-transparent blur-3xl" />
            <div
              className={`rounded-3xl ${glassCard} border border-white/5 px-4 py-6 md:px-6 md:py-8`}
            >
              {savingOrder && (
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs text-teal-100">
                  <span className="h-2 w-2 rounded-full bg-teal-300" />
                  {"\u6392\u5e8f\u540c\u6b65\u4e2d\u2026"}
                </div>
              )}

              {loading ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {[...Array(4)].map((_, idx) => (
                    <motion.div
                      key={idx}
                      className="h-32 rounded-2xl bg-white/5"
                      animate={{ opacity: [0.35, 0.75, 0.35] }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.6,
                        delay: idx * 0.1,
                      }}
                    />
                  ))}
                </div>
              ) : error ? (
                <div className="flex flex-col items-start gap-3 rounded-2xl bg-white/5 p-6 text-sm text-slate-200">
                  <p>{error}</p>
                  <button
                    onClick={loadMessages}
                    className="rounded-full bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/20"
                  >
                    {"\u91cd\u65b0\u5617\u8a66"}
                  </button>
                </div>
              ) : hasMessages ? (
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
              ) : (
                <div className="h-24 rounded-2xl border border-white/5 bg-white/5" />
              )}
            </div>
          </section>
        )}
      </main>

      <motion.button
        onClick={() => setIsModalOpen(true)}
        className="group fixed bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-gradient-to-r from-teal-400 via-cyan-300 to-emerald-300 px-6 py-3 text-base font-semibold text-slate-950 shadow-[0_20px_60px_-24px_rgba(16,185,129,0.8)] transition hover:scale-[1.02] hover:shadow-[0_24px_80px_-30px_rgba(34,211,238,0.8)]"
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0, transition: { delay: 0.25 } }}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/10 text-slate-950 ring-1 ring-white/40 transition group-hover:rotate-6">
          <span className="text-xl leading-none">+</span>
        </span>
        {"\u65b0\u589e\u7559\u8a00"}
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
      // Toast already handled.
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
              title="\u62d6\u79fb\u5361\u7247"
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
            {isEditing ? "\u53d6\u6d88" : "\u7de8\u8f2f"}
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
                {"\u9084\u539f"}
              </button>
            )}
            {isEditing ? (
              <button
                onClick={save}
                disabled={saving}
                className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 px-4 py-2 font-semibold text-slate-950 transition hover:shadow-[0_12px_40px_-20px_rgba(52,211,153,0.8)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "\u5132\u5b58\u4e2d\u2026" : "\u5132\u5b58"}
              </button>
            ) : (
              <span className="rounded-full bg-white/5 px-3 py-2 text-slate-200">
                {"\u53ef\u62d6\u66f3\u6392\u5e8f"}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </Reorder.Item>
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
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              transition: { type: "spring", damping: 18 },
            }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-200">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(52,211,153,0.25)]" />
                {"\u65b0\u589e\u7559\u8a00"}
              </div>
              <button
                onClick={onClose}
                className="rounded-full bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-300">
                  {"\u6a19\u984c"}
                </label>
                <input
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="\u7d66\u9019\u5247\u7559\u8a00\u4e00\u500b\u540d\u5b57"
                  className="w-full rounded-2xl bg-white/5 px-4 py-3 text-base text-white outline-none ring-1 ring-transparent transition focus:ring-white/30"
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-300">
                  {"\u5167\u5bb9"}
                </label>
                <textarea
                  value={content}
                  onChange={(e) => onContentChange(e.target.value)}
                  placeholder="\u5beb\u4e0b\u4efb\u4f55\u60f3\u6cd5\u3001\u611f\u53d7\u6216\u63d0\u9192\u3002\u5927\u5bb6\u90fd\u80fd\u770b\u898b\uff0c\u4e5f\u80fd\u62d6\u79fb\u6216\u4fee\u6539\u3002"
                  className="h-36 w-full resize-none rounded-2xl bg-white/5 px-4 py-3 text-base text-white outline-none ring-1 ring-transparent transition focus:ring-white/30"
                  maxLength={2000}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                {"\u4e0d\u9700\u767b\u5165\uff0c\u9001\u51fa\u5373\u523b\u51fa\u73fe\u5728\u7246\u4e0a\u3002"}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
                >
                  {"\u53d6\u6d88"}
                </button>
                <button
                  onClick={onSubmit}
                  disabled={submitting}
                  className="rounded-full bg-gradient-to-r from-teal-400 to-cyan-300 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:shadow-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "\u9001\u51fa\u4e2d\u2026" : "\u65b0\u589e"}
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(16,185,129,0.12),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(236,72,153,0.08),transparent_35%)]" />
      <motion.div
        className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-teal-500/20 blur-[120px]"
        animate={{ y: [0, -12, 0], x: [0, 8, 0] }}
        transition={{
          repeat: Infinity,
          duration: 10,
          ease: [0.45, 0, 0.55, 1] as const,
        }}
      />
      <motion.div
        className="absolute -right-12 top-32 h-72 w-72 rounded-full bg-fuchsia-500/15 blur-[120px]"
        animate={{ y: [0, 16, 0], x: [0, -10, 0] }}
        transition={{
          repeat: Infinity,
          duration: 12,
          ease: [0.45, 0, 0.55, 1] as const,
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:140px_140px] opacity-10" />
    </div>
  );
}
