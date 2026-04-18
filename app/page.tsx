import { redirect } from "next/navigation";

interface HomePageProps {
  searchParams?: Promise<{ onboard?: string }>;
}

/** Redirects root route traffic to albums while preserving onboarding intent query. */
export default async function Home({ searchParams }: HomePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  if (resolvedSearchParams.onboard === "true") {
    redirect("/album?onboard=true");
  }

  redirect("/album");
}
