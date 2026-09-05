import Link from "next/link";
import { notFound } from "next/navigation";
import { STORIES, bySlug } from "@/content/stories/registry";
import { StoryFrame } from "@/components/living/StoryFrame";
import { Doodle } from "@/components/doodles/Doodle";

export function generateStaticParams() {
  return STORIES.map((s) => ({ slug: s.meta.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = bySlug(slug);
  if (!entry) return {};
  return { title: `${entry.meta.place} — Places I've Been`, description: entry.meta.fragment };
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = bySlug(slug);
  if (!entry) notFound();
  const { meta, Story } = entry;

  return (
    <main className="frame">
      {/* §17 — a story opens on a visual beat, not a wall of text */}
      <header className="frontispiece">
        <Link href="/" className="back">back</Link>
        <p className="place">{meta.place}</p>
        <p className="stamp">{meta.date}</p>
      </header>

      <StoryFrame veil={meta.veil !== false} accent={meta.accent}>
        <Story />
      </StoryFrame>

      <footer className="colophon">
        <span className="stamp">{meta.place} · {meta.date}</span>
        <span className="colophon-doodle"><Doodle name="spiral" seed={19} size={54} ink="var(--rule)" /></span>
        <Link href="/" className="back">the rest of them</Link>
      </footer>
    </main>
  );
}
