import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoryMeta, isSlug, listStories } from "@/lib/stories";
import { StoryFrame } from "@/components/living/StoryFrame";
import { Doodle } from "@/components/doodles/Doodle";

/**
 * Only the slugs that existed at build time are real. Without this, an
 * unknown slug would fall through to the import below and throw a module
 * resolution error at request time instead of showing a 404.
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await listStories()).map((meta) => ({ slug: meta.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = await getStoryMeta(slug);
  if (!meta) return {};
  return { title: `${meta.place} — Places I've Been`, description: meta.fragment };
}

/**
 * The metadata comes off the filesystem; the story itself has to come
 * through the bundler, because it is compiled code and not data.
 *
 * A template-literal import is how you ask webpack for that without naming
 * every file: it compiles every .mdx under the directory and builds the
 * slug → module map itself. The path is relative on purpose — the `@/` alias
 * is resolved late enough that it is not reliably understood as a context
 * module prefix.
 */
async function loadStoryComponent(slug: string): Promise<React.ComponentType | null> {
  try {
    const mod = await import(`../../../content/stories/${slug}.mdx`);
    return mod.default as React.ComponentType;
  } catch {
    return null;
  }
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isSlug(slug)) notFound();

  const meta = await getStoryMeta(slug);
  const Story = meta ? await loadStoryComponent(slug) : null;
  if (!meta || !Story) notFound();

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
