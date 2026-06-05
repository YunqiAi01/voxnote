"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Note {
  id: string;
  transcript: string;
  organized: string | null;
  created_at: string;
}

export default function HistoryPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    // Check user is logged in
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("notes")
      .select("id, transcript, organized, created_at")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError("加载笔记失败: " + fetchError.message);
    } else {
      setNotes(data || []);
    }

    setLoading(false);
  }

  async function deleteNote(id: string) {
    if (!confirm("确定删除这条笔记？")) return;

    setDeleting(id);
    const supabase = createClient();

    const { error } = await supabase.from("notes").delete().eq("id", id);

    if (error) {
      setError("删除失败: " + error.message);
    } else {
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (selectedNote?.id === id) setSelectedNote(null);
    }

    setDeleting(null);
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);

    if (hours < 1) return "刚刚";
    if (hours < 24) return `${hours} 小时前`;
    if (hours < 48) return "昨天";
    return d.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <Header />
        <main className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3 text-zinc-400">
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            加载中...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              历史笔记
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              共 {notes.length} 条记录
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
          >
            + 新建笔记
          </Link>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {notes.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <svg
                className="w-7 h-7 text-zinc-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" x2="8" y1="13" y2="13" />
                <line x1="16" x2="8" y1="17" y2="17" />
                <line x1="10" x2="8" y1="9" y2="9" />
              </svg>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              还没有笔记，去录制第一条吧
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Notes list */}
            <div className="lg:col-span-1 space-y-2">
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                    selectedNote?.id === note.id
                      ? "border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-800 shadow-sm"
                      : "border-transparent hover:bg-white dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-2">
                    {note.transcript.slice(0, 80) ||
                      "（无内容）"}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-zinc-400">
                      {formatDate(note.created_at)}
                    </span>
                    {note.organized && (
                      <span className="text-xs text-violet-500">已整理</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Note detail */}
            <div className="lg:col-span-2">
              {selectedNote ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400">
                      {new Date(selectedNote.created_at).toLocaleString("zh-CN")}
                    </span>
                    <button
                      onClick={() => deleteNote(selectedNote.id)}
                      disabled={deleting === selectedNote.id}
                      className="text-xs text-red-500 hover:text-red-600 disabled:opacity-50 transition-colors"
                    >
                      {deleting === selectedNote.id ? "删除中..." : "删除"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {/* Original transcript */}
                    <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 p-5 space-y-2">
                      <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        原始口语稿
                      </h3>
                      <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {selectedNote.transcript || "（无内容）"}
                      </p>
                    </div>

                    {/* Organized notes */}
                    <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 p-5 space-y-2">
                      <h3 className="text-xs font-medium text-violet-500 uppercase tracking-wider">
                        结构化笔记
                      </h3>
                      {selectedNote.organized ? (
                        <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                          {selectedNote.organized}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-400 italic">
                          未整理
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full min-h-[200px] text-sm text-zinc-400">
                  选择左侧笔记查看详情
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
