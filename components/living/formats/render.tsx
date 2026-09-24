import type { ReactNode } from "react";
import { StoryView, type StoryViewData } from "@/components/living/StoryView";
import { ScrapbookView } from "./ScrapbookView";
import {
  LetterView, PosterView, TicketView, NotebookView, GalleryView,
  FilmView, RansomView, MarqueeView, PostcardView,
} from "./library";
import { ListicleView } from "./ListicleView";
import { CrawlView } from "./CrawlView";
import type { FormatKey } from "@/lib/formats";

const RENDERERS: Partial<Record<FormatKey, (p: StoryViewData) => ReactNode>> = {
  scrapbook: ScrapbookView, letter: LetterView, poster: PosterView, ticket: TicketView,
  notebook: NotebookView, gallery: GalleryView, film: FilmView, ransom: RansomView,
  marquee: MarqueeView, postcard: PostcardView, listicle: ListicleView, crawl: CrawlView,
};

/** Render a story in a given format (standard is the fallback). */
export function FormatRender({ format, ...data }: StoryViewData & { format: FormatKey }) {
  const Render = RENDERERS[format];
  return <>{Render ? Render(data) : <StoryView {...data} />}</>;
}

export default FormatRender;
