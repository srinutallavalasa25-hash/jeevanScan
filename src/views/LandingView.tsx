import { 
  AlertTriangle, 
  Map, 
  Package, 
  WifiOff, 
  ShieldCheck, 
  Radio, 
  Layers, 
  Cpu, 
  ArrowRight,
  LifeBuoy,
  Users,
  CheckCircle,
  Search
} from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';
import type { NavView } from '../components/Navbar';

interface LandingViewProps {
  t: TranslationDict;
  onNavigate: (view: NavView) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ t, onNavigate }) => {
  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* 1. Hero Section */}
      <section
        style={{
          padding: '3.5rem 1rem 3rem',
          background: 'linear-gradient(180deg, #102A43 0%, #163654 100%)',
          borderBottom: '1px solid #243B53',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div className="container" style={{ textAlign: 'center', maxWidth: '880px', position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <div style={{ marginBottom: '1.25rem' }}>
            <span className="badge badge-red" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}>
              <span className="pulse-dot pulse-dot-red" />
              {t.hero.badge}
            </span>
          </div>

          {/* Main Title */}
          <h1
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.8rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#FFFFFF',
              marginBottom: '1rem',
              lineHeight: 1.1,
            }}
          >
            {t.hero.title}
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              lineHeight: 1.6,
              color: '#D9E2EC',
              marginBottom: '2rem',
            }}
          >
            {t.hero.subtitle}
          </p>

          {/* Action CTAs */}
          <div
            className="flex items-center justify-center gap-4"
            style={{ flexWrap: 'wrap', marginBottom: '2.5rem' }}
          >
            <button
              onClick={() => onNavigate('send-sos')}
              className="btn btn-sos"
              style={{ padding: '0.85rem 1.75rem', fontSize: '1.1rem' }}
            >
              <AlertTriangle size={20} />
              <span>{t.hero.ctaSendSos}</span>
            </button>

            <button
              id="hero-track-sos-btn"
              onClick={() => onNavigate('citizen-tracker')}
              className="btn btn-outline"
              style={{ padding: '0.85rem 1.5rem', fontSize: '1rem', borderColor: '#38BDF8', color: '#38BDF8' }}
            >
              <Search size={18} />
              <span>{t.hero.ctaTrackSos}</span>
            </button>

            <button
              onClick={() => onNavigate('jeeva-care')}
              className="btn btn-cyan"
              style={{ padding: '0.85rem 1.5rem', fontSize: '1rem' }}
            >
              <Map size={18} />
              <span>{t.nav.jeevaCare}</span>
            </button>

            <button
              onClick={() => onNavigate('jeeva-drop')}
              className="btn btn-amber"
              style={{ padding: '0.85rem 1.5rem', fontSize: '1rem' }}
            >
              <Package size={18} />
              <span>{t.hero.ctaRelief}</span>
            </button>
          </div>

          {/* Emergency Safety Notice */}
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1.25rem',
              fontSize: '0.825rem',
              color: '#FCA5A5',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              textAlign: 'left',
            }}
          >
            <LifeBuoy size={18} style={{ flexShrink: 0, color: '#EF4444' }} />
            <span>{t.brand.officialDisclaimer}</span>
          </div>
        </div>
      </section>

      {/* 2. Crisis Communication Breakdown Explanation */}
      <section style={{ padding: '3.5rem 1rem 2rem' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 2.5rem' }}>
            <span className="badge badge-amber" style={{ marginBottom: '0.75rem' }}>
              <WifiOff size={14} />
              The Disaster Dilemma
            </span>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.4rem)', marginBottom: '0.75rem' }}>
              {t.crisisRealities.title}
            </h2>
            <p>{t.crisisRealities.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="glass-panel">
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  color: '#EF4444',
                }}
              >
                <Radio size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{t.crisisRealities.point1Title}</h3>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.6 }}>{t.crisisRealities.point1Desc}</p>
            </div>

            <div className="glass-panel">
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  color: '#F59E0B',
                }}
              >
                <Layers size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{t.crisisRealities.point2Title}</h3>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.6 }}>{t.crisisRealities.point2Desc}</p>
            </div>

            <div className="glass-panel" style={{ border: '1px solid var(--color-teal)', background: '#F0FDFA' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: 'var(--color-teal-light)',
                  border: '1px solid #99F6E4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem',
                  color: 'var(--color-teal)',
                }}
              >
                <CheckCircle size={24} />
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--color-teal-dark)' }}>
                {t.crisisRealities.point3Title}
              </h3>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.6 }}>{t.crisisRealities.point3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Dual Connected Experiences */}
      <section style={{ padding: '3rem 1rem', background: 'rgba(255, 255, 255, 0.015)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 2.5rem' }}>
            <span className="badge badge-cyan" style={{ marginBottom: '0.75rem' }}>
              <Users size={14} />
              Unified Ecosystem
            </span>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.4rem)', marginBottom: '0.75rem' }}>
              {t.dualPortals.title}
            </h2>
            <p>{t.dualPortals.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Citizen Interface Card */}
            <div
              className="glass-panel"
              style={{
                borderTop: '4px solid #EF4444',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span className="badge badge-red" style={{ marginBottom: '1rem' }}>
                  Public Portal
                </span>
                <h3 style={{ fontSize: '1.45rem', marginBottom: '0.5rem' }}>{t.dualPortals.citizenTitle}</h3>
                <p style={{ fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                  {t.dualPortals.citizenDesc}
                </p>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
                  {[
                    t.dualPortals.citizenFeature1,
                    t.dualPortals.citizenFeature2,
                    t.dualPortals.citizenFeature3,
                    t.dualPortals.citizenFeature4,
                  ].map((feat, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.9rem' }}>
                      <CheckCircle size={17} style={{ color: '#EF4444', flexShrink: 0, marginTop: '2px' }} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => onNavigate('send-sos')}
                className="btn btn-sos"
                style={{ width: '100%' }}
              >
                <span>{t.nav.sendSos}</span>
                <ArrowRight size={16} />
              </button>
            </div>

            {/* Operator Interface Card */}
            <div
              className="glass-panel"
              style={{
                borderTop: '4px solid var(--color-teal)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span className="badge badge-teal" style={{ marginBottom: '1rem' }}>
                  Rescue Command
                </span>
                <h3 style={{ fontSize: '1.45rem', marginBottom: '0.5rem' }}>{t.dualPortals.operatorTitle}</h3>
                <p style={{ fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                  {t.dualPortals.operatorDesc}
                </p>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
                  {[
                    t.dualPortals.operatorFeature1,
                    t.dualPortals.operatorFeature2,
                    t.dualPortals.operatorFeature3,
                    t.dualPortals.operatorFeature4,
                  ].map((feat, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.9rem' }}>
                      <CheckCircle size={17} style={{ color: 'var(--color-teal)', flexShrink: 0, marginTop: '2px' }} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => onNavigate('operator-dashboard')}
                className="btn btn-teal"
                style={{ width: '100%' }}
              >
                <span>{t.nav.operatorDashboard}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Responsible AI & Safety Standards */}
      <section style={{ padding: '3.5rem 1rem' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 2.5rem' }}>
            <span className="badge badge-emerald" style={{ marginBottom: '0.75rem' }}>
              <ShieldCheck size={14} />
              Responsible Architecture
            </span>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.4rem)', marginBottom: '0.75rem' }}>
              {t.safety.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="glass-panel">
              <Cpu size={28} style={{ color: '#34D399', marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>{t.safety.card1Title}</h3>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{t.safety.card1Desc}</p>
            </div>

            <div className="glass-panel">
              <ShieldCheck size={28} style={{ color: '#38BDF8', marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>{t.safety.card2Title}</h3>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{t.safety.card2Desc}</p>
            </div>

            <div className="glass-panel">
              <CheckCircle size={28} style={{ color: '#FBBF24', marginBottom: '0.75rem' }} />
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>{t.safety.card3Title}</h3>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{t.safety.card3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Quick Emergency Action Bar */}
      <section style={{ padding: '1rem' }}>
        <div
          className="container glass-panel"
          style={{
            background: 'linear-gradient(135deg, #102A43 0%, #1E3A5F 100%)',
            border: '1px solid #243B53',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '1.5rem 2rem',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', color: '#FFFFFF' }}>Need immediate emergency assistance?</h3>
            <p style={{ fontSize: '0.9rem', margin: 0, color: '#D9E2EC' }}>
              Transmit an emergency SOS record even if your browser currently has no cellular internet.
            </p>
          </div>

          <button
            onClick={() => onNavigate('send-sos')}
            className="btn btn-sos"
            style={{ padding: '0.75rem 1.5rem' }}
          >
            <AlertTriangle size={18} />
            <span>{t.nav.sendSos}</span>
          </button>
        </div>
      </section>
    </div>
  );
};
