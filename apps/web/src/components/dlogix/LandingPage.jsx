import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

import logo from '../../assets/dlogix/dlogix-logo.png';
import heroShip from '../../assets/dlogix/hero-ship.jpg';
import ctaHarbour from '../../assets/dlogix/cta-harbour.jpg';
import cardOcean from '../../assets/dlogix/card-ocean.jpg';
import cardAir from '../../assets/dlogix/card-air.jpg';
import cardCustoms from '../../assets/dlogix/card-customs.jpg';
import cardNetwork from '../../assets/dlogix/card-network.jpg';

import {
  IconEnquire, IconCompare, IconQuote, IconShipBox, IconTrack,
  IconClipboard, IconDocument, IconCheck, IconVessel, IconPlane,
  IconGlobe, IconBars, IconDatabase, IconShield, IconPartners,
  IconUser, IconPlay, IconArrowRight, IconMicrosoft,
} from './icons';

/* ------------------------------------------------------------------ data */

const NAV = ['How it works', 'Capabilities', 'Trade Tools', 'Resources', 'About'];

const JOURNEY = [
  { icon: IconEnquire, label: 'Enquire' },
  { icon: IconCompare, label: 'Compare' },
  { icon: IconQuote, label: 'Quote' },
  { icon: IconShipBox, label: 'Ship' },
  { icon: IconTrack, label: 'Track' },
];

const STATS = [
  { value: '190+', label: 'Countries' },
  { value: '500+', label: 'Shipping Lanes' },
  { value: 'Global', label: 'Carrier Network' },
  { value: 'One', label: 'Unified Platform' },
];

const STEPS = [
  { icon: IconClipboard, title: 'Enquiry', body: 'Create enquiries and invite vendors' },
  { icon: IconDocument, title: 'Vendor Quotes', body: 'Collect and manage itemised quotes' },
  { icon: IconBars, title: 'Compare & Analyse', body: 'Compare against historical rates' },
  { icon: IconCheck, title: 'Award', body: 'Finalize and award with full audit trail' },
  { icon: IconVessel, title: 'Ship & Track', body: 'Coordinate shipment and track progress' },
];

const CAPABILITIES = [
  {
    image: cardOcean, icon: IconVessel, title: 'Ocean Freight',
    lead: 'FCL | LCL', body: 'Reliable. Cost-effective. Global reach.',
  },
  {
    image: cardAir, icon: IconPlane, title: 'Air Freight',
    lead: 'Fast and secure', body: 'For time-sensitive shipments.',
  },
  {
    image: cardCustoms, icon: IconShipBox, title: 'Customs & Documentation',
    body: 'Compliant and hassle-free Documentation support for smooth clearances.',
  },
  {
    image: cardNetwork, icon: IconGlobe, title: 'Global Network',
    body: 'Connect to trusted carriers and freight forwarders worldwide.',
  },
];

const VALUES = [
  { icon: IconBars, title: 'Transparent Comparison', body: 'See vendor quotes side by side' },
  { icon: IconDatabase, title: 'Historical Rate Intelligence', body: 'Make informed decisions' },
  { icon: IconShield, title: 'Audit-Ready Process', body: 'Complete traceability' },
  { icon: IconPartners, title: 'Trusted Global Partners', body: 'Work with verified carriers and agents' },
];

/* --------------------------------------------------------------- pieces */

const Wordmark = ({ className = '' }) => (
  <a href="#top" className={`dlx-wordmark ${className}`.trim()}>
    <img src={logo} alt="Dlogix" className="dlx-wordmark__img" />
    <span className="dlx-wordmark__rule" aria-hidden="true" />
    <span className="dlx-wordmark__tag">
      Export Logistics
      <br />
      Made Simple
    </span>
  </a>
);

const SectionHead = ({ eyebrow, title, id }) => (
  <header className="dlx-head">
    <p className="dlx-eyebrow">{eyebrow}</p>
    <h2 className="dlx-h2" id={id}>{title}</h2>
    <span className="dlx-rule" aria-hidden="true" />
  </header>
);

/* ----------------------------------------------------------------- page */

