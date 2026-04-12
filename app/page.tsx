import { redirect } from "next/navigation";

/** Redirects root route traffic to the albums listing page. */
export default function Home() {
  redirect("/album");
}
