export const metadata = { title: "Privacy Policy — Omni by KAVAR" }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 py-16 px-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: May 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. About Omni</h2>
          <p className="text-gray-700 leading-relaxed">
            Omni is an operational dashboard developed by KAVAR LLC that helps business owners
            manage clients, tasks, metrics, and social media integrations from a single platform.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Data We Collect</h2>
          <p className="text-gray-700 leading-relaxed">
            When you connect your Instagram account or Meta Ads account, Omni accesses:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-1 ml-2">
            <li>Your Instagram profile information (username, follower count, profile picture)</li>
            <li>Your Instagram media and engagement metrics</li>
            <li>Your Meta Ads account information, campaign data, and performance metrics</li>
            <li>Your Facebook Pages information</li>
          </ul>
          <p className="text-gray-700 leading-relaxed">
            This data is stored securely in your private Omni instance using AES-256-GCM encryption
            for sensitive tokens.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. How We Use Your Data</h2>
          <p className="text-gray-700 leading-relaxed">
            Your data is used exclusively to display metrics and analytics within your Omni dashboard.
            We do not sell, share, or transfer your data to third parties. Each Omni instance is
            single-tenant — your data is never shared with other Omni users.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Data Retention</h2>
          <p className="text-gray-700 leading-relaxed">
            Your data is retained as long as your Omni subscription is active. You can disconnect
            any integration at any time from your Settings page, which will remove your access tokens.
            You may request complete data deletion by contacting us.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Security</h2>
          <p className="text-gray-700 leading-relaxed">
            All OAuth access tokens are encrypted at rest using AES-256-GCM encryption before being
            stored in the database. We use Row Level Security (RLS) to ensure each user can only
            access their own data. All connections are encrypted in transit via HTTPS.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Your Rights</h2>
          <p className="text-gray-700 leading-relaxed">
            You have the right to access, correct, or delete your personal data at any time.
            To exercise these rights, contact us at the email below.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Contact</h2>
          <p className="text-gray-700 leading-relaxed">
            For privacy-related questions or data deletion requests:
          </p>
          <p className="text-gray-700">
            <strong>KAVAR LLC</strong><br />
            Email:{" "}
            <a href="mailto:juampiacosta158@gmail.com" className="text-blue-600 underline">
              juampiacosta158@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}
