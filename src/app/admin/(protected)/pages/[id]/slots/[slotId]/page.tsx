"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function labelFor(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b(\w)/g, (m) => m.toUpperCase());
}

export default function SlotDetailPage({
  params,
}: {
  params: Promise<{ id: string; slotId: string }>;
}) {
  const [paramData, setParamData] = useState<{ id: string; slotId: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // This screen is reached from more than one page editor now, so the caller
  // says where to return to. The value is only ever used as an internal path:
  // anything not starting with a single "/admin/" is discarded, so a crafted
  // link cannot turn this button into an off-site redirect.
  const backParam = searchParams.get("back");
  const backHref =
    backParam && /^\/admin\/[A-Za-z0-9/_-]*$/.test(backParam)
      ? backParam
      : "/admin/homepage";

  const [slot, setSlot] = useState<MediaSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { id, slotId } = await params;
        if (cancelled) return;
        setParamData({ id, slotId });

        const response = await fetch(`/api/admin/pages/${id}`);
        if (!response.ok) throw new Error("Failed to load page");
        const { data: page } = await response.json();

        let foundSlot: MediaSlot | null = null;
        for (const section of page.page_sections || []) {
          const mediaSlot = section.media_slots?.find(
            (s: { id: string }) => s.id === slotId
          );
          if (mediaSlot) {
            foundSlot = mediaSlot;
            break;
          }
        }

        if (!foundSlot) throw new Error("Slot not found");
        if (!cancelled) setSlot(foundSlot);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params]);

  if (loading) {
    return (
      <div className="admin-card slotmgr-page__loading">
        <p>Loading slot data…</p>
      </div>
    );
  }

  if (error || !slot || !paramData) {
    return (
      <div className="admin-card">
        <h2>Error</h2>
        <p className="admin-page-intro">{error || "Slot not found"}</p>
        <Link href={backHref} className="admin-btn admin-btn--ghost">
          ← Back
        </Link>
      </div>
    );
  }

  const handleUpdate = () => router.refresh();

  return (
    <div className="slotmgr-page">
      <div className="hp-bar hp-bar--static">
        <div className="hp-bar__text">
          <h2 className="hp-bar__title">Manage Media Slot</h2>
          <p className="hp-bar__sub">{labelFor(slot.slot_key)}</p>
        </div>
        <Link href={backHref} className="admin-btn admin-btn--ghost">
          ← Back
        </Link>
      </div>

      <div className="admin-card slotmgr-info">
        <div className="hp-row">
          <span className="hp-row__label">Slot</span>
          <span className="hp-row__control">
            <code className="hp-key">{slot.slot_key}</code>
          </span>
        </div>
        <div className="hp-row">
          <span className="hp-row__label">Type</span>
          <span className="hp-row__control">{slot.media_type}</span>
        </div>
        <div className="hp-row">
          <span className="hp-row__label">Aspect ratio</span>
          <span className="hp-row__control">
            {slot.aspect_ratio || "Not specified"}
          </span>
        </div>
      </div>

      <div className="admin-card">
        <MediaSlotManager slot={slot} onUpdate={handleUpdate} />
      </div>
    </div>
  );
}
