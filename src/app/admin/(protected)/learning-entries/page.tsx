import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLearningEntriesPage() {
  const supabase = await createClient();
  const { data: entries, error } = await supabase
    .from("learning_entries")
    .select("*, languages(name), categories(name)")
    .order("created_at", { ascending: false });

  return (
    <main>
      <h1>Learning Entries</h1>
      <p>
        <Link href="/admin/learning-entries/new">+ New Entry</Link>
      </p>
      {error && <p role="alert">Failed to load entries: {error.message}</p>}
      {!error && (!entries || entries.length === 0) && <p>No learning entries yet.</p>}
      {entries && entries.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Native Text</th>
              <th>English Meaning</th>
              <th>Language</th>
              <th>Category</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.native_text}</td>
                <td>{entry.english_meaning}</td>
                <td>{entry.languages?.name}</td>
                <td>{entry.categories?.name}</td>
                <td>{entry.status}</td>
                <td>
                  <Link href={`/admin/learning-entries/${entry.id}`}>Edit</Link>
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
