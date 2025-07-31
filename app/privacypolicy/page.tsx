'use client';

import React from 'react';
import Image from 'next/image';

const APP_NAME = 'Voixa';
const email = 'aloyebolu5@gmail.com'

export default function PrivacyPolicy() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10 text-#d4d4d4-800">
      <h1 className="text-4xl font-bold mb-6 text-center"><Image src="/logo.png" alt="Voixa Logo" width={50} height={50} />Privacy Policy</h1>
      <p className="text-sm text-center text-gray-500 mb-12">
        Last Updated: July 26, 2025
      </p>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
        <p className="mb-4">
          Welcome to {APP_NAME}. We are committed to protecting your personal
          data and your right to privacy. This Privacy Policy explains how we
          collect, use, store, and disclose your information when you use our
          services, including our mobile application and web platform.
        </p>
        <p>
          By using {APP_NAME}, you agree to the terms described in this policy.
          If you do not agree with our policies and practices, please do not use
          our services.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>
        <p className="mb-2">We collect the following types of information:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>Personal Information:</strong> Such as name, email address,
            phone number, profile picture, and any other information you
            voluntarily provide during registration or use.
          </li>
          <li>
            <strong>Usage Information:</strong> Data on how you use the app,
            interactions, preferences, and app settings.
          </li>
          <li>
            <strong>Device Information:</strong> Including device type, OS,
            language, unique device identifiers, IP address, and location data.
          </li>
          <li>
            <strong>Communication Data:</strong> Messages sent within the app,
            feedback submitted, and support queries.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">
          3. How We Use Your Information
        </h2>
        <p className="mb-2">We use the collected data for various purposes:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>To provide, maintain, and improve {APP_NAME}'s services</li>
          <li>To personalize user experience</li>
          <li>To manage user accounts and sessions</li>
          <li>To analyze usage trends and app performance</li>
          <li>To detect and prevent fraud and abuse</li>
          <li>
            To send transactional communications and, with your consent,
            promotional updates
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">4. Legal Basis</h2>
        <p>
          We process your personal data on the following legal bases:
        </p>
        <ul className="list-disc list-inside space-y-2 mt-2">
          <li>Consent</li>
          <li>Performance of a contract</li>
          <li>Compliance with legal obligations</li>
          <li>Legitimate interests pursued by {APP_NAME}</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">
          5. Sharing Your Information
        </h2>
        <p className="mb-2">
          We may share your personal information with third parties only when
          necessary:
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>Service Providers:</strong> To facilitate services such as
            hosting, analytics, customer support, and communication.
          </li>
          <li>
            <strong>Legal Authorities:</strong> When required by law or to
            protect rights and safety.
          </li>
          <li>
            <strong>Affiliates:</strong> In case of business transfers such as
            mergers or acquisitions.
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">
          6. Data Retention
        </h2>
        <p>
          We retain your information as long as necessary to fulfill the
          purposes outlined in this policy, unless a longer retention period is
          required or permitted by law.
        </p>
        <p className="mt-2">
          You may request deletion of your account and associated data at any
          time.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">
          7. Security Measures
        </h2>
        <p>
          {APP_NAME} implements industry-standard technical and organizational
          measures to protect your data from unauthorized access, disclosure,
          alteration, or destruction.
        </p>
        <p className="mt-2">
          Despite our efforts, no system can be 100% secure. You are responsible
          for maintaining the secrecy of your login credentials and for
          controlling access to your account.
        </p>
      </section>
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">8. Cookies and Tracking Technologies</h2>
        <p className="mb-2">
          We use cookies and similar tracking technologies to improve your experience on {APP_NAME}, analyze usage patterns, and personalize content. These may include:
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong>Session Cookies:</strong> For user authentication and session management.</li>
          <li><strong>Analytics Cookies:</strong> To gather anonymous usage statistics.</li>
          <li><strong>Preference Cookies:</strong> To remember user preferences.</li>
        </ul>
        <p className="mt-2">
          You can control or disable cookies through your browser settings. However, doing so may impact certain features of the platform.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">9. Your Data Protection Rights</h2>
        <p className="mb-2">You have the following rights with respect to your data:</p>
        <ul className="list-disc list-inside space-y-2">
          <li><strong>Right to Access:</strong> You can request a copy of the data we hold about you.</li>
          <li><strong>Right to Rectification:</strong> You may correct or update inaccurate or incomplete information.</li>
          <li><strong>Right to Erasure:</strong> You can request that your personal data be deleted.</li>
          <li><strong>Right to Restrict Processing:</strong> You may request that we limit how we use your data.</li>
          <li><strong>Right to Data Portability:</strong> You can request a structured copy of your data.</li>
          <li><strong>Right to Object:</strong> You can object to certain types of processing, including direct marketing.</li>
        </ul>
        <p className="mt-2">
          To exercise any of these rights, please contact our support team or email us directly.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">10. Children's Privacy</h2>
        <p>
          {APP_NAME} is not intended for use by children under the age of 13. We do not knowingly collect personal information from children. If we become aware that we have collected personal data from a child without parental consent, we will take steps to remove that information promptly.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">11. International Users</h2>
        <p>
          If you are accessing {APP_NAME} from outside your country of residence, be aware that your information may be transferred to, stored, and processed in other countries where our servers are located. We take appropriate measures to ensure data protection consistent with your location’s applicable laws.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">12. Third-Party Services</h2>
        <p className="mb-2">
          We may link to third-party services, apps, or websites. These services are not controlled by {APP_NAME}, and we are not responsible for their privacy practices. We encourage you to review the privacy policies of any third-party services you interact with.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">13. Data Breach Procedures</h2>
        <p>
          In the event of a data breach, {APP_NAME} will notify affected users within 72 hours (when feasible), including the nature of the breach, what data may be affected, and any recommended actions to protect yourself.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">14. Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time to reflect changes in legal requirements or our data processing practices. When we do, we will revise the “Last Updated” date at the top of this page and may notify you via email or app notification.
        </p>
        <p className="mt-2">
          Your continued use of {APP_NAME} after any updates constitutes your acceptance of those changes.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">15. Contact Us</h2>
        <p>
          If you have any questions, concerns, or feedback regarding this Privacy Policy or our privacy practices, please contact us:
        </p>
        <ul className="list-none mt-4 space-y-1">
          <li><strong>Email:</strong> {email}</li>
          <li><strong>Address:</strong> 1234 Digital Lane, Cloud City, Webland</li>
        </ul>
      </section>

      <footer className="mt-16 border-t pt-6 text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </footer>
    </main>
  );
}
