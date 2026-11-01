import Link from "next/link";
import type { Metadata } from "next";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { LegalShell, CONTACT_EMAIL } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The rules for using Living Page.",
  alternates: { canonical: absoluteUrl("/terms") },
  openGraph: { title: `Terms of Service — ${SITE_NAME}`, url: absoluteUrl("/terms"), siteName: SITE_NAME, type: "website" },
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="1 November 2026">
      <p>
        By creating an account or using Living Page, you agree to these terms. If you
        don&rsquo;t agree, please don&rsquo;t use it.
      </p>

      <h2>Your account</h2>
      <p>
        You&rsquo;re responsible for your account and for what happens under it. Give us accurate
        details and keep your sign-in secure. You must be at least 13 to use Living Page.
      </p>

      <h2>Your stories are yours</h2>
      <p>
        You keep ownership of everything you write. By publishing, you give us permission to host,
        display and transform your story into its visual form so readers can see it, and to show
        it on pages like your writer page and discovery surfaces if you&rsquo;ve made it public.
        That permission ends when you delete the story or your account, apart from short-lived
        backups and copies others have already seen.
      </p>
      <p>
        Only post things you wrote or have the right to share. Stories are meant to be true
        accounts and original writing.
      </p>

      <h2>What not to do</h2>
      <ul>
        <li>Post anything unlawful, hateful, harassing, or that exposes someone&rsquo;s private information.</li>
        <li>Infringe someone else&rsquo;s copyright or other rights.</li>
        <li>Upload malware, or try to break, overload, or get around the security of the service.</li>
        <li>Scrape the site in bulk or pretend to be someone else.</li>
      </ul>
      <p>
        We may remove content or suspend accounts that break these rules. If you think we got it
        wrong, email us.
      </p>

      <h2>Our part</h2>
      <p>
        The Living Page software, design and visual system belong to us. We work to keep the
        service running, but it&rsquo;s provided &ldquo;as is&rdquo;: it may change, have bugs, or be
        unavailable at times, and we can&rsquo;t guarantee a particular result from the way your
        story is rendered.
      </p>

      <h2>Limits of liability</h2>
      <p>
        To the extent the law allows, we aren&rsquo;t liable for indirect or consequential losses
        arising from your use of Living Page, and our total liability to you is limited to the
        amount you&rsquo;ve paid us in the past twelve months (which, while the service is free, is
        zero). Nothing here limits rights you have that can&rsquo;t be limited by law.
      </p>

      <h2>Ending things</h2>
      <p>
        You can stop using Living Page and delete your account at any time. We may end or change
        the service, and we&rsquo;ll try to give notice when we do.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. If the change matters, we&rsquo;ll update the date above.
        Continuing to use Living Page after that means you accept the new terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. See also our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalShell>
  );
}