export default function LandingPage() {
  const navigate = useNavigate();
  const signIn = (e) => {
    e.preventDefault();
    navigate('/login');
  };
  return (
    <div className="dlx" id="top">
      {/* ---------------------------------------------------------- nav */}
      <header className="dlx-nav">
        <div className="dlx-shell dlx-nav__inner">
          <Wordmark />

          <nav className="dlx-nav__links" aria-label="Primary">
            {NAV.map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}>{item}</a>
            ))}
          </nav>

          <a className="dlx-btn dlx-btn--primary dlx-btn--sm dlx-nav__cta" href="/app" onClick={signIn}>
            <IconUser size={17} />
            Sign in
          </a>
        </div>
      </header>

      {/* --------------------------------------------------------- hero */}
      <section className="dlx-hero">
        <div className="dlx-hero__media">
          <img src={heroShip} alt="Container vessel loading at a port at sunrise" />
          <span className="dlx-hero__scrim" aria-hidden="true" />
        </div>

        <p className="dlx-hero__script" aria-hidden="true">
          From<br />India to<br />the World
          <svg className="dlx-hero__swash" viewBox="0 0 120 10" preserveAspectRatio="none">
            <path d="M2 7C22 2 60 1.5 118 4.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </p>

        <div className="dlx-shell dlx-hero__inner">
          <div className="dlx-hero__copy">
            <h1 className="dlx-h1">
              Global Exports.<br />
              Simpler. Smarter.<br />
              <span className="dlx-h1__accent">Together.</span>
            </h1>

            <p className="dlx-lead">
              Dlogix is D&rsquo;Decor&rsquo;s export logistics portal to manage the entire
              enquiry-to-award journey &mdash; invite vendors, collect quotes, compare rates,
              and ship with confidence.
            </p>

            <div className="dlx-hero__actions">
              <a className="dlx-btn dlx-btn--primary" href="/app" onClick={signIn}>
                <IconMicrosoft size={18} />
                Sign in with Microsoft
              </a>
              <a className="dlx-btn dlx-btn--ghost" href="#how-it-works">
                <IconPlay size={19} />
                See how it works
              </a>
            </div>

            <ul className="dlx-journey">
              {JOURNEY.map(({ icon: Icon, label }) => (
                <li key={label} className="dlx-journey__item">
                  <Icon size={26} />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <dl className="dlx-stats">
            {STATS.map(({ value, label }) => (
              <div key={label} className="dlx-stats__cell">
                <dt>{value}</dt>
                <dd>{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* -------------------------------------------------- how it works */}
      <section className="dlx-how" id="how-it-works">
        <span className="dlx-how__map" aria-hidden="true" />

        <div className="dlx-shell dlx-how__inner">
          <div className="dlx-how__main">
            <SectionHead
              eyebrow="How Dlogix works"
              title={<>From Enquiry to Shipment &mdash; All in One Place</>}
            />

            <ol className="dlx-steps">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="dlx-steps__item">
                  <span className="dlx-steps__badge"><Icon size={26} /></span>
                  <h3 className="dlx-steps__title">{i + 1}. {title}</h3>
                  <p className="dlx-steps__body">{body}</p>
                  {i < STEPS.length - 1 && (
                    <span className="dlx-steps__arrow" aria-hidden="true">
                      <IconArrowRight size={20} />
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>

          <aside className="dlx-how__aside">
            <p>Less effort</p>
            <p>More insight</p>
            <p>Better outcomes</p>
            <span className="dlx-rule" aria-hidden="true" />
          </aside>
        </div>
      </section>

      {/* ------------------------------------------------- capabilities */}
      <section className="dlx-caps" id="capabilities">
        <div className="dlx-shell">
          <SectionHead
            eyebrow="Export shipping capabilities"
            title="End-to-End Support for Global Exports"
          />

          <ul className="dlx-cards">
            {CAPABILITIES.map(({ image, icon: Icon, title, lead, body }) => (
              <li key={title}>
                <a className="dlx-card" href={`#${title.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
                  <img className="dlx-card__img" src={image} alt="" />
                  <span className="dlx-card__badge" aria-hidden="true"><Icon size={22} /></span>
                  <div className="dlx-card__panel">
                    <h3 className="dlx-card__title">
                      {title}
                      <IconArrowRight size={20} className="dlx-card__arrow" />
                    </h3>
                    <p className="dlx-card__body">
                      {lead && <><strong>{lead}</strong><br /></>}
                      {body}
                    </p>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ----------------------------------------------------- cta band */}
      <section className="dlx-cta">
        <img className="dlx-cta__img" src={ctaHarbour} alt="" />
        <span className="dlx-cta__scrim" aria-hidden="true" />

        <div className="dlx-shell dlx-cta__inner">
          <div className="dlx-cta__copy">
            <p className="dlx-eyebrow dlx-eyebrow--onDark">A stronger global tomorrow</p>
            <h2 className="dlx-h2 dlx-h2--onDark">
              Connecting Markets.<br />Empowering Business.
            </h2>
            <p className="dlx-cta__body">
              Dlogix enables seamless export logistics so you can focus on what you do
              best &mdash; creating products the world loves.
            </p>
          </div>

          <ul className="dlx-values">
            {VALUES.map(({ icon: Icon, title, body }) => (
              <li key={title}>
                <span className="dlx-values__tile" aria-hidden="true"><Icon size={22} /></span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------- footer */}
      <footer className="dlx-foot">
        <div className="dlx-shell dlx-foot__inner">
          <Wordmark className="dlx-wordmark--sm" />

          <nav className="dlx-foot__links" aria-label="Footer">
            {['People', 'Process', 'Partnership', 'Progress'].map((item, i, all) => (
              <span key={item}>
                <a href={`#${item.toLowerCase()}`}>{item}</a>
                {i < all.length - 1 && <i aria-hidden="true">|</i>}
              </span>
            ))}
          </nav>

          <p className="dlx-foot__script" aria-hidden="true">
            Global Trade<br />Without Boundaries
            <svg className="dlx-hero__swash" viewBox="0 0 120 10" preserveAspectRatio="none">
              <path d="M2 7C22 2 60 1.5 118 4.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </p>
        </div>

        <div className="dlx-foot__bar">
          <div className="dlx-shell dlx-foot__barInner">
            <p>&copy; {new Date().getFullYear()} Dlogix &ndash; A D&rsquo;Decor initiative. All rights reserved.</p>
            <nav aria-label="Legal">
              {['Privacy', 'Terms', 'Help', 'Contact'].map((item) => (
                <a key={item} href={`#${item.toLowerCase()}`}>{item}</a>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
