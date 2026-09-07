import { notFound, redirect } from "next/navigation";
import { myProfile, myStory } from "@/lib/db";
import { Editor } from "./editor";

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await myProfile();
  if (!profile) redirect("/onboarding");
  const { id } = await params;
  const story = await myStory(id);
  if (!story) notFound();

  return <Editor story={story} handle={profile.handle} />;
}
