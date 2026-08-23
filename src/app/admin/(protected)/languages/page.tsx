import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLanguagesPage() {
  const supabase = await createClient();
  const { data: languages, error } = await supabase
    .from("languages")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main>
      <h1>Languages</h1>
      <p>
        <Link href="/admin/languages/new">+ New Language</Link>
      </p>
      {error && <p role="alert">Failed to load languages: {error.message}</p>}
      {!error && (!languages || languages.length === 0) && <p>No languages yet.</p>}
      {languages && languages.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {languages.map((lang) => (
              <tr key={lang.id}>
                <td>{lang.code}</td>
                <td>{lang.name}</td>
                <td>{lang.status}</td>
                <td>
                  <Link href={`/admin/languages/${lang.id}`}>Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p>
        <Link href="/admin/dashboard">← Dashboard</Link>
      </p>
    </main>
  );
}
