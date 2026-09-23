"use client";

/**
 * SHARE CONTROLS (Module 4, PARTS 14-33 / 45).
 *
 *   Subtle "Share" affordance on the reader → native share sheet where
 *   supported → lightweight popover fallback with Copy / WhatsApp / X /
 *   Email / Instagram.
 *
 * The Instagram flow is the interesting one (PARTS 21-33): Instagram has
 * no URL-based post endpoint, so we don't fake one. Instead we generate
 * a pre-rendered story asset (the co-located `instagram-feed.png` and
 * `instagram-story.png` routes, drawn by the real share frame — see
 * `lib/og-render.tsx`) and either hand it to the OS share sheet as a
 * `File` (where the OS/browser exposes Instagram in its share sheet the
 * user picks it), or fall back to Save image + Copy caption + Copy link.
 *
 * THE REACTION STAMP (rev.3 concept — "the reaction-stamp loop"): before
 * saving or sharing the Instagram asset, a reader can tap one honest,
 * fixed reaction. It's appended to the asset URL as `?r=`, so the PNG
 * that comes back has that one word hand-lettered onto it — the shared
 * image now carries a feeling, not just a link. It only ever touches the
 * two assets a reader generates at the moment they choose to share; the
 * OG link-unfurl image is crawled and cached once and has no per-viewer
 * reaction to carry.
 *
 * Design principles honoured:
 *  - "Share" is a single subtle action, not a row of social icons (PART 14).
 *  - Native share is preferred (PART 15). Cancel returns silently (PART 15).
 *  - No Instagram OAuth (PART 31).
 *  - share_opened/share_completed (lib/analytics/events.ts) fire on every
 *    open + successful channel, added 2026-09-23 to answer "do publishers
 *    share their stories" for the first-100-users instrumentation pass —
 *    ids and enum-like channel labels only, same no-story-content contract
 *    as the rest of lib/analytics (superseding the old PART 50 "no share
 *    analytics" decision).
 *  - No hashtag spam in captions or X shares (PART 19, PART 27).
 *  - Accessible: semantic button, labels, Escape, focus return (PART 45).
 */
import { useEffect, useRef, useState } from "react";
import { REACTIONS, type Reaction } from "@/lib/share-layout";
import { track } from "@/lib/analytics/client";

export type ShareControlsProps = {
  /** used only for analytics (share_opened/share_completed) — never rendered */
  storyId: string;
  authorHandle: string;
  canonicalUrl: string;
  title: string;
  /** short text used for navigator.share `text` and the WhatsApp/email
   *  bodies — derived server-side from the Story Context. */
  shareText: string;
  /** Instagram caption (title + summary + link), ready to copy. */
  instagramCaption: string;
  /** WhatsApp message body (title + optional summary + URL). */
  whatsappMessage: string;
  /** Email subject + body. */
  email: { subject: string; body: string };
  /** Absolute URLs to the two pre-rendered still assets. */
  instagramFeedUrl: string;
  instagramStoryUrl: string;
  /** Pre-generated moving story asset (Supabase Storage), when it exists
   *  for this story. Instagram Stories accept video, so this is what a
   *  reader posts; the stills above remain the fallback. */
  motionMp4?: string | null;
  motionWebp?: string | null;
};

type Toast = { message: string; key: number } | null;

function encode(s: string) { return encodeURIComponent(s); }

