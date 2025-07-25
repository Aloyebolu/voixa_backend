import React from 'react';


export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold mb-6 text-center text-primary">Voixa Privacy Policy</h1>
      <div className="h-[80vh] p-4 border rounded-xl shadow-md">
        <div className="p-6 space-y-6">
          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-semibold">1. Data Collection</h2>
              <p>
                We collect email (used only for login and account tracking), encrypted passwords, and country
                (used for user visibility and personalization). All data is collected with user consent during
                registration.
              </p>
            </section>

            <hr />

            <section>
              <h2 className="text-2xl font-semibold">2. Automatic Data</h2>
              <p>
                The app collects technical data like device type, OS version, language, and interaction events
                for analytics and crash reporting purposes. This helps improve user experience and system
                stability.
              </p>
            </section>

            <hr />

            <section>
              <h2 className="text-2xl font-semibold">3. Third-Party Services</h2>
              <p>
                We integrate services like Google Firebase (authentication, real-time database), and Sentry
                (error tracking). These services may collect and process data on our behalf and are compliant
                with privacy regulations.
              </p>
            </section>

            <hr />

            <section>
              <h2 className="text-2xl font-semibold">4. Sensitive Data</h2>
              <p>
                Voixa does not collect sensitive personal data such as financial information or health records.
                User messages are end-to-end encrypted and not accessible by us.
              </p>
            </section>

            <hr />

            <section>
              <h2 className="text-2xl font-semibold">5. Purpose of Collection</h2>
              <p>
                Data is collected solely for improving the platform, user account management, moderation,
                personalized content, and to deliver end-to-end encrypted messaging.
              </p>
            </section>

            <hr />
            <section>
              <h2 className="text-2xl font-semibold">6. Internal Usage</h2>
              <p>
                All user data is used strictly within Voixa’s services and is not sold or shared with external
                advertisers.
              </p>
            </section>

            <hr />
            <section>
              <h2 className="text-2xl font-semibold">7. External Sharing</h2>
              <p>
                No personally identifiable information is shared with third parties unless required by law or
                with user consent. Aggregated, anonymized data may be used for analytics.
              </p>
            </section>

            <hr />
            <section>
              <h2 className="text-2xl font-semibold">8. Storage and Method</h2>
              <p>
                User data is stored securely in Google Firebase (EU servers preferred) with real-time encryption
                at rest and in transit.
              </p>
            </section>

            <hr />
            <section>
              <h2 className="text-2xl font-semibold">9. Encryption</h2>
              <p>
                Passwords are hashed using strong algorithms. Messages are encrypted end-to-end between users
                using modern cryptography practices (e.g., AES, RSA).
              </p>
            </section>

            <hr />
            <section>
              <h2 className="text-2xl font-semibold">10. Retention Policy</h2>
              <p>
                User data is retained as long as the account is active. Users can delete their accounts to
                remove all associated data permanently.
              </p>
            </section>

            <hr />
            <section>
              <h2 className="text-2xl font-semibold">11. User Rights</h2>
              <p>
                Users have the right to access, update, export, and delete their data. These actions can be
                performed through settings or by contacting support.
              </p>
            </section>

            <hr />
            <section>
              <h2 className="text-2xl font-semibold">12. Age Policy</h2>
              <p>
                Voixa is intended for users aged 13 and above. We do not knowingly collect data from children
                under 13. If we learn this has occurred, we will delete the data.
              </p>
            </section>

            <hr />
            <section>
              <h2 className="text-2xl font-semibold">13. Cookies & Tracking</h2>
              <p>
                Cookies may be used for session management and analytics. No advertising or cross-site tracking
                is performed.
              </p>
            </section>

            <hr />
            <section>
              <h2 className="text-2xl font-semibold">14. Compliance</h2>
              <p>
                Voixa complies with GDPR (EU), CCPA (California), and other global data protection regulations.
                We adhere to the principles of data minimization, transparency, and purpose limitation.
              </p>
            </section>

            <hr />
            <section>
              <h2 className="text-2xl font-semibold">15. Changes to Policy</h2>
              <p>
                We may update this Privacy Policy occasionally. Users will be notified through in-app alerts or
                email when significant changes are made.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
