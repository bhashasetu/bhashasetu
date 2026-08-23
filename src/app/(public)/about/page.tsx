import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AboutPage() {
  const supabase = await createClient();

  const { data: page } = await supabase
    .from("pages")
    .select("*")
    .eq("slug", "about")
    .eq("status", "published")
    .single();

  const title = page?.title || "About Bhasha Setu";
  const description = page?.description || "Learn about our mission to preserve and celebrate Warli and Katkari languages.";

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h1>{title}</h1>
      <p>{description}</p>

      <section style={{ margin: "30px 0" }}>
        <h2>Our Mission</h2>
        <p>
          Bhasha Setu is a digital learning platform dedicated to preserving and celebrating the rich linguistic heritage
          of the Warli and Katkari indigenous communities.
        </p>
      </section>

      <section style={{ margin: "30px 0" }}>
        <h2>Languages We Support</h2>
        <ul>
          <li>
            <strong>Warli</strong> - Spoken by the Warli people in Western India
          </li>
          <li>
            <strong>Katkari</strong> - Spoken by the Katkari people in Maharashtra
          </li>
        </ul>
      </section>

      <section style={{ margin: "30px 0" }}>
        <h2>Learn More</h2>
        <ul>
          <li>
            <Link href="/learn">Start Learning</Link>
          </li>
          <li>
            <Link href="/stories">Stories & Voices</Link>
          </li>
          <li>
            <Link href="/heritage">Cultural Heritage</Link>
          </li>
        </ul>
      </section>

      <p>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