function withReaction(url: string, reaction: Reaction | null): string {
  if (!reaction) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}r=${encodeURIComponent(reaction)}`;
}

type ShareChannel =
  | "native" | "copy_link" | "whatsapp" | "x" | "email"
  | "instagram_native" | "instagram_save_feed" | "instagram_save_story" | "instagram_save_motion" | "instagram_caption_copy";

export function ShareControls(props: ShareControlsProps) {
  const [open, setOpen] = useState(false);
  const [igOpen, setIgOpen] = useState(false);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [toast, setToast] = useState<Toast>(null);
  const [supportsFileShare, setSupportsFileShare] = useState(false);
  const [supportsNativeShare, setSupportsNativeShare] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setSupportsNativeShare(typeof (navigator as Navigator).share === "function");
    try {
      const probe = new File([new Blob([""], { type: "image/png" })], "probe.png", { type: "image/png" });
      setSupportsFileShare(typeof (navigator as Navigator).canShare === "function" && (navigator as Navigator).canShare!({ files: [probe] }));
    } catch { setSupportsFileShare(false); }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 1600);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!open && !igOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { close(); openerRef.current?.focus(); }
    }
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onClick); };
  }, [open, igOpen]);

  function close() { setOpen(false); setIgOpen(false); }

  function showToast(message: string) { setToast({ message, key: Date.now() }); }

  // share_opened fires once per tap of the Share affordance, whichever path
  // it takes next (native sheet or popover) — this is "did they even try to
  // share," independent of whether it completes. share_completed fires only
  // at an actual success point for a specific channel, never on open alone.
  function trackOpened() {
    track("share_opened", { story_id: props.storyId, author_handle: props.authorHandle });
  }
  function trackCompleted(channel: ShareChannel) {
    track("share_completed", { story_id: props.storyId, author_handle: props.authorHandle, channel });
  }

  async function onShare() {
    trackOpened();
    if (supportsNativeShare) {
      try {
        await navigator.share({ title: props.title, text: props.shareText, url: props.canonicalUrl });
        trackCompleted("native");
      } catch (err) {
        // AbortError is the user cancelling — return silently (PART 15).
        if ((err as DOMException)?.name === "AbortError") return;
        setOpen(true); // real failure — fall back to the popover
      }
      return;
    }
    setOpen(true);
  }

  async function copyText(text: string, successMessage = "Copied", channel?: ShareChannel) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(successMessage);
      if (channel) trackCompleted(channel);
    } catch {
      showToast("Copy failed");
    }
  }

  async function shareInstagram() {
    const feedUrl = withReaction(props.instagramFeedUrl, reaction);
    // Try native file share first (PART 30). If Instagram is exposed
    // in the OS sheet, the user picks it there. If not, they get
    // whatever share destinations the OS offers.
    if (supportsFileShare) {
      try {
        const res = await fetch(feedUrl);
        if (res.ok) {
          const blob = await res.blob();
          const file = new File([blob], "living-page.png", { type: blob.type || "image/png" });
          if ((navigator as Navigator).canShare?.({ files: [file] })) {
            try {
              await (navigator as Navigator).share!({ files: [file], title: props.title, text: props.instagramCaption });
              trackCompleted("instagram_native");
              return;
            } catch (err) {
              if ((err as DOMException)?.name === "AbortError") return;
              // fall through to popover
            }
          }
        }
      } catch { /* fall through */ }
    }
    // Fallback: open the Instagram sub-popover (Save image + Copy caption + Copy link).
    setIgOpen(true);
  }

  async function saveInstagramAsset(url: string, filename: string, channel: ShareChannel) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
      showToast("Image saved");
      trackCompleted(channel);
    } catch {
      // Absolute-last fallback: open the image in a new tab so the user
      // can long-press / right-click to save it.
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  const whatsappHref = `https://wa.me/?text=${encode(props.whatsappMessage)}`;
  const xHref = `https://twitter.com/intent/tweet?text=${encode(props.title)}&url=${encode(props.canonicalUrl)}`;
  const mailHref = `mailto:?subject=${encode(props.email.subject)}&body=${encode(props.email.body)}`;

  return (
    <div className="share-root" ref={rootRef}>
      <button
        ref={openerRef}
        type="button"
        className="share-button"
        onClick={onShare}
        aria-haspopup="menu"
        aria-expanded={open || igOpen}
        aria-label="Share this story"
      >
        Share
      </button>

      {open && !igOpen ? (
        <div className="share-popover" role="menu" aria-label="Share this story">
          <p className="share-popover-h">Share this story</p>
          <button type="button" className="share-item" role="menuitem" onClick={() => copyText(props.canonicalUrl, "Link copied", "copy_link")}>Copy link</button>
          <a className="share-item" href={whatsappHref} target="_blank" rel="noopener noreferrer" role="menuitem" onClick={() => { trackCompleted("whatsapp"); close(); }}>WhatsApp</a>
          <a className="share-item" href={xHref} target="_blank" rel="noopener noreferrer" role="menuitem" onClick={() => { trackCompleted("x"); close(); }}>X</a>
          <a className="share-item" href={mailHref} role="menuitem" onClick={() => { trackCompleted("email"); close(); }}>Email</a>
          <button type="button" className="share-item share-item-ig" role="menuitem" onClick={() => { setIgOpen(true); }}>Instagram</button>
        </div>
      ) : null}

      {igOpen ? (
        <div className="share-popover share-popover-ig" role="menu" aria-label="Share to Instagram">
          <p className="share-popover-h">Share to Instagram</p>
          <p className="share-popover-sub">Instagram doesn&rsquo;t accept posts from the web. Save the image, then open Instagram to post it.</p>

          <div className="share-reactions" role="group" aria-label="Stamp a reaction on the image (optional)">
            {REACTIONS.map((r) => (
              <button
                key={r}
                type="button"
                className={`share-reaction${reaction === r ? " share-reaction-on" : ""}`}
                aria-pressed={reaction === r}
                onClick={() => setReaction(reaction === r ? null : r)}
              >
                {r}
              </button>
            ))}
          </div>

          {supportsFileShare ? (
            <button type="button" className="share-item" role="menuitem" onClick={shareInstagram}>Share image…</button>
          ) : null}
          <button type="button" className="share-item" role="menuitem" onClick={() => saveInstagramAsset(withReaction(props.instagramFeedUrl, reaction), "living-page-feed.png", "instagram_save_feed")}>Save image (feed · 1080×1350)</button>
          <button type="button" className="share-item" role="menuitem" onClick={() => saveInstagramAsset(withReaction(props.instagramStoryUrl, reaction), "living-page-story.png", "instagram_save_story")}>Save image (story · 1080×1920)</button>
          {props.motionMp4 ? (
            <button type="button" className="share-item share-item-motion" role="menuitem" onClick={() => saveInstagramAsset(props.motionMp4!, "living-page-story.mp4", "instagram_save_motion")}>Save moving version (story · MP4)</button>
          ) : null}
          <button type="button" className="share-item" role="menuitem" onClick={() => copyText(props.instagramCaption, "Caption copied", "instagram_caption_copy")}>Copy caption</button>
          <button type="button" className="share-item" role="menuitem" onClick={() => copyText(props.canonicalUrl, "Link copied", "copy_link")}>Copy link</button>
          <button type="button" className="share-item share-item-back" role="menuitem" onClick={() => setIgOpen(false)}>← Back</button>
        </div>
      ) : null}

      {toast ? (
        <div key={toast.key} className="share-toast" role="status" aria-live="polite">{toast.message}</div>
      ) : null}
    </div>
  );
}

export default ShareControls;
