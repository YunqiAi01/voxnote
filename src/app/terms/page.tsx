import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Header />
      <div className="max-w-2xl mx-auto px-6 py-20">
        <h1 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-zinc-50">Terms of Service</h1>
        <p className="text-sm text-zinc-500 mb-4">Last updated: June 5, 2026</p>
        <div className="space-y-4 text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">
          <p>Welcome to VoxNote. By using our service, you agree to these terms.</p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">1. Service Description</h3>
          <p>VoxNote provides voice transcription and AI-powered note organization. We offer both free and paid subscription tiers.</p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">2. User Accounts</h3>
          <p>You are responsible for maintaining the security of your account.</p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">3. Payments</h3>
          <p>Paid subscriptions are billed via Paddle. Refunds are handled per our Refund Policy.</p>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">4. Contact</h3>
          <p>support@getvoxnote.com</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
