export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 max-w-2xl mx-auto px-6 py-20">
      <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-zinc-500 mb-4">Last updated: June 5, 2026</p>
      <div className="space-y-4">
        <h3 className="font-semibold">1. Data We Collect</h3>
        <p>We collect your email address, voice recordings, and AI-generated notes. We do not sell your data.</p>
        <h3 className="font-semibold">2. How We Use Your Data</h3>
        <p>Audio is sent to Deepgram for transcription. Data is stored in Supabase with encryption.</p>
        <h3 className="font-semibold">3. Third-Party Services</h3>
        <p>We use Deepgram, DeepSeek AI, Supabase, and Paddle.</p>
        <h3 className="font-semibold">4. Your Rights</h3>
        <p>You can delete your account and all data anytime by contacting us.</p>
        <h3 className="font-semibold">5. Contact</h3>
        <p>privacy@voxnote.app</p>
      </div>
    </div>
  );
}
