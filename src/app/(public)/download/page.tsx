import Link from "next/link";

export default function DownloadPage() {
  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h1>Download Bhasha Setu</h1>
      <p>Access Bhasha Setu on your preferred platform.</p>

      <section style={{ margin: "30px 0" }}>
        <h2>Web Version</h2>
        <p>
          You can access Bhasha Setu anytime at <strong>mybhashasetu.in</strong> using any modern web browser.
        </p>
        <p>
          <Link href="/" style={{ display: "inline-block", padding: "10px 20px", backgroundColor: "#2563eb", color: "white", textDecoration: "none", borderRadius: "4px" }}>
            Open Web App
          </Link>
        </p>
      </section>

      <section style={{ margin: "30px 0" }}>
        <h2>Android App</h2>
        <p>Download the Bhasha Setu Android app from Google Play Store for offline access and a native mobile experience.</p>
        <p>
          <button
            disabled
            style={{ padding: "10px 20px", backgroundColor: "#ccc", color: "#333", border: "none", borderRadius: "4px", cursor: "not-allowed" }}
          >
            Google Play Store (Coming Soon)
          </button>
        </p>
      </section>

      <section style={{ margin: "30px 0" }}>
        <h2>System Requirements</h2>
        <ul>
          <li>
            <strong>Web:</strong> Modern browser (Chrome, Firefox, Safari, Edge)
          </li>
          <li>
            <strong>Android:</strong> Android 6.0 or later
          </li>
        </ul>
      </section>

      <p>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
