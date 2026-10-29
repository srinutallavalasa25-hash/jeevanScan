import React, { useState, useEffect } from 'react';
import { 
  Settings,
  Send
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import type { NavView } from './components/Navbar';
import { ConnectivityBanner } from './components/ConnectivityBanner';
import { LandingView } from './views/LandingView';
import { LiveLocationView } from './views/LiveLocationView';
import { SendSOSView } from './views/SendSOSView';
import { OperatorDashboardView } from './views/OperatorDashboardView';
import { CitizenStatusTrackerView } from './views/CitizenStatusTrackerView';
import { ReliefRequestView } from './views/ReliefRequestView';
import { RelaySimulationView } from './views/RelaySimulationView';
import { RescueMapView } from './views/RescueMapView';
import { CasualtyReviewView } from './views/CasualtyReviewView';
import { DroneSimulatorView } from './views/DroneSimulatorView';
import { FloodRescueView } from './views/FloodRescueView';
import { JeevaCareView } from './views/JeevaCareView';
import { DisasterHistoryView } from './views/DisasterHistoryView';
import { OfflineQueueDrawer } from './components/OfflineQueueDrawer';
import { startLocalQueueWorker, getLocalQueueStats, processLocalQueue, setSimulatedOffline } from './lib/offline/localWorker';
import { translations } from './lib/i18n';
import type { Language } from './lib/i18n';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<NavView>('home');
  const [language, setLanguage] = useState<Language>('en');
  const [activeSosIdForTracker, setActiveSosIdForTracker] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isQueueDrawerOpen, setIsQueueDrawerOpen] = useState<boolean>(false);
  const [queueCount, setQueueCount] = useState<number>(0);
  const [queueStats, setQueueStats] = useState<{ pending: number; committed: number }>({
    pending: 0,
    committed: 0,
  });

  const t = translations[language];

  // Requirement 3: Start strictly local background queue worker
  useEffect(() => {
    const stopWorker = startLocalQueueWorker(8000);

    const updateStats = async () => {
      try {
        const stats = await getLocalQueueStats();
        setQueueCount(stats.totalPending);
        setQueueStats({
          pending: stats.totalPending,
          committed: stats.totalCommitted,
        });
      } catch (err) {
        console.warn('Could not read queue stats:', err);
      }
    };

    updateStats();
    window.addEventListener('jeevascan_local_queue_updated', updateStats);

    return () => {
      stopWorker();
      window.removeEventListener('jeevascan_local_queue_updated', updateStats);
    };
  }, []);

  // Listen to browser network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsSyncing(true);
      processLocalQueue()
        .catch((err) => console.warn('Reconnection sync error:', err))
        .finally(() => setIsSyncing(false));
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsSyncing(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleToggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'te' : 'en'));
  };

  const handleToggleSimulatedOffline = () => {
    setIsSimulatedOffline((prev) => {
      const next = !prev;
      setSimulatedOffline(next);
      if (!next && navigator.onLine) {
        setIsSyncing(true);
        processLocalQueue()
          .catch((err) => console.warn('Offline simulation disabled sync error:', err))
          .finally(() => setIsSyncing(false));
      }
      return next;
    });
  };

  // Render view router
  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return <LandingView t={t} onNavigate={setCurrentView} />;

      case 'send-sos':
        return (
          <SendSOSView 
            t={t} 
            onNavigate={setCurrentView} 
            onTrackSos={(sosId) => {
              setActiveSosIdForTracker(sosId);
              setCurrentView('citizen-tracker');
            }}
          />
        );

      case 'citizen-tracker':
        return (
          <CitizenStatusTrackerView
            t={t}
            onNavigate={setCurrentView}
            initialSosId={activeSosIdForTracker}
          />
        );

      case 'relay-mesh':
        return (
          <RelaySimulationView
            t={t}
            language={language}
            onNavigate={setCurrentView}
            onTrackSos={(sosId) => {
              setActiveSosIdForTracker(sosId);
              setCurrentView('citizen-tracker');
            }}
          />
        );

      case 'rescue-map':
        return (
          <RescueMapView
            t={t}
            onNavigate={setCurrentView}
            initialSelectedSosId={activeSosIdForTracker}
          />
        );

      case 'live-location':
        return (
          <LiveLocationView
            t={t}
            onNavigate={setCurrentView}
            activeSosId={activeSosIdForTracker}
          />
        );

      case 'flood-rescue':
        return (
          <FloodRescueView
            t={t}
            onNavigate={setCurrentView}
            initialSelectedSosId={activeSosIdForTracker}
          />
        );

      case 'casualty-review':
        return (
          <CasualtyReviewView
            t={t}
            onNavigate={setCurrentView}
            initialSelectedSosId={activeSosIdForTracker}
          />
        );

      case 'drone-simulator':
        return (
          <DroneSimulatorView
            t={t}
            onNavigate={setCurrentView}
            initialSelectedSosId={activeSosIdForTracker}
          />
        );

      case 'jeeva-drop':
        return (
          <ReliefRequestView
            t={t}
            onNavigate={setCurrentView}
            initialSosId={activeSosIdForTracker}
          />
        );

      case 'jeeva-care':
        return (
          <JeevaCareView
            t={t}
            onNavigate={setCurrentView}
          />
        );

      case 'disaster-history':
        return (
          <DisasterHistoryView
            t={t}
            onNavigate={setCurrentView}
          />
        );

      case 'operator-dashboard':
        return <OperatorDashboardView t={t} onNavigate={setCurrentView} />;

      case 'settings':
        return (
          <div className="container" style={{ padding: '2.5rem 1.25rem 4rem', maxWidth: '700px' }}>
            <div className="glass-panel">
              <div className="flex items-center gap-3" style={{ marginBottom: '1.5rem' }}>
                <Settings size={28} style={{ color: '#38BDF8' }} />
                <div>
                  <h1 style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>{t.nav.settings}</h1>
                  <p style={{ fontSize: '0.9rem', margin: 0 }}>Configure language, network simulation, and preferences</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Language Switch */}
                <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Interface Language (భాష)</h3>
                  <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Select your preferred language for navigation and emergency prompts</p>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setLanguage('en')}
                      className={`btn ${language === 'en' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setLanguage('te')}
                      className={`btn ${language === 'te' ? 'btn-primary' : 'btn-outline'}`}
                      style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
                    >
                      తెలుగు (Telugu)
                    </button>
                  </div>
                </div>

                {/* Network Testing Mode */}
                <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Network Connectivity Testing</h3>
                  <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Simulate offline mode to test browser IndexedDB persistence even while connected to Wi-Fi</p>

                  <button
                    onClick={handleToggleSimulatedOffline}
                    className={`btn ${isSimulatedOffline ? 'btn-amber' : 'btn-outline'}`}
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
                  >
                    {isSimulatedOffline ? 'Disable Offline Simulation (Return to Live)' : 'Simulate Offline Mode (Demo)'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <LandingView t={t} onNavigate={setCurrentView} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-dark)' }}>
      {/* 1. Global Connectivity Status Banner */}
      <ConnectivityBanner
        t={t}
        isOnline={isOnline}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulatedOffline={handleToggleSimulatedOffline}
        isSyncing={isSyncing}
        queueCount={queueCount}
        pendingCount={queueStats.pending}
        committedCount={queueStats.committed}
        onOpenQueue={() => setIsQueueDrawerOpen(true)}
      />

      {/* Offline Queue Slide-over Drawer */}
      <OfflineQueueDrawer
        isOpen={isQueueDrawerOpen}
        onClose={() => setIsQueueDrawerOpen(false)}
        t={t}
      />

      {/* 2. Responsive Emergency Navigation Header */}
      <Navbar
        currentView={currentView}
        onSelectView={setCurrentView}
        language={language}
        onToggleLanguage={handleToggleLanguage}
        t={t}
      />

      {/* 3. Main Active Content View */}
      <main style={{ flex: 1 }}>
        {renderCurrentView()}
      </main>

      {/* 4. Unified Crisis Resilience Footer */}
      <footer
        style={{
          borderTop: '1px solid #243B53',
          backgroundColor: '#102A43',
          padding: '2.5rem 1.25rem 2rem',
          fontSize: '0.85rem',
          color: '#D9E2EC',
        }}
      >
        <div className="container">
          <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="flex items-center gap-2">
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Send size={15} color="#FFFFFF" style={{ transform: 'rotate(-45deg)' }} />
              </div>
              <strong style={{ color: '#FFFFFF', fontSize: '1rem' }}>JeevaScan AI</strong>
              <span className="badge badge-subtle">RakshaFly AI</span>
            </div>

            <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-muted)' }}>
              "{t.brand.tagline}"
            </p>
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.05)',
              paddingTop: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              fontSize: '0.8rem',
            }}
          >
            <div>{t.footer.copyright}</div>
            <div className="flex items-center gap-1">
              <span>{t.footer.developedBy}</span>
            </div>
            <div style={{ color: 'var(--text-muted)' }}>{t.footer.rights}</div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
