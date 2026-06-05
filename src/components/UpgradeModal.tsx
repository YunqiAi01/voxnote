"use client";

import Link from "next/link";

interface UpgradeModalProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export default function UpgradeModal({ open, title, message, onClose }: UpgradeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <svg className="w-7 h-7 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
            {title}
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {message}
          </p>
        </div>

        <div className="space-y-3">
          <Link
            href="/pricing"
            className="block w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm text-center hover:from-amber-400 hover:to-orange-400 transition-all hover:shadow-lg hover:shadow-amber-500/25 active:scale-[0.98]"
          >
            查看升级方案
          </Link>
          <button
            onClick={onClose}
            className="block w-full py-2.5 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
          >
            以后再说
          </button>
        </div>
      </div>
    </div>
  );
}
