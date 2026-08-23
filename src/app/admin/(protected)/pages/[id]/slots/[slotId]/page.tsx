"use client";

import { useState, useEffect } from "react";
import { notFound, useRouter } from "next/navigation";
import Link from "next/link";
import { MediaSlotManager } from "@/components/admin/MediaSlotManager";

type MediaSlot = {
  id: string;
  slot_key: string;
  media_type: string;
  aspect_ratio?: string;
  generation_prompts: Array<{
    id: string;
    provider: string;
    prompt_text: string;
    model_name?: string;
  }>;
  slot_media_assignments: Array<{
    id: string;
    media_asset: {
      id: string;
      filename: string;
      title?: string;
      status: string;
    };
  }>;
};

export default function SlotDetailPage({
  params,
}: {
  params: Promise<{ id: string; slotId: string }>;
}) {
  const [paramData, setParamData] = useState<{ id: string; slotId: string } | null>(null);
  const router = useRouter();

  const [slot, setSlot] = useState<MediaSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve params and fetch data
  useEffect(() => {
    (async () => {
      try {
        const { id, slotId } = await params;
        setParamData({ id, slotId });

        // Fetch the full page data to get the slot
        const response = await fetch(`/api/admin/pages/${id}`);
        if (!response.ok) throw new Error("Failed to load page");
        const { data: page } = await response.json();

        // Find the slot in the page sections
        let foundSlot: MediaSlot | null = null;
        for (const section of page.page_sections || []) {
          const mediaSlot = section.media_slots?.find((s: any) => s.id === slotId);
          if (mediaSlot) {
            foundSlot = mediaSlot;
            break;
          }
        }

        if (!foundSlot) throw new Error("Slot not found");
        setSlot(foundSlot);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  if (loading) {
    return (
      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
        <p>Loading slot data...</p>
      </main>
    );
  }

  if (error || !slot || !paramData) {
    return (
      <main style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
        <h1>Error</h1>
        <p>{error || "Slot not found"}</p>
        {paramData && <Link href={`/admin/pages/${paramData.id}/edit`}>← Back to page editor</Link>}
      </main>
    );
  }

  const handleUpdate = () => {
    router.refresh();
  };

  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      <h1>Manage Media Slot</h1>

      <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f0f8ff", borderRadius: "8px" }}>
        <p>
          <strong>Slot:</strong> {slot.slot_key}
        </p>
        <p>
          <strong>Type:</strong> {slot.media_type}
        </p>
        {slot.aspect_ratio && (
          <p>
            <strong>Aspect Ratio:</strong> {slot.aspect_ratio}
          </p>
        )}
      </div>

      <MediaSlotManager slot={slot} onUpdate={handleUpdate} />

      <p style={{ marginTop: "20px" }}>
        <Link href={`/admin/pages/${paramData.id}/edit`}>← Back to page editor</Link>
      </p>
    </main>
  );
}
