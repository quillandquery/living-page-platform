import type { Metadata } from "next";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { LegalShell, CONTACT_EMAIL } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Living Page collects, why, and the choices you have.",
  alternates: { canonical: absoluteUrl("/privacy") },
  openGraph: { title: `Privacy Policy — ${SITE_NAME}`, url: absoluteUrl("/privacy"), siteName: SITE_NAME, type: "website" },
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="1 November 2026">
      <p>
        Living Page is a place to write a story and have it become a page. This policy says what
        we collect when you use it, what we do with that, and what you can ask us to change.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details.</strong> Your email address and a password (stored hashed, never readable by us). If you sign in with Google, we receive your name, email address and profile picture from Google. We don&rsquo;t get your password or access to anything else in your Google account.</li>
        <li><strong>Your profile.</strong> The handle, display name and short bio you choose. These are public on your writer page.</li>
        <li><strong>Your stories.</strong> Drafts and published stories, including the art direction you pick. Drafts are private to you. Published stories are visible to readers according to the visibility you set.</li>
        <li><strong>Usage data.</strong> Which pages are viewed and how the product is used, collected through analytics tools (see below).</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run your account, sign you in, and show your stories.</li>
        <li>To turn your writing into its visual form. This analysis happens on our own systems.</li>
        <li>To understand what&rsquo;s working and fix what isn&rsquo;t.</li>
        <li>To email you about your account, such as confirming your address.</li>
      </ul>
      <p>We don&rsquo;t sell your personal information, and we don&rsquo;t show ads.</p>

      <h2>Who else handles your data</h2>
      <ul>
        <li><strong>Supabase</strong> hosts our database and authentication.</li>
        <li><strong>Google</strong> provides sign-in if you choose it, and analytics if enabled.</li>
        <li><strong>PostHog</strong> provides product analytics, if enabled.</li>
        <li><strong>Anthropic</strong> may process a passage of your text only when you click one of the optional writing-assistance buttons in the editor. Nothing is sent otherwise.</li>
      </ul>
      <p>Our hosting and these providers may process data outside your country.</p>

      <h2>Cookies</h2>
      <p>
        We use cookies to keep you signed in. Analytics tools may set their own cookies to count
        visits. You can block cookies in your browser; signing in won&rsquo;t work without the
        essential one.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Edit your profile and stories at any time.</li>
        <li>Make a story private or unpublish it.</li>
        <li>Ask us to delete your account and everything on it, or to send you a copy of your data, by emailing us.</li>
        <li>Disconnect Google at any time from your Google Account settings; this doesn&rsquo;t delete your Living Page account.</li>
      </ul>

      <h2>Keeping it safe</h2>
      <p>
        Access to stories is controlled at the database level, so private drafts stay private.
        No system is perfectly secure, but we take reasonable steps to protect your data.
      </p>

      <h2>Children</h2>
      <p>Living Page isn&rsquo;t meant for children under 13, and we don&rsquo;t knowingly collect their information.</p>

      <h2>Changes</h2>
      <p>If we change this policy in a way that matters, we&rsquo;ll update the date above and, where we can, tell you.</p>

      <h2>Contact</h2>
      <p>Questions or requests: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalShell>
  );
}
