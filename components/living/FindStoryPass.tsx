"use client";

/**
 * FIND THE STORY (§9–§11) — after the writing is developed, show the writer
 * their own strongest lines and ask what the piece is actually about. The
 * writer decides; nothing here is generated. What comes out
 * (`WritingSignals`) is the bridge to the existing Living Page visual
 * system (§12) — raw material, not a rewrite of anything it renders.
 */
import { useMemo, useState } from "react";
import { extractStoryProfile } from "@/lib/semantic-profile";
import { themesOf } from "@/lib/discover";
import { pickExcerpts, buildWritingSignals, type WritingSignals } from "@/lib/writing-opportunities";

type Step = "excerpts" | "about" | "done";

export function FindStoryPass({
  raw, kept, sensoryAnswers, momentAnswers, onContinue, onClose,
}: {
  raw: string;
  kept: string[];
  sensoryAnswers: string[];
  momentAnswers: string[];
  onContinue: (result: { chosen: string | null; about: string; signals: WritingSignals }) => void;
  onClose: () => void;
}) {
  const excerpts = useMemo(() => pickExcerpts(raw, kept, 3), [raw, kept]);
  const profile = useMemo(() => extractStoryProfile(raw), [raw]);
  const ideas = useMemo(() => {
    const list = [
      ...profile.narrative.slice(0, 2).map((s) => s.key),
      ...profile.emotion.slice(0, 2).map((s) => s.key),
      ...themesOf(raw),
    ];
    return Array.from(new Set(list)).slice(0, 6);
  }, [raw, profile]);

  const [step, setStep] = useState<Step>("excerpts");
  const [chosen, setChosen] = useState<string | null>(null);
  const [about, setAbout] = useState("");

  function finish() {
    const signals = buildWritingSignals(raw, { keptLines: kept, chosenExcerpt: chosen, sensoryAnswers, momentAnswers });
    onContinue({ chosen, about, signals });
  }

  return (
    <div className="fs-overlay">
      <style>{FS_CSS}</style>
      <button className="fs-close" type="button" onClick={onClose}>close</button>
      <div className="fs-body">
        {step === "excerpts" ? (
          <>
            <p className="fs-kicker">I think your story might be hiding in here.</p>
            {excerpts.length === 0 ? (
              <p className="fs-empty">Keep writing a little more and come back to this.</p>
            ) : (
              <div className="fs-excerpts">
                {excerpts.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className={`fs-excerpt${chosen === e ? " fs-picked" : ""}`}
                    onClick={() => setChosen(chosen === e ? null : e)}
                  >
                    &ldquo;{e}&rdquo;
                  </button>
                ))}
              </div>
            )}
            <p className="fs-q">Which one feels closest to what this story is really about?</p>
            <div className="fs-actions">
              <button type="button" className="fs-btn primary" onClick={() => setStep("about")}>
                {chosen ? "this one" : "none of these"}
              </button>
              <button type="button" className="fs-btn ghost" onClick={() => setStep("about")}>I don&rsquo;t know yet</button>
            </div>
          </>
        ) : step === "about" ? (
          <>
            <p className="fs-kicker">What do you think this story is really about?</p>
            <textarea
              className="fs-input"
              placeholder="one line, in your own words…"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              rows={2}
              autoFocus
            />
            {ideas.length ? (
              <>
                <p className="fs-hint">Here are the ideas I noticed in your writing:</p>
                <div className="fs-chips">
                  {ideas.map((idea) => (
                    <button key={idea} type="button" className="fs-chip" onClick={() => setAbout(idea)}>{idea.replace(/_/g, " ").toUpperCase()}</button>
                  ))}
                </div>
              </>
            ) : null}
            <div className="fs-actions">
              <button type="button" className="fs-btn primary" onClick={() => setStep("done")}>that&rsquo;s it</button>
            </div>
          </>
        ) : (
          <>
            <p className="fs-kicker">You&rsquo;ve got a story.</p>
            <p className="fs-q fs-big">Now let&rsquo;s give it a world.</p>
            <div className="fs-actions">
              <button type="button" className="fs-btn primary" onClick={finish}>see it come alive →</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const FS_CSS = `
.fs-overlay{ position:fixed; inset:0; z-index:120; overflow-y:auto; background:var(--paper); animation:fs-in .4s cubic-bezier(.2,.8,.25,1) both; }
@keyframes fs-in{ from{ opacity:0; } to{ opacity:1; } }
.fs-close{ position:fixed; top:1.1rem; right:1.1rem; z-index:121; font-family:var(--f-mono); font-size:.66rem; letter-spacing:.08em; text-transform:uppercase; background:transparent; border:1px solid var(--line); color:var(--ink-soft); border-radius:999px; padding:.55rem 1rem; cursor:pointer; }
.fs-body{ max-width:38rem; margin:0 auto; padding:12vh max(1.2rem,4vw) 12vh; display:flex; flex-direction:column; gap:1.2rem; }
.fs-kicker{ font-family:var(--f-disp); font-weight:400; font-size:clamp(1.6rem,4vw,2.2rem); line-height:1.25; margin:0; }
.fs-empty{ color:var(--mute); }
.fs-excerpts{ display:flex; flex-direction:column; gap:.7rem; }
.fs-excerpt{ text-align:left; font-family:var(--f-disp); font-style:italic; font-size:1.15rem; line-height:1.5; padding:1rem 1.1rem; background:var(--paper-2); border:1px solid var(--line); border-radius:10px; cursor:pointer; color:var(--ink); }
.fs-excerpt:hover{ border-color:var(--electric); }
.fs-excerpt.fs-picked{ border-color:var(--electric); background:color-mix(in oklab, var(--electric) 8%, var(--paper-2)); }
.fs-q{ font-size:1rem; color:var(--ink-soft); margin:0; }
.fs-q.fs-big{ font-family:var(--f-disp); font-size:clamp(1.4rem,3.4vw,1.9rem); color:var(--ink); }
.fs-input{ width:100%; font-family:var(--f-body); font-size:1.05rem; color:var(--ink); background:var(--paper-2); border:1px solid var(--line); border-radius:8px; padding:.7rem .8rem; resize:vertical; }
.fs-hint{ font-family:var(--f-mono); font-size:.64rem; letter-spacing:.06em; text-transform:uppercase; color:var(--mute); margin:0; }
.fs-chips{ display:flex; flex-wrap:wrap; gap:.5rem; }
.fs-chip{ font-family:var(--f-mono); font-size:.62rem; letter-spacing:.04em; background:var(--paper-2); border:1px solid var(--line); color:var(--ink-soft); border-radius:999px; padding:.4rem .8rem; cursor:pointer; }
.fs-chip:hover{ border-color:var(--electric); color:var(--electric); }
.fs-actions{ display:flex; gap:.6rem; flex-wrap:wrap; }
.fs-btn{ font-family:var(--f-mono); font-size:.66rem; letter-spacing:.08em; text-transform:uppercase; border-radius:999px; padding:.6rem 1.1rem; cursor:pointer; border:1px solid var(--line); background:transparent; color:var(--ink-soft); }
.fs-btn.primary{ background:var(--ink); color:var(--paper); border-color:var(--ink); }
.fs-btn.primary:hover{ background:var(--electric); border-color:var(--electric); }
.fs-btn.ghost:hover{ border-color:var(--electric); color:var(--electric); }
`;
