import { notFound } from "next/navigation";

/**
 * The studio is a workbench, and a workbench belongs in the workshop. It
 * writes to the content directory, so it only exists where that directory
 * is a real, writable thing: your machine.
 */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
