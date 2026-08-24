import Link from "next/link";
import { SocialLinks } from "@/components/public/SocialLinks";
import "./public.css";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-wrapper">
      <header className="public-header">
        <div className="header-container">
          <Link href="/" className="logo">
            {/* The bridge logo is a CMS-managed asset. Until one is
                published the wordmark stands alone - never a stand-in mark. */}
            <div className="logo-text">
              <div className="logo-title">BHASHA SETU</div>
              <div className="logo-subtitle">Bridging Voices. Preserving Heritage.</div>
            </div>
          </Link>

          <nav className="primary-nav">
            <Link href="/">Home</Link>
            <Link href="/learn">Learn</Link>
            <Link href="/languages">Language Explorer</Link>
            <Link href="/learn/warli">Warli</Link>
            <Link href="/learn/katkari">Katkari</Link>
            <Link href="/play">Play & Learn</Link>
            <Link href="/stories">Stories & Voices</Link>
            <Link href="/about">About</Link>
          </nav>

          <div className="header-right">
            <SocialLinks className="header-social" size={22} />
            <select className="language-select" aria-label="Language">
              <option>English</option>
              <option>हिंदी</option>
            </select>
          </div>
        </div>
      </header>

      <main className="public-main">
        {children}
      </main>

      <footer className="public-footer">
        <div className="footer-container">
          <div className="footer-header">
            <Link href="/" className="footer-logo">
              <div>
                <div className="logo-title">BHASHA SETU</div>
                <div className="logo-subtitle">Bridging Voices. Preserving Heritage.</div>
              </div>
            </Link>
          </div>

          <div className="footer-columns">
            <div className="footer-col">
              <h4>Learn</h4>
              <ul>
                <li><Link href="/learn/warli">Warli Language</Link></li>
                <li><Link href="/learn/katkari">Katkari Language</Link></li>
                <li><Link href="/play">Play & Learn</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Explore</h4>
              <ul>
                <li><Link href="/languages">Language Explorer</Link></li>
                <li><Link href="/stories">Stories & Voices</Link></li>
                <li><Link href="/community">Community Voices</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>About</h4>
              <ul>
                <li><Link href="/about">About Us</Link></li>
                <li><Link href="/team">Our Team</Link></li>
                <li><Link href="/partners">Partners</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Connect</h4>
              <ul>
                <li><Link href="/contact">Contact Us</Link></li>
                <li><Link href="/contribute">Volunteer</Link></li>
                <li><Link href="/support">Support Us</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Follow Us</h4>
              <SocialLinks size={22} />
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2025 Bhasha Setu. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
