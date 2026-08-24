import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  // Absolute origin used for canonical URLs, Open Graph images and the
  // sitemap. Optional so a preview deployment or a local checkout still
  // boots; it falls back to the production domain.
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
});

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mybhashasetu.in";

function loadEnv() {
  const parsed = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  });

  if (!parsed.success) {
    throw new Error(
      `Missing or invalid required environment variables: ${parsed.error.issues
        .map((i) => i.path.join("."))
        .join(", ")}. Configure these in the Vercel project dashboard.`
    );
  }

  return parsed.data;
}

export const env = loadEnv();
