import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MediaUploadForm } from "@/components/admin/MediaUploadForm";

export default async function AdminMediaPage() {
  const supabase = await createClient();
  const { data: mediaAssets, error } = await supabase
    .from("media_assets")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main>
      <h1>Media Library</h1>
      <MediaUploadForm />
      {error && <p role="alert">Failed to load media: {error.message}</p>}
      {!error && (!mediaAssets || mediaAssets.length === 0) && <p>No media yet.</p>}
      {mediaAssets && mediaAssets.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Filename</th>
              <th>Type</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mediaAssets.map((m) => (
              <tr key={m.id}>
                <td>{m.title || m.filename}</td>
                <td>{m.media_type}</td>
                <td>{m.status}</td>
                <td>
                  <Link href={`/admin/media/${m.id}`}>Edit</Link>
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
