import type { Metadata } from "next";

import { FitResults } from "@/components/fit/fit-results";

export const metadata: Metadata = { title: "Your fit" };

// The id is read client-side from the URL (see FitResults) so a single cached
// shell can render any fit offline (Flow 8).
export default function FitResultPage() {
  return <FitResults />;
}
