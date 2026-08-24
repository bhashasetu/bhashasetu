import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function WROPage() {
  const supabase = await createClient();

  const { data: page } = await supabase
    .from("pages")
    .select(`*`)
    .eq("slug", "wro")
    .eq("status", "published")
    .single();

  const title = page?.title || "WRO Project";
  const description = page?.description || "Learn about our World Robot Olympiad initiative.";

  return (
    <main style={{ maxWidth: "900px", margin: "0 auto", padding: "20px" }}>
      <h1>{title}</h1>
      <p>{description}</p>

      <section style={{ margin: "30px 0" }}>
        <h2>About the WRO Project</h2>
        <p>
          Our World Robot Olympiad project aims to inspire students to learn robotics and problem-solving while
          celebrating their linguistic heritage through interactive educational experiences.
        </p>
      </section>

      <section style={{ margin: "30px 0" }}>
        <h2>Objectives</h2>
        <ul>
          <li>Promote STEM education in indigenous communities</li>
          <li>Bridge technology and cultural preservation</li>
          <li>Create inclusive learning opportunities</li>
        </ul>
      </section>

      <section style={{ margin: "30px 0" }}>
        <h2>Get Involved</h2>
        <p>
          <Link href="/">Learn more on our homepage</Link>
        </p>
      </section>

      <p>
        <Link href="/">← Home</Link>
      </p>
    </main>
  );
}
