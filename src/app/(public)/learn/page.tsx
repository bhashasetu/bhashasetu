import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SearchBox } from "@/components/public/SearchBox";

export default async function LearnPage() {
  const supabase = await createClient();
  const { data: languages, error } = await supabase
    .from("languages")
    .select("id, code, name, description")
    .eq("status", "published")
    .order("name");

  return (
    <main>
      <h1>Learn</h1>
      <SearchBox />

      {error && <p role="alert">Could not load languages right now.</p>}
      {!error && (!languages || languages.length === 0) && (
        <p>No languages are published yet. Please check back soon.</p>
      )}
      {languages && languages.length > 0 && (
        <ul>
          {languages.map((lang) => (
            <li key={lang.id}>
              <Link href={`/learn/${lang.code}`}>{lang.name}</Link>
              {lang.description && <p>{lang.description}</p>}
            </li>
          ))}
        </ul>
      )}

      <p>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
