import type { Metadata } from "next";

import { FitResults } from "@/components/fit/fit-results";

export const metadata: Metadata = { title: "Your fit" };

export default async function FitResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <FitResults id={id} />;
}
