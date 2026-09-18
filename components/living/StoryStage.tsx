import { StoryView, type StoryViewData } from "@/components/living/StoryView";
import { FormatRender } from "@/components/living/formats/render";
import { FormatPicker } from "@/components/living/FormatPicker";
import type { FormatKey } from "@/lib/formats";

/**
 * One story, many formats: render the resolved format and lay the "Read as"
 * picker over it. Reader page and preview both go through here.
 */
export function StoryStage({
  format, formats, basePath, ...data
}: StoryViewData & { format: FormatKey; formats: FormatKey[]; basePath: string }) {
  return (
    <>
      <FormatRender format={format} {...data} />
      <FormatPicker formats={formats} active={format} basePath={basePath} />
    </>
  );
}

export default StoryStage;
