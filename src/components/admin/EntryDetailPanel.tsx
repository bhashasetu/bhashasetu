import Link from "next/link";
import { AdminMediaPreview } from "./AdminMediaPreview";
import { STATUS_LABELS, relativeTime } from "@/lib/entries/queries";
import type { EntryDetail } from "@/lib/entries/detail";

const TABS = ["details", "history", "related", "usage"] as const;
export type EntryTab = (typeof TABS)[number];

export function isEntryTab(value: string | undefined): value is EntryTab {
  return !!value && (TABS as readonly string[]).includes(value);
}

const TAB_LABELS: Record<EntryTab, string> = {
  details: "Details",
  history: "History",
  related: "Related",
  usage: "Usage",
};

const ELIGIBILITY_LABELS: Record<string, string> = {
  eligible: "Playable",
  draft: "Draft audio",
  blocked_consent: "Not cleared",
  archived: "Archived",
  missing: "No audio",
};

/**
 * The right-hand entry panel from the approved screen.
 *
 * A server component driven by the ?entry= and ?tab= parameters rather than
 * client state, so the data arrives with the page and a particular entry is a
 * shareable address. There is no drawer primitive in the Back Office yet —
 * MediaDetailPanel is an inline panel — so the overlay is new, but built from
 * the existing card, pill and button classes rather than a second design
 * system.
 *
 * Every tab shows real rows or an honest empty state; nothing is invented to
 * make a tab look populated (brief sections 13 to 15).
 */
