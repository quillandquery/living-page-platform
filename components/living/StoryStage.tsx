import { StoryView, type StoryViewData } from "@/components/living/StoryView";
import { ScrapbookView } from "@/components/living/formats/ScrapbookView";
import { FormatSwitcher } from "@/components/living/FormatSwitcher";
import type { FormatKey } from "@/lib/formats";

/**
 * The reader shell's front door. One story, many formats: this picks the
 * renderer for the resolved format and lays the "Read as —" switch over it.
 * The reader page and the public preview both go through here so the switch
 * behaves identically everywhere.
 */
export function StoryStage({
  format, formats, basePath, ...data
}: StoryViewData & { format: FormatKey; formats: FormatKey[]; basePath: string }) {
  return (
    <>
      {format === "scrapbook" ? <ScrapbookView {...data} /> : <StoryView {...data} />}
      <FormatSwitcher formats={formats} active={format} basePath={basePath} />
    </>
  );
}

export default StoryStage;
