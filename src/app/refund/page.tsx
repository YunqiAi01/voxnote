import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header />
      <div className="max-w-2xl mx-auto px-6 py-20">
        <h1 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-50">Refund Policy</h1>
        <p className="text-sm text-zinc-500 mb-4">Last updated: June 5, 2026</p>
        <div className="space-y-4 text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">1. 30-Day Money-Back Guarantee</h3>
          <p>Not satisfied? Request a full refund within 30 days of purchase.</p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">2. How to Request</h3>
          <p>Email support@getvoxnote.com with your order details. Processed within 5 business days.</p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">3. Limitations</h3>
          <p>Flash sale purchases are non-refundable.</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
