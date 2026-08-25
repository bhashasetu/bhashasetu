import Link from "next/link";
import { SlotMedia } from "@/components/public/SlotMedia";
import { StoryPlayer } from "@/components/public/StoryPlayer";
import { SocialLinks } from "@/components/public/SocialLinks";
import type { ResolvedSlotMedia } from "@/lib/media/resolve-slot-urls";
import { framing } from "@/lib/media/framing";
import { renderAccented } from "@/lib/content/accent";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** One card in the mobile Stories & Voices row, from a published story. */
export type MobileStory = {
  id: string;
  title: string;
  languageName: string | null;
  duration: string | null;
  thumbnailUrl: string | null;
  thumbnailFit?: "cover" | "contain";
  thumbnailPosition?: string;
  mediaUrl: string | null;
  mediaSourceUrl: string | null;
};

/**
 * Mobile home screen, per MOBILE-05-LanguageSelection.PNG.
 *
 * This is a distinct composition, not a reflow of the desktop homepage: it
 * carries its own hero copy and a Today's Word card. What it does not carry is
 * its own copies of media that exists elsewhere — the hero image comes from
 * the same slot the desktop hero uses, and the Stories & Voices row reads the
 * same published records that drive the /stories page. Both used to be
 * separate uploads an editor had to keep in step by hand.
 */
export function MobileHome({
  sections,
  slotMedia,
  stories,
}: {
  sections: any[];
  /** Slot id -> resolved media, resolved once on the server by the page. */
  slotMedia: Map<string, ResolvedSlotMedia>;
  /** Published stories for the row, already ordered and resolved. */
  stories: MobileStory[];
}) {
  const media = (s: any) => (s ? (slotMedia.get(s.id) ?? null) : null);
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
  const storiesSection = section("stories_voices");

  // The desktop hero's slot, not a mobile-only copy of it. Both frames are
  // 4:3, so one upload fills both at their own sizes.
  const heroImage = slot(section("hero"), "hero_image");
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
              {content(hero, "greeting")} <span aria-hidden="true">👋</span>
            </p>
            <h1 className="mhome-hero__heading">
              {renderAccented(content(hero, "heading"))}
            </h1>
            <p className="mhome-hero__desc">{content(hero, "description")}</p>
          </div>
          {heroImage && (
            <div className="mhome-hero__media">
              <SlotMedia
                url={media(heroImage)?.url ?? null}
                sourceUrl={media(heroImage)?.sourceUrl ?? null}
                altText="The Bhasha Setu WRO project vehicle"
                aspectRatio={heroImage.aspect_ratio}
                label="WRO vehicle"
                {...framing(media(heroImage))}
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
                    <SlotMedia
                      url={media(s)?.url ?? null}
                      sourceUrl={media(s)?.sourceUrl ?? null}
                      altText={`${lang.name} artwork`}
                      aspectRatio={s.aspect_ratio}
                      label={lang.name}
                      {...framing(media(s))}
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
              <SlotMedia
                url={media(wordImage)?.url ?? null}
                sourceUrl={media(wordImage)?.sourceUrl ?? null}
                altText="Warli artwork"
                aspectRatio={wordImage.aspect_ratio}
                label="Artwork"
                {...framing(media(wordImage))}
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
              <SlotMedia
                url={media(wroVideo)?.url ?? null}
                sourceUrl={media(wroVideo)?.sourceUrl ?? null}
                altText="Bhasha Setu WRO Future Innovators video"
                aspectRatio={wroVideo.aspect_ratio}
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
              <SlotMedia
                url={media(robot)?.url ?? null}
                sourceUrl={media(robot)?.sourceUrl ?? null}
                altText="The Bhasha Setu robot, your learning companion"
                aspectRatio={robot.aspect_ratio}
                label="Robot"
                {...framing(media(robot))}
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

      {/* The same published records the /stories page shows, in the same
          order, so an interview published in the Stories module appears here
          with no second upload and nothing retyped. */}
      {storiesSection && (
        <section className="mhome-stories">
          <header className="mhome-stories__head">
            <h2>{content(storiesSection, "heading")}</h2>
            <Link href="/stories" className="mhome-stories__all">
              {content(storiesSection, "cta_text")}{" "}
              <span aria-hidden="true">→</span>
            </Link>
          </header>
          {stories.length > 0 ? (
            <ul className="mhome-stories__row">
              {stories.map((story) => (
                <li className="mhome-story" key={story.id}>
                  <StoryPlayer
                    url={story.mediaUrl}
                    sourceUrl={story.mediaSourceUrl}
                    posterUrl={story.thumbnailUrl}
                    title={story.title}
                    aspectRatio="16:9"
                    label="Story"
                    duration={story.duration}
                    frameClassName="mhome-story__thumb"
                    posterFit={story.thumbnailFit}
                    posterPosition={story.thumbnailPosition}
                  />
                  <p className="mhome-story__title">{story.title}</p>
                  {story.languageName && (
                    <p className="mhome-story__lang">{story.languageName}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mhome-stories__empty">
              No stories have been published yet.
            </p>
          )}
        </section>
      )}

      <section className="mhome-follow">
        <h2>Follow us</h2>
        <SocialLinks size={26} />
      </section>
    </div>
  );
}
