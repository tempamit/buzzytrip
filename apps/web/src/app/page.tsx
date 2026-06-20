import { siteConfig } from '../lib/site-config';

export default function HomePage() {
  return (
    <main className="shell">
      <header className="header">
        <div className="brand">
          Buzzy<span>Trip</span>
        </div>
        <div className="status">Foundation mode</div>
      </header>

      <section className="hero">
        <p className="eyebrow">Travel intelligence, built carefully</p>
        <h1>{siteConfig.tagline}</h1>
        <p className="lede">
          The application foundation is running. Destination discovery and trip planning will be
          added as tested, independent slices rather than unfinished promises.
        </p>

        <div className="foundation-card" aria-label="Application foundation status">
          <div>
            <strong>Web</strong>
            <span>Light, server-rendered and ready for progressive features.</span>
          </div>
          <div>
            <strong>API</strong>
            <span>Typed contracts and a dedicated application boundary.</span>
          </div>
          <div>
            <strong>Worker</strong>
            <span>Long-running content work stays away from traveller requests.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
