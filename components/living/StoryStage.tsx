import { StoryView, type StoryViewData } from "@/components/living/StoryView";
import { ScrapbookView } from "@/components/living/formats/ScrapbookView";
import {
  LetterView, PosterView, TicketView, NotebookView, GalleryView,
  FilmView, RansomView, MarqueeView, PostcardView,
} from "@/components/living/formats/library";
import { FormatPicker } from "@/components/living/FormatPicker";
import type { FormatKey } from "@/lib/formats";

const RENDERERS: Partial<Record<FormatKey, (p: StoryViewData) => React.ReactNode>> = {
  scrapbook: ScrapbookView,
  letter: LetterView,
  poster: PosterView,
  ticket: TicketView,
  notebook: NotebookView,
  gallery: GalleryView,
  film: FilmView,
  ransom: RansomView,
  marquee: MarqueeView,
  postcard: PostcardView,
};

/**
 * One story, many formats: pick the renderer for the resolved format and lay
 * the "Read as —" switch over it. The reader page and the preview both go
 * through here so the switch behaves identically everywhere.
 */
export function StoryStage({
  format, formats, basePath, ...data
}: StoryViewData & { format: FormatKey; formats: FormatKey[]; basePath: string }) {
  const Render = RENDERERS[format];
  return (
    <>
      {Render ? Render(data) : <StoryView {...data} />}
      <FormatPicker formats={formats} active={format} basePath={basePath} />
    </>
  );
}

export default StoryStage;
