import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoryMeta, isSlug, listStories } from "@/lib/stories";
import { StoryFrame } from "@/components/living/StoryFrame";
import { Doodle } from "@/components/doodles/Doodle";
import { Backdrop } from "@/components/living/Backdrop";
import { getBackdrop, schemeVars } from "@/lib/backdrops";

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

  // The ground is derived from the story's colour, and the ground is
  // painted by <body> — an inline style on the flow would never reach it.
  // Server-rendered so the page arrives already the right temperature
  // rather than flashing grey first. Validated because it lands in CSS.
  const accent = /^#[0-9a-fA-F]{3,8}$/.test(meta.accent) ? meta.accent : "#2B3ED0";

  // A backdrop declares the world, and the world overrides the reader's
  // theme — a piece that happens at 4am is dark whatever the OS says.
  // Injected at :root so <body> arrives in it too, rather than flashing
  // the reader's own palette first.
  const world = getBackdrop(meta.backdrop);
  const vars = [`--accent:${accent}`, world ? schemeVars(world.scheme) : ""].filter(Boolean).join(";");

  return (
    <main className="frame">
      <style>{`:root{${vars}}`}</style>
      <Backdrop name={meta.backdrop} seed={meta.slug} />
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
