export default function RefundPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 max-w-2xl mx-auto px-6 py-20">
      <h1 className="text-2xl font-bold mb-6">Refund Policy</h1>
      <p className="text-sm text-zinc-500 mb-4">Last updated: June 5, 2026</p>
      <div className="space-y-4">
        <h3 className="font-semibold">1. 30-Day Money-Back Guarantee</h3>
        <p>Not satisfied? Request a full refund within 30 days of purchase.</p>
        <h3 className="font-semibold">2. How to Request</h3>
        <p>Email support@voxnote.app with your order details. Processed within 5 business days.</p>
        <h3 className="font-semibold">3. Limitations</h3>
        <p>Flash sale purchases are non-refundable.</p>
      </div>
    </div>
  );
}
