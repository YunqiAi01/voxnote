export default function RefundPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 max-w-2xl mx-auto px-6 py-20">
      <h1 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-50">Refund Policy</h1>
      <p className="text-sm text-zinc-500 mb-4">Last updated: June 5, 2026</p>
      <div className="prose prose-sm text-zinc-700 dark:text-zinc-300 space-y-4">
        <h3 className="text-zinc-900 dark:text-zinc-50 font-semibold">1. 30-Day Money-Back Guarantee</h3>
        <p>If you are not satisfied with VoxNote Pro, you can request a full refund within 30 days of purchase.</p>
        <h3 className="text-zinc-900 dark:text-zinc-50 font-semibold">2. How to Request a Refund</h3>
        <p>Email us at support@voxnote.app with your order details. We will process your request within 5 business days.</p>
        <h3 className="text-zinc-900 dark:text-zinc-50 font-semibold">3. Limitations</h3>
        <p>Flash sale purchases are final and non-refundable. Subscription cancellations take effect at the end of the current billing period.</p>
      </div>
    </div>
  );
}
