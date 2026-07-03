import type { Metadata } from "next";

// Dev-only surfaces (the component gallery). Keep them out of search indexes.
export const metadata: Metadata = {
  title: "Dev",
  robots: { index: false, follow: false },
};

export default function DevLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
