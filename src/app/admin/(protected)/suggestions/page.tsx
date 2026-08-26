import { createClient } from "@/lib/supabase/server";
import { SuggestionRow } from "@/components/admin/SuggestionRow";

export const dynamic = "force-dynamic";

/**
 * Words visitors have asked us to record.
 *
 * The Language Explorer offers "Suggest a word" beneath its results; this is
 * where those land. Nothing here is content — it is a queue of requests, and a
 * word only reaches the public site when an editor creates a learning entry
 * for it through the normal draft → verified → published workflow, with
 * speakers (CLAUDE.md sections 25 and 26).
 *
 * The statuses say what happened to the request, not what is true about the
 * word: reviewed means someone looked, added means an entry now exists,
 * declined means it will not be recorded and why is in the notes.
 */
const STATUS_LABELS: Record<string, string> = {
  new: "New",
  reviewed: "Reviewed",
  added: "Added to the collection",
  declined: "Declined",
};

export default async function SuggestionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "new";

  const [{ data: suggestions }, { data: languages }] = await Promise.all([
    supabase
      .from("word_suggestions")
      .select("id, term, meaning, note, status, language_id, created_at")
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("languages").select("id, name"),
  ]);

  const languageName = new Map(
    ((languages ?? []) as { id: string; name: string }[]).map((l) => [l.id, l.name])
  );
  const rows = suggestions ?? [];

  return (
    <main className="admin-page">
      <header className="admin-page__head">
        <div>
          <h1>Suggested words</h1>
          <p className="admin-page__sub">
            Words visitors could not find in the Language Explorer. A suggestion
            is a request to record something — it never appears on the public
            site by itself.
          </p>
        </div>
      </header>

      <nav className="admin-tabs" aria-label="Status">
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <a
            key={value}
            className={`admin-tab${status === value ? " is-current" : ""}`}
            href={`/admin/suggestions?status=${value}`}
          >
            {label}
          </a>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="admin-empty">
          Nothing here. Suggestions arrive when a visitor searches for a word the
          collection does not have and asks us to record it.
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Word or phrase</th>
              <th scope="col">Language</th>
              <th scope="col">Meaning given</th>
              <th scope="col">Note</th>
              <th scope="col">Received</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <SuggestionRow
                key={row.id}
                id={row.id}
                term={row.term}
                language={row.language_id ? (languageName.get(row.language_id) ?? null) : null}
                meaning={row.meaning}
                note={row.note}
                status={row.status}
                createdAt={row.created_at}
              />
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
