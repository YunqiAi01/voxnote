export default function Footer() {
  return (
    <footer className="border-t border-zinc-200/60 dark:border-zinc-800/60 bg-white dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-zinc-400 dark:text-zinc-500">
          <span>&copy; {new Date().getFullYear()} VoxNote</span>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <span>support@getvoxnote.com</span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="/terms"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            Terms of Service
          </a>
          <a
            href="/privacy"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            Privacy Policy
          </a>
          <a
            href="/refund"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            Refund Policy
          </a>
        </div>
      </div>
    </footer>
  );
}