export function EntryDetailPanel({
  detail,
  tab,
  closeHref,
  tabHref,
}: {
  detail: EntryDetail;
  tab: EntryTab;
  closeHref: string;
  tabHref: (tab: EntryTab) => string;
}) {
  // `people` is read by DetailsTab from its own `detail` argument.
  const { entry, audio, history, aliases, related } = detail;

  return (
    <aside className="wp-panel" aria-label={`Details for ${entry.native_text}`}>
      <header className="wp-panel__head">
        <div className="wp-panel__title">
          <h2>
            {entry.native_text}
            {entry.transliteration && (
              <span className="wp-panel__translit"> ({entry.transliteration})</span>
            )}
          </h2>
          <span className={`admin-pill admin-pill--${entry.status}`}>
            {STATUS_LABELS[entry.status] ?? entry.status}
          </span>
        </div>
        <Link href={closeHref} className="wp-panel__close" aria-label="Close panel">
          ×
        </Link>
      </header>

      <div className="wp-panel__meta">
        {entry.language && <span className="wp-lang">{entry.language.name}</span>}
        {entry.category && <span className="wp-chip">{entry.category.name}</span>}
        <span className="wp-chip">
          {entry.entry_type === "phrase" ? "Phrase" : "Word"}
        </span>
      </div>

      <nav className="wp-tabs" aria-label="Entry sections">
        {TABS.map((t) => (
          <Link
            key={t}
            href={tabHref(t)}
            className={`wp-tab${t === tab ? " is-active" : ""}`}
            aria-current={t === tab ? "page" : undefined}
          >
            {TAB_LABELS[t]}
          </Link>
        ))}
      </nav>

      <div className="wp-panel__body">
        {tab === "details" && (
          <DetailsTab detail={detail} />
        )}

        {tab === "history" && (
          history.length === 0 ? (
            <p className="wp-empty">
              No workflow events yet. Submitting, verifying, publishing or
              archiving this entry will be recorded here.
            </p>
          ) : (
            <ol className="wp-history">
              {history.map((event) => (
                <li key={event.id}>
                  <div className="wp-history__what">
                    {event.oldStatus
                      ? `${STATUS_LABELS[event.oldStatus] ?? event.oldStatus} → ${
                          STATUS_LABELS[event.newStatus ?? ""] ?? event.newStatus
                        }`
                      : STATUS_LABELS[event.newStatus ?? ""] ?? event.newStatus}
                  </div>
                  <div className="wp-history__who">
                    {relativeTime(event.createdAt)}
                    {event.actor ? ` · ${event.actor}` : ""}
                  </div>
                  {event.notes && <p className="wp-history__note">{event.notes}</p>}
                </li>
              ))}
            </ol>
          )
        )}

        {tab === "related" && (
          <>
            <h3 className="wp-panel__section">Aliases</h3>
            {aliases.length === 0 ? (
              <p className="wp-empty">
                No aliases recorded. Aliases are alternative spellings an
                editor has approved; they widen search without changing the
                verified text.
              </p>
            ) : (
              <ul className="wp-list">
                {aliases.map((a) => (
                  <li key={a.id}>{a.alias}</li>
                ))}
              </ul>
            )}

            <h3 className="wp-panel__section">
              Others in {entry.category?.name ?? "this category"}
            </h3>
            {related.length === 0 ? (
              <p className="wp-empty">Nothing else is filed here yet.</p>
            ) : (
              <ul className="wp-list">
                {related.map((r) => (
                  <li key={r.id}>
                    <Link href={`?entry=${r.id}`}>{r.native_text}</Link>
                    <span className="wp-muted"> — {r.english_meaning}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {tab === "usage" && (
          <>
            <h3 className="wp-panel__section">On the public site</h3>
            <p className={entry.status === "published" ? "wp-note" : "wp-empty"}>
              {entry.status === "published"
                ? "Published — visible on the Learn page for this language."
                : `Not public. An entry appears on the Learn page only once its status is Published; this one is ${
                    STATUS_LABELS[entry.status] ?? entry.status
                  }.`}
            </p>

            <h3 className="wp-panel__section">This recording elsewhere</h3>
            {!audio ? (
              <p className="wp-empty">No recording is attached.</p>
            ) : audio.alsoUsedBy.length === 0 ? (
              <p className="wp-empty">
                Used only by this entry. The same file can be linked to others
                without being uploaded again.
              </p>
            ) : (
              <ul className="wp-list">
                {audio.alsoUsedBy.map((e) => (
                  <li key={e.id}>
                    <Link href={`?entry=${e.id}`}>{e.native_text}</Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      <footer className="wp-panel__foot">
        <Link href={closeHref} className="admin-btn admin-btn--ghost">
          Close
        </Link>
        <Link
          href={`/admin/learning-entries/${entry.id}`}
          className="admin-btn admin-btn--primary"
        >
          Edit Entry
        </Link>
      </footer>
    </aside>
  );

  function DetailsTab({ detail }: { detail: EntryDetail }) {
    const { entry, audio, people } = detail;
    const updatedBy = entry.updated_by ? people[entry.updated_by] : null;

    return (
      <>
        <Field label={`Native text${entry.language ? ` (${entry.language.name})` : ""}`}>
          {entry.native_text}
        </Field>
        {entry.transliteration && (
          <Field label="Transliteration">{entry.transliteration}</Field>
        )}
        <Field label="English meaning">{entry.english_meaning}</Field>
        {entry.hindi_meaning && (
          <Field label="Hindi meaning">{entry.hindi_meaning}</Field>
        )}
        {entry.category && <Field label="Category">{entry.category.name}</Field>}

        {(audio?.speakerName || audio?.region || entry.region) && (
          <Field label="Speaker / source">
            {audio?.speakerName ?? "Speaker not recorded"}
            {(audio?.region || entry.region) && (
              <div className="wp-muted">{audio?.region ?? entry.region}</div>
            )}
          </Field>
        )}

        <h3 className="wp-panel__section">Audio</h3>
        {!audio ? (
          <p className="wp-empty">
            No pronunciation recording attached. Open Edit Entry to select one
            from the Media Library or upload a new recording.
          </p>
        ) : (
          <div className="wp-audio">
            <div className="wp-audio__head">
              <span className="wp-audio__name">{audio.title || audio.filename}</span>
              <span
                className={`admin-pill admin-pill--${
                  audio.eligibility === "eligible" ? "published" : "draft"
                }`}
              >
                {ELIGIBILITY_LABELS[audio.eligibility]}
              </span>
            </div>
            <AdminMediaPreview
              key={audio.assetId}
              assetId={audio.assetId}
              mediaType="audio"
              label={audio.filename}
            />
            {audio.reason && <p className="wp-warn">{audio.reason}</p>}
            <dl className="wp-audio__meta">
              {audio.recordingDate && (
                <>
                  <dt>Recorded</dt>
                  <dd>{audio.recordingDate}</dd>
                </>
              )}
              <dt>Consent</dt>
              <dd>{audio.consentStatus ?? "not recorded"}</dd>
            </dl>
          </div>
        )}

        {entry.speaker_notes && (
          <>
            <h3 className="wp-panel__section">Notes</h3>
            <p className="wp-note">{entry.speaker_notes}</p>
          </>
        )}

        <h3 className="wp-panel__section">Last updated</h3>
        <p className="wp-note">
          {relativeTime(entry.updated_at)}
          {updatedBy && <span className="wp-muted"> · by {updatedBy}</span>}
        </p>
      </>
    );
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="wp-field">
      <span className="wp-field__label">{label}</span>
      <div className="wp-field__value">{children}</div>
    </div>
  );
}
