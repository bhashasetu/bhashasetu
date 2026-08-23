import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PagesListPage() {
  const supabase = await createClient();

  const { data: pages, error } = await supabase
    .from("pages")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main>
      <h1>Pages</h1>
      <p>
        <Link href="/admin/pages/new">Create new page</Link>
      </p>

      {error && <p role="alert">Error loading pages: {error.message}</p>}

      {!error && (!pages || pages.length === 0) && (
        <p>No pages yet. Create one to get started.</p>
      )}

      {pages && pages.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th>Type</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id}>
                <td>{page.title}</td>
                <td>{page.slug}</td>
                <td>{page.page_type}</td>
                <td>{page.status}</td>
                <td>{new Date(page.created_at).toLocaleDateString()}</td>
                <td>
                  <Link href={`/admin/pages/${page.id}`}>Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
