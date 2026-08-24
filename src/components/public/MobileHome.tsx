import Link from "next/link";
import { MediaSlotImage } from "@/components/public/MediaSlotImage";
import { SocialLinks } from "@/components/public/SocialLinks";
import { renderAccented } from "@/lib/content/accent";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Mobile home screen, per MOBILE-05-LanguageSelection.PNG.
 *
 * This is a distinct composition, not a reflow of the desktop homepage: it
 * carries its own hero copy, a Today's Word card and a Stories & Voices row.
 * Sections shared with desktop (WRO project, My BhashaSetu) read the same CMS
 * fields so a single edit updates both surfaces.
 */
export function MobileHome({ sections }: { sections: any[] }) {
  const section = (key: string) =>
    sections.find((s: any) => s.section_key === key);
  const content = (s: any, field: string) =>
    s?.page_content?.find((c: any) => c.field_key === field)?.content ?? "";
  const slot = (s: any, key: string) =>
    s?.media_slots?.find((m: any) => m.slot_key === key);

  const hero = section("mobile_hero");
  const learn = section("learn_explore");
  const word = section("todays_word");
  const wro = section("wro_project");
  const chat = section("my_bhasha_setu");
  const stories = section("stories_voices");

  const heroImage = slot(hero, "mobile_hero_image");
  const wordImage = slot(word, "todays_word_image");
  // Bound once each: guarding on slot(...) then calling it again to read .id
  // means the guard never protects the second call.
  const wroVideo = slot(wro, "wro_video");
  const robot = slot(chat, "robot_image");
  const nativeText = content(word, "native_text");

  return (
    <div className="mhome">
      {hero && (
        <section className="mhome-hero">
          <div className="mhome-hero__copy">
            <p className="mhome-hero__greeting">
              {content(hero, "greeting")}{" "}
              <span aria-hidden="true">👋</span>
            </p>
            <h1 className="mhome-hero__heading">
              {renderAccented(content(hero, "heading"))}
            </h1>
            <p className="mhome-hero__desc">{content(hero, "description")}</p>
          </div>
          {heroImage && (
            <div className="mhome-hero__media">
              <MediaSlotImage
                slotId={heroImage.id}
                altText="The Bhasha Setu WRO project vehicle"
                aspectRatio={heroImage.aspect_ratio ?? undefined}
                label="WRO vehicle"
              />
            </div>
          )}
        </section>
      )}

      {/* Language chooser — the two languages in scope. */}
      {learn && (
        <section className="mhome-langs">
          {[
            {
              slotKey: "card_warli_image",
              name: "Warli",
              body: "Explore words, phrases, songs and stories from the Warli community.",
              cta: "Learn Warli",
              href: "/learn/warli",
              tone: "warli",
            },
            {
              slotKey: "card_katkari_image",
              name: "Katkari",
              body: "Discover everyday expressions and traditions of Katkari.",
              cta: "Learn Katkari",
              href: "/learn/katkari",
              tone: "katkari",
            },
          ].map((lang) => {
            const s = slot(learn, lang.slotKey);
            return (
              <article
                className={`mhome-lang mhome-lang--${lang.tone}`}
                key={lang.slotKey}
              >
                <div className="mhome-lang__art">
                  {s && (
                    <MediaSlotImage
                      slotId={s.id}
                      altText={`${lang.name} artwork`}
                      aspectRatio={s.aspect_ratio ?? undefined}
                      label={lang.name}
                    />
                  )}
                </div>
                <h2>{lang.name}</h2>
                <p>{lang.body}</p>
                <Link href={lang.href} className="mhome-lang__link">
                  {lang.cta} <span aria-hidden="true">→</span>
                </Link>
              </article>
            );
          })}
        </section>
      )}

      {/* Today's Word hides itself until an editor has attached verified
          language content — never an invented word (CLAUDE.md section 25). */}
      {word && nativeText && (
        <section className="mhome-word">
          <div className="mhome-word__body">
            <p className="mhome-word__label">
              <span aria-hidden="true">🔥</span> {content(word, "label")}
            </p>
            <p className="mhome-word__native">{nativeText}</p>
            <p className="mhome-word__meanings">
              <span>English: {content(word, "english_meaning")}</span>
              <span>
                हिन्दी:{" "}
                <span className="mhome-word__hindi">
                  {content(word, "hindi_meaning")}
                </span>
              </span>
            </p>
          </div>
          {wordImage && (
            <div className="mhome-word__art">
              <MediaSlotImage
                slotId={wordImage.id}
                altText="Warli artwork"
                aspectRatio={wordImage.aspect_ratio ?? undefined}
                label="Artwork"
              />
            </div>
          )}
        </section>
      )}

      {wro && (
        <section className="mhome-wro">
          <div className="mhome-wro__copy">
            <h2>{content(wro, "title")}</h2>
            <p>{content(wro, "description")}</p>
            <Link href="https://youtube.com" className="mhome-wro__cta">
              {content(wro, "cta_text")} <span aria-hidden="true">▶</span>
            </Link>
          </div>
          <div className="mhome-wro__video">
            {wroVideo && (
              <MediaSlotImage
                slotId={wroVideo.id}
                altText="Bhasha Setu WRO Future Innovators video"
                aspectRatio={wroVideo.aspect_ratio ?? undefined}
                label="Video"
                mediaType="video"
              />
            )}
            <span className="mhome-play" aria-hidden="true">
              ▶
            </span>
          </div>
        </section>
      )}

      {chat && (
        <section className="mhome-chat">
          <div className="mhome-chat__robot">
            {robot && (
              <MediaSlotImage
                slotId={robot.id}
                altText="The Bhasha Setu robot, your learning companion"
                aspectRatio={robot.aspect_ratio ?? undefined}
                label="Robot"
              />
            )}
          </div>
          <div className="mhome-chat__copy">
            <h2>
              {content(chat, "title")}
              <span className="mhome-chat__badge">AI</span>
            </h2>
            <p>{content(chat, "description")}</p>
          </div>
          <Link href="/chat" className="mhome-chat__cta">
            Chat Now
          </Link>
        </section>
      )}

      {stories && (
        <section className="mhome-stories">
          <header className="mhome-stories__head">
            <h2>{content(stories, "heading")}</h2>
            <Link href="/stories" className="mhome-stories__all">
              {content(stories, "cta_text")} <span aria-hidden="true">→</span>
            </Link>
          </header>
          <ul className="mhome-stories__row">
            {[1, 2, 3, 4].map((n) => {
              const thumb = slot(stories, `story_${n}_thumbnail`);
              const title = content(stories, `story_${n}_title`);
              return (
                <li className="mhome-story" key={n}>
                  <div className="mhome-story__thumb">
                    {thumb && (
                      <MediaSlotImage
                        slotId={thumb.id}
                        altText={title || `Story ${n}`}
                        aspectRatio={thumb.aspect_ratio ?? undefined}
                        label="Story"
                        mediaType="image"
                      />
                    )}
                    <span className="mhome-play mhome-play--sm" aria-hidden="true">
                      ▶
                    </span>
                    {content(stories, `story_${n}_duration`) && (
                      <span className="mhome-story__dur">
                        {content(stories, `story_${n}_duration`)}
                      </span>
                    )}
                  </div>
                  <p className="mhome-story__title">
                    {title || "Story coming soon"}
                  </p>
                  <p className="mhome-story__lang">
                    {content(stories, `story_${n}_language`)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mhome-follow">
        <h2>Follow us</h2>
        <SocialLinks size={26} />
      </section>
    </div>
  );
}
