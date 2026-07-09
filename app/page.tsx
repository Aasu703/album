import { redirect } from "next/navigation";

/** Redirects root route traffic to albums. */
export default function Home() {
  redirect("/album");
}
