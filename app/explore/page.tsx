import { permanentRedirect } from "next/navigation";

/** `/explore` moved to `/wander` — this is the reader's own surface now. */
export default function ExploreRedirect() {
  permanentRedirect("/wander");
}
