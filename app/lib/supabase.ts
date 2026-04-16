import { createClient } from "@supabase/supabase-js";

/** Reads and validates required Supabase environment variables. */
function getSupabaseEnv() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const anonKey =
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
		process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

	if (!url || !anonKey) {
		throw new Error(
			"Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
		);
	}

	return { url, anonKey };
}

const { url, anonKey } = getSupabaseEnv();

export const supabase = createClient(url, anonKey);
