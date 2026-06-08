import Header from "@/components/Header";
import Footer from "@/components/Footer";

const flashEnd = new Date("2026-12-31T23:59:59").getTime();

const errorMessages: Record<string, string> = {
  checkout_failed: "支付创建失败，请稍后重试",
  no_checkout_url: "支付链接生成失败",
  checkout_error: "网络错误，请检查网络后重试",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; detail?: string; checkout?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;
  const detail = params.detail;
  const success = params.checkout;
  const now = Date.now();
  const flashActive = now < flashEnd;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header />

      <main className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
            选择你的计划
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400">
            免费开始，随时升级解锁全部功能
          </p>
        </div>

        {/* Success / Error Message */}
        {success === "success" && (
          <div className="max-w-xl mx-auto mb-8 p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
            <div className="text-emerald-700 dark:text-emerald-300 font-semibold text-base mb-1">
              🎉 支付成功！
            </div>
            <p className="text-emerald-600 dark:text-emerald-400 text-sm">
              你的 Pro 会员已激活，刷新页面即可查看。
            </p>
          </div>
        )}
        {error && errorMessages[error] && (
          <div className="max-w-xl mx-auto mb-8 p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-600">
            <div className="text-amber-800 dark:text-amber-200 font-semibold text-base mb-2">
              ⚠️ {errorMessages[error]}
            </div>
            {detail && (
              <div className="text-xs text-amber-700 dark:text-amber-300 break-all mb-3 bg-amber-100 dark:bg-amber-950/40 p-2 rounded-lg font-mono">
                {decodeURIComponent(detail)}
              </div>
            )}
            <div className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <p className="font-medium">可能的原因：</p>
              <ul className="list-disc list-inside text-xs space-y-0.5 opacity-80">
                <li>域名未在 Paddle 后台审批（检查 Paddle → Settings → Domain approval）</li>
                <li>支付方式未配置（检查 Paddle → Checkout settings）</li>
                <li>Price ID 或 API Key 配置错误</li>
              </ul>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {/* Free */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">免费</h3>
            <p className="text-sm text-zinc-500 mt-1 mb-4">体验核心功能</p>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
              $0<span className="text-base font-normal text-zinc-400">/月</span>
            </div>
            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400 flex-1">
              <li className="flex items-start gap-2">
                <span className="text-zinc-400 mt-0.5">✓</span> 3 条笔记
              </li>
              <li className="flex items-start gap-2">
                <span className="text-zinc-400 mt-0.5">✓</span> 不限录制时长
              </li>
              <li className="flex items-start gap-2">
                <span className="text-zinc-400 mt-0.5">✓</span> 前 10 分钟转写
              </li>
              <li className="flex items-start gap-2">
                <span className="text-zinc-400 mt-0.5">✓</span> 3 次 AI 整理
              </li>
            </ul>
            <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <span className="block w-full text-center py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-sm font-medium">
                当前计划
              </span>
            </div>
          </div>

          {/* Flash Sale */}
          {flashActive && (
            <div className="rounded-2xl border-2 border-amber-400 dark:border-amber-500 bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-zinc-900 p-6 flex flex-col relative overflow-hidden">
              <div className="absolute top-3 right-3 bg-amber-400 text-amber-900 text-xs font-bold px-2 py-1 rounded-full">
                限时秒杀
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Pro 秒杀</h3>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1 mb-4">每人限购一次</p>
              <div className="mb-1">
                <span className="text-sm text-zinc-400 line-through">$14.97</span>
              </div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                $9.99<span className="text-base font-normal text-zinc-400">/3个月</span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-6">
                折合 $3.33/月 · 截至 2026 年底
              </p>
              <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400 flex-1">
                <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">✓</span> Pro 全部功能</li>
                <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">✓</span> 无限笔记</li>
                <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">✓</span> 每条最长 60 分钟</li>
                <li className="flex items-start gap-2"><span className="text-amber-500 mt-0.5">✓</span> 无限 AI 整理</li>
              </ul>
              <div className="mt-6 pt-6 border-t border-amber-200 dark:border-amber-800/50">
                <a
                  href="/api/checkout?plan=flash"
                  className="block w-full text-center py-2.5 rounded-xl bg-amber-400 text-amber-900 font-semibold text-sm hover:bg-amber-300 transition-colors"
                >
                  立即抢购
                </a>
              </div>
            </div>
          )}

          {/* Monthly */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Pro</h3>
            <p className="text-sm text-zinc-500 mt-1 mb-4">月付灵活</p>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-6">
              $4.99<span className="text-base font-normal text-zinc-400">/月</span>
            </div>
            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400 flex-1">
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> 无限笔记</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> 每条最长 60 分钟</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> 无限 AI 整理</li>
            </ul>
            <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <a
                href="/api/checkout?plan=monthly"
                className="block w-full text-center py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium text-sm hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
              >
                订阅月付
              </a>
            </div>
          </div>

          {/* Yearly */}
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Pro 年付</h3>
            <p className="text-sm text-zinc-500 mt-1 mb-4">省 33%</p>
            <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
              $39.99<span className="text-base font-normal text-zinc-400">/年</span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-6">折合 $3.33/月</p>
            <ul className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400 flex-1">
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> Pro 全部功能</li>
              <li className="flex items-start gap-2"><span className="text-emerald-500 mt-0.5">✓</span> 相当于每月仅 $3.33</li>
            </ul>
            <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
              <a
                href="/api/checkout?plan=yearly"
                className="block w-full text-center py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium text-sm hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
              >
                订阅年付
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
