"use client";

import { useState, useRef, useCallback } from "react";

interface RecordButtonProps {
  onRecordingComplete: (blob: Blob, audioUrl: string) => void;
  onRecordingStart: () => void;
  isDisabled?: boolean;
}

export default function RecordButton({
  onRecordingComplete,
  onRecordingStart,
  isDisabled = false,
}: RecordButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(blob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());

        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        onRecordingComplete(blob, audioUrl);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      onRecordingStart();

      // Start duration counter
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("无法访问麦克风:", error);
      alert("请允许浏览器访问麦克风以使用录音功能");
    }
  }, [onRecordingComplete, onRecordingStart]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const handleClick = () => {
    if (isDisabled) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      {/* Duration display */}
      {isRecording && (
        <div className="flex items-center gap-2 text-red-500 font-mono text-lg">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          {formatTime(duration)}
        </div>
      )}

      {/* Record button */}
      <button
        onClick={handleClick}
        disabled={isDisabled}
        className={`
          group relative flex items-center justify-center
          w-24 h-24 rounded-full
          transition-all duration-300 ease-out
          focus:outline-none focus:ring-4 focus:ring-offset-4
          ${
            isRecording
              ? "focus:ring-red-300/50"
              : "focus:ring-zinc-300/50"
          }
          ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
        aria-label={isRecording ? "停止录音" : "开始录音"}
      >
        {/* Outer glow ring */}
        <span
          className={`
            absolute inset-0 rounded-full
            transition-all duration-500
            ${isRecording ? "bg-red-500/20 scale-150" : "bg-zinc-200/50 scale-100"}
          `}
        />

        {/* Pulse animation rings when recording */}
        {isRecording && (
          <>
            <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
            <span className="absolute inset-0 rounded-full bg-red-500/20 animate-pulse [animation-delay:0.2s]" />
          </>
        )}

        {/* Main button body */}
        <span
          className={`
            relative z-10 flex items-center justify-center
            w-[72px] h-[72px] rounded-full
            shadow-lg ring-1
            transition-all duration-300 ease-out
            ${
              isRecording
                ? "bg-red-500 ring-red-400 scale-95 shadow-red-500/50"
                : "bg-zinc-900 ring-zinc-700 hover:scale-105 hover:shadow-xl hover:bg-zinc-800"
            }
          `}
        >
          {/* Mic icon or stop icon */}
          {isRecording ? (
            <svg
              className="w-7 h-7 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          ) : (
            <svg
              className="w-7 h-7 text-white transition-transform duration-300 group-hover:scale-110"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          )}
        </span>
      </button>

      {/* Label */}
      <span
        className={`
          text-sm font-medium transition-colors duration-300
          ${isRecording ? "text-red-500" : "text-zinc-500"}
        `}
      >
        {isRecording ? "点击停止" : "点击录音"}
      </span>
    </div>
  );
}
