import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <main>
      <h1>Back Office Dashboard</h1>
      <nav>
        <ul>
          <li>
            <Link href="/admin/languages">Languages</Link>
          </li>
          <li>
            <Link href="/admin/categories">Categories</Link>
          </li>
          <li>
            <Link href="/admin/learning-entries">Learning Entries</Link>
          </li>
          <li>
            <Link href="/admin/media">Media Library</Link>
          </li>
        </ul>
      </nav>
      <form action="/admin/logout" method="POST">
        <button type="submit">Log out</button>
      </form>
    </main>
  );
}
