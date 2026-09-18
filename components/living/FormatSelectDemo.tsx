"use client";

import { useState } from "react";
import { FormatSelect } from "@/components/living/FormatSelect";
import type { StoryViewData } from "@/components/living/StoryView";
import type { FormatKey } from "@/lib/formats";

/** Public, no-login demo of the character-select (for tuning). */
export function FormatSelectDemo({
  data, formats, initial,
}: { data: StoryViewData; formats: FormatKey[]; initial: FormatKey }) {
  const [value, setValue] = useState<FormatKey>(initial);
  return (
    <div style={{ position: "fixed", inset: 0 }}>
      <FormatSelect
        data={data} formats={formats} value={value}
        onSelect={setValue} onClose={() => {}} onPublish={() => {}}
        publishing={false} published={false}
      />
    </div>
  );
}

export default FormatSelectDemo;
