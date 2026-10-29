import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Map, 
  Navigation, 
  Waves, 
  Eye, 
  Radio, 
  Package, 
  HeartHandshake, 
  History, 
  ShieldAlert, 
  Globe, 
  Menu, 
  X,
  Send,
  Home,
  Search
} from 'lucide-react';
import type { Language, TranslationDict } from '../lib/i18n';

export type NavView = 
  | 'home'
  | 'send-sos'
  | 'citizen-tracker'
  | 'rescue-map'
  | 'live-location'
  | 'flood-rescue'
  | 'casualty-review'
  | 'drone-simulator'
  | 'jeeva-drop'
  | 'jeeva-care'
  | 'disaster-history'
  | 'operator-dashboard'
  | 'relay-mesh'
  | 'settings';

interface NavbarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  language: Language;
  onToggleLanguage: () => void;
  t: TranslationDict;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  language,
  onToggleLanguage,
  t,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavView; label: string; icon: React.ReactNode; isEmergency?: boolean }[] = [
    { id: 'home', label: t.nav.home, icon: <Home size={16} /> },
    { id: 'send-sos', label: t.nav.sendSos, icon: <AlertTriangle size={16} />, isEmergency: true },
    { id: 'citizen-tracker', label: t.nav.citizenTracker, icon: <Search size={16} /> },
    { id: 'relay-mesh', label: t.nav.relayMesh, icon: <Radio size={16} /> },
    { id: 'rescue-map', label: t.nav.rescueMap, icon: <Map size={16} /> },
    { id: 'live-location', label: t.nav.liveLocation, icon: <Navigation size={16} /> },
    { id: 'flood-rescue', label: t.nav.floodRescue, icon: <Waves size={16} /> },
    { id: 'casualty-review', label: t.nav.casualtyReview, icon: <Eye size={16} /> },
    { id: 'drone-simulator', label: t.nav.droneSimulator, icon: <Radio size={16} /> },
    { id: 'jeeva-drop', label: t.nav.jeevaDrop, icon: <Package size={16} /> },
    { id: 'jeeva-care', label: t.nav.jeevaCare, icon: <HeartHandshake size={16} /> },
    { id: 'disaster-history', label: t.nav.disasterHistory, icon: <History size={16} /> },
    { id: 'operator-dashboard', label: t.nav.operatorDashboard, icon: <ShieldAlert size={16} /> },
  ];

  const handleNavClick = (view: NavView) => {
    onSelectView(view);
    setMobileMenuOpen(false);
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: '#102A43',
        borderBottom: '1px solid #243B53',
        boxShadow: '0 2px 10px rgba(16, 42, 67, 0.25)',
      }}
    >
      <div className="container" style={{ padding: '0.75rem 1.25rem' }}>
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <div 
            onClick={() => handleNavClick('home')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(239, 68, 68, 0.5)',
              }}
            >
              <Send size={22} color="#FFFFFF" style={{ transform: 'rotate(-45deg)' }} />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span 
                  style={{ 
                    fontFamily: 'var(--font-display)', 
                    fontWeight: 800, 
                    fontSize: '1.25rem',
                    color: '#FFFFFF',
                    letterSpacing: '-0.02em',
                  }}
                >
                  JeevaScan <span style={{ color: '#EF4444' }}>AI</span>
                </span>
                <span 
                  className="badge badge-subtle" 
                  style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', border: '1px solid rgba(255, 255, 255, 0.15)' }}
                >
                  RakshaFly AI
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1 }}>
                {t.brand.tagline}
              </p>
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="flex items-center gap-3">
            {/* Quick SOS CTA */}
            <button
              onClick={() => handleNavClick('send-sos')}
              className="btn btn-sos"
              style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
            >
              <AlertTriangle size={15} />
              <span>{t.nav.sendSos}</span>
            </button>

            {/* Language Switcher */}
            <button
              onClick={onToggleLanguage}
              className="btn btn-outline"
              style={{
                padding: '0.45rem 0.85rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
              title="Toggle English / తెలుగు"
            >
              <Globe size={15} style={{ color: '#38BDF8' }} />
              <span style={{ fontWeight: 600 }}>{language === 'en' ? 'తెలుగు' : 'English'}</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="btn btn-outline"
              style={{ padding: '0.45rem 0.65rem' }}
              aria-label={mobileMenuOpen ? t.nav.closeMenu : t.nav.menu}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <nav
          style={{
            marginTop: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            overflowX: 'auto',
            scrollbarWidth: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={{
                  background: isActive
                    ? item.isEmergency
                      ? 'rgba(220, 38, 38, 0.25)'
                      : '#0D9488'
                    : 'transparent',
                  color: isActive
                    ? item.isEmergency
                      ? '#FCA5A5'
                      : '#FFFFFF'
                    : '#D9E2EC',
                  border: isActive
                    ? item.isEmergency
                      ? '1px solid #DC2626'
                      : '1px solid #0D9488'
                    : '1px solid transparent',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.825rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Drawer (When Open) */}
      {mobileMenuOpen && (
        <div
          style={{
            backgroundColor: '#102A43',
            borderBottom: '1px solid #243B53',
            padding: '1rem',
            maxHeight: '80vh',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.65rem 0.85rem',
                  background: currentView === item.id ? '#0D9488' : 'rgba(255, 255, 255, 0.05)',
                  border: currentView === item.id ? '1px solid #0D9488' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 'var(--radius-md)',
                  color: currentView === item.id ? '#FFFFFF' : '#D9E2EC',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  textAlign: 'left',
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};
