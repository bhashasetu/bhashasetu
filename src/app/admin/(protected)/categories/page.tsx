import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const { data: categories, error } = await supabase
    .from("categories")
    .select("*, languages(name, code)")
    .order("display_order");

  return (
    <main>
      <h1>Categories</h1>
      <p>
        <Link href="/admin/categories/new">+ New Category</Link>
      </p>
      {error && <p role="alert">Failed to load categories: {error.message}</p>}
      {!error && (!categories || categories.length === 0) && <p>No categories yet.</p>}
      {categories && categories.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Language</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td>{cat.name}</td>
                <td>{cat.languages?.name}</td>
                <td>{cat.status}</td>
                <td>
                  <Link href={`/admin/categories/${cat.id}`}>Edit</Link>
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
