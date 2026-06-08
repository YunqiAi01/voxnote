"use client";

import { useState, useEffect } from "react";
import RecordButton from "@/components/RecordButton";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UpgradeModal from "@/components/UpgradeModal";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type AppState = "idle" | "recorded" | "transcribing" | "transcribed" | "organizing";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [organized, setOrganized] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const [notesRemaining, setNotesRemaining] = useState<number | null>(null);
  const [organizeRemaining, setOrganizeRemaining] = useState<number | null>(null);
  const [tier, setTier] = useState<"free" | "pro">("free");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalTitle, setUpgradeModalTitle] = useState("");
  const [upgradeModalMessage, setUpgradeModalMessage] = useState("");
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);

  // Check auth
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
  }, []);

  // Handle recording complete
  const handleRecordingComplete = (blob: Blob, url: string) => {
    setAudioBlob(blob);
    setAudioUrl(url);
    setTranscript("");
    setOrganized("");
    setError("");
    setSaved(false);
    setAppState("recorded");
  };

  // Send audio to transcribe API
  const handleTranscribe = async () => {
    if (!audioBlob) return;

    setAppState("transcribing");
    setError("");

    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: audioBlob,
        headers: {
          "Content-Type": "audio/webm",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.limitReached) {
          setUpgradeModalTitle("免费额度已用完");
          setUpgradeModalMessage("你已用完 3 条免费笔记，升级 Pro 解锁无限笔记。");
          setShowUpgradeModal(true);
          setAppState("idle");
          return;
        }
        throw new Error(data.error || "转写失败");
      }

      setTranscript(data.transcript);
      setIsTruncated(data.isTruncated || false);
      setNotesRemaining(data.notesRemaining ?? null);
      setTier(data.tier || "free");
      setAppState("transcribed");

      // Auto-save after transcription
      {
        const supabase = createClient();
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: note, error: saveErr } = await supabase
            .from("notes")
            .insert({ transcript: data.transcript, user_id: currentUser.id })
            .select("id")
            .single();
          if (!saveErr && note) {
            setCurrentNoteId(note.id);
            setSaved(true);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "转写出错，请重试");
      setAppState("recorded");
    }
  };

  // Send text to organize API
  const handleOrganize = async () => {
    if (!transcript.trim()) return;

    setAppState("organizing");
    setError("");

    try {
      const response = await fetch("/api/organize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: transcript }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.limitReached) {
          setUpgradeModalTitle("整理次数已用完");
          setUpgradeModalMessage("免费版仅提供 3 次 AI 整理，升级 Pro 无限使用。");
          setShowUpgradeModal(true);
          setAppState("transcribed");
          return;
        }
        throw new Error(data.error || "整理失败");
      }

      setOrganized(data.organized);
      setOrganizeRemaining(data.organizeRemaining ?? null);
      setAppState("transcribed");

      // Auto-save organized content
      {
        const supabase = createClient();
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          if (currentNoteId) {
            await supabase.from("notes").update({ organized: data.organized }).eq("id", currentNoteId);
          } else {
            const { data: latest } = await supabase
              .from("notes")
              .select("id")
              .eq("user_id", currentUser.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();
            if (latest) {
              await supabase.from("notes").update({ organized: data.organized }).eq("id", latest.id);
            }
          }
          setSaved(true);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "整理出错，请重试");
      setAppState("transcribed");
    }
  };

  // Reset everything
  const handleReset = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscript("");
    setOrganized("");
    setError("");
    setSaved(false);
    setAppState("idle");
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header />

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* ---- IDLE / RECORDED State: Recording Section ---- */}
        {(appState === "idle" || appState === "recorded") && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {appState === "idle" ? "开始录音" : "录音完成"}
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-md">
                {appState === "idle"
                  ? "点击下方按钮开始录制，把你的想法、会议或课程内容说出来"
                  : `${(audioBlob!.size / 1024).toFixed(1)} KB · 点击转写或重新录制`}
              </p>
            </div>

            <RecordButton
              onRecordingComplete={handleRecordingComplete}
              onRecordingStart={() => {
                setAudioBlob(null);
                setAudioUrl(null);
                setTranscript("");
                setOrganized("");
                setError("");
                setSaved(false);
                setAppState("idle");
              }}
            />

            {/* Audio playback after recording */}
            {audioUrl && appState === "recorded" && (
              <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                <audio
                  src={audioUrl}
                  controls
                  className="w-full h-10 [&::-webkit-media-controls-panel]:bg-zinc-100 dark:[&::-webkit-media-controls-panel]:bg-zinc-800 rounded-lg"
                />

                <button
                  onClick={handleTranscribe}
                  className="w-full py-3 px-6 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium text-sm hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
                >
                  转写为文字
                </button>
              </div>
            )}

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-sm max-w-sm text-center">
                {error}
              </div>
            )}
          </div>
        )}

        {/* ---- TRANSCRIBING State ---- */}
        {appState === "transcribing" && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-zinc-500" />
              </span>
              <span className="text-zinc-500 dark:text-zinc-400 text-sm">
                AI 正在转写语音...
              </span>
            </div>
            <div className="w-48 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-zinc-900 dark:bg-white rounded-full animate-shimmer" />
            </div>
          </div>
        )}

        {/* ---- TRANSCRIBED + ORGANIZING State: Results ---- */}
        {(appState === "transcribed" || appState === "organizing") && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  转写结果
                </h2>
                {tier === "free" && notesRemaining !== null && (
                  <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    剩余 {notesRemaining} 条
                  </span>
                )}
                {tier === "pro" && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/50">
                    Pro
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Organize button */}
                {!organized && appState !== "organizing" && (
                  <button
                    onClick={handleOrganize}
                    className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium text-sm hover:from-violet-500 hover:to-indigo-500 transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98]"
                  >
                    <svg
                      className="w-4 h-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                    一键整理
                  </button>
                )}

                {organized && <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/50">已整理</span>}

                {appState === "organizing" && (
                  <span className="text-xs text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 px-3 py-1 rounded-full border border-violet-200 dark:border-violet-800/50 animate-pulse">AI 整理中...</span>
                )}

                {/* Save button (only when logged in) */}
                {saved && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                    已自动保存
                  </span>
                )}

                <button
                  onClick={handleReset}
                  className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  重新开始
                </button>
              </div>
            </div>

            {/* Side-by-side comparison */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original transcript */}
              <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 p-6 space-y-3">
                <h3 className="text-sm font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  原始口语稿
                </h3>
                <div className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {transcript || "（无内容）"}
                </div>
                {isTruncated && tier === "free" && (
                  <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50">
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                      🔒 免费版仅转写前 10 分钟，剩余内容已锁定
                    </p>
                    <a
                      href="/pricing"
                      className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                    >
                      升级 Pro 解锁全部内容 →
                    </a>
                  </div>
                )}
              </div>

              {/* Organized notes */}
              <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-900 p-6 space-y-3">
                <h3 className="text-sm font-medium text-violet-500 uppercase tracking-wider">
                  结构化笔记
                </h3>
                {organized ? (
                  <div
                    className="prose prose-sm prose-zinc dark:prose-invert max-w-none
                      prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100
                      prose-h3:text-base prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3
                      prose-ul:my-2 prose-li:my-1
                      prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(organized),
                    }}
                  />
                ) : (
                  <p className="text-zinc-400 dark:text-zinc-500 text-sm italic">
                    {appState === "organizing"
                      ? "AI 正在整理中..."
                      : "点击「一键整理」生成结构化笔记"}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-sm text-center">
                {error}
              </div>
            )}
          </div>
        )}
      </main>

      <UpgradeModal
        open={showUpgradeModal}
        title={upgradeModalTitle}
        message={upgradeModalMessage}
        onClose={() => setShowUpgradeModal(false)}
      />

      <Footer />
    </div>
  );
}

/**
 * Simple Markdown to HTML renderer for the organized notes
 */
function renderMarkdown(md: string): string {
  let html = md
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");

  html = "<p>" + html + "</p>";
  return html;
}
