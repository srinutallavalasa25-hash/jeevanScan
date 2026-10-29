import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  HeartPulse, 
  Tent, 
  Filter, 
  Droplets, 
  Utensils, 
  Mountain, 
  FileText, 
  AlertTriangle,
  Info
} from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';
import type { NavView } from '../components/Navbar';
import type { ShelterRecord } from '../types/database';
import { backend, DEMO_SHELTERS } from '../lib/supabase';

interface ShelterDirectoryViewProps {
  t: TranslationDict;
  onNavigate?: (view: NavView) => void;
}

type ShelterFilterType = 'all' | 'shelter' | 'relief_camp' | 'hospital';

export const ShelterDirectoryView: React.FC<ShelterDirectoryViewProps> = ({
  t,
  onNavigate: _onNavigate,
}) => {
  const [shelters, setShelters] = useState<ShelterRecord[]>(DEMO_SHELTERS);
  const [selectedFilter, setSelectedFilter] = useState<ShelterFilterType>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let ignore = false;
    backend.fetchShelters()
      .then((data) => {
        if (!ignore) {
          setShelters(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.warn('Could not load demonstration shelters:', err);
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const filteredShelters = shelters.filter((s) => {
    if (selectedFilter === 'all') return true;
    return s.type === selectedFilter;
  });

  const getShelterIcon = (type: ShelterRecord['type']) => {
    switch (type) {
      case 'hospital':
        return <HeartPulse size={22} style={{ color: '#EF4444' }} />;
      case 'relief_camp':
        return <Tent size={22} style={{ color: '#F59E0B' }} />;
      case 'shelter':
      default:
        return <Building2 size={22} style={{ color: '#38BDF8' }} />;
    }
  };

  const getCapacityPercent = (occupancy: number, capacity: number) => {
    if (!capacity) return 0;
    return Math.min(100, Math.round((occupancy / capacity) * 100));
  };

  return (
    <div className="container" style={{ padding: '2.5rem 1.25rem 4rem', maxWidth: '880px' }}>
      {/* 1. Header & Title */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span className="badge badge-subtle" style={{ padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}>
            <Building2 size={14} color="#38BDF8" />
            JeevaCare Resource Directory
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.3rem)', marginBottom: '0.5rem', fontWeight: 800 }}>
          {t.shelterDirectory.title}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '640px', margin: '0 auto' }}>
          {t.shelterDirectory.subtitle}
        </p>
      </div>

      {/* 2. Mandatory Synthetic Demonstration Warning Banner */}
      <div
        style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem 1.25rem',
          fontSize: '0.825rem',
          color: '#FCA5A5',
          marginBottom: '2rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
        }}
      >
        <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px', color: '#EF4444' }} />
        <div>
          <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#FEE2E2', lineHeight: 1.5 }}>
            {t.shelterDirectory.syntheticNotice}
          </strong>
        </div>
      </div>

      {/* 3. Category Filter Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.5rem',
          marginBottom: '1.75rem',
        }}
      >
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginRight: '0.5rem' }}>
          <Filter size={14} /> Filter:
        </span>
        <button
          onClick={() => setSelectedFilter('all')}
          className={`btn ${selectedFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', borderRadius: '20px' }}
        >
          {t.shelterDirectory.filterAll}
        </button>
        <button
          onClick={() => setSelectedFilter('shelter')}
          className={`btn ${selectedFilter === 'shelter' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', borderRadius: '20px' }}
        >
          {t.shelterDirectory.filterShelter}
        </button>
        <button
          onClick={() => setSelectedFilter('relief_camp')}
          className={`btn ${selectedFilter === 'relief_camp' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', borderRadius: '20px' }}
        >
          {t.shelterDirectory.filterReliefCamp}
        </button>
        <button
          onClick={() => setSelectedFilter('hospital')}
          className={`btn ${selectedFilter === 'hospital' ? 'btn-primary' : 'btn-outline'}`}
          style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', borderRadius: '20px' }}
        >
          {t.shelterDirectory.filterHospital}
        </button>
      </div>

      {/* 4. Shelter Cards List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading demonstration facilities...
        </div>
      ) : filteredShelters.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            {t.shelterDirectory.noShelters}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
          {filteredShelters.map((shelter) => {
            const percent = getCapacityPercent(shelter.current_occupancy, shelter.capacity);
            const isNearFull = percent >= 85;

            return (
              <div
                key={shelter.id}
                className="glass-panel"
                style={{
                  padding: '1.75rem',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {/* Header & Badges */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {getShelterIcon(shelter.type)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.2rem', color: 'var(--text-primary)' }}>
                        {shelter.name}
                      </h3>
                      <span className="badge badge-amber" style={{ fontSize: '0.725rem', padding: '0.2rem 0.5rem' }}>
                        {t.shelterDirectory.demoBadge}
                      </span>
                    </div>
                  </div>

                  <div>
                    {isNearFull ? (
                      <span className="badge badge-red">{t.shelterDirectory.occupancyFull}</span>
                    ) : (
                      <span className="badge badge-emerald">{t.shelterDirectory.occupancyAvailable}</span>
                    )}
                  </div>
                </div>

                {/* Capacity Progress Bar */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '0.4rem',
                    }}
                  >
                    <span>{t.shelterDirectory.capacityLabel}</span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {shelter.current_occupancy} / {shelter.capacity} ({percent}%)
                    </strong>
                  </div>
                  <div
                    style={{
                      height: '8px',
                      background: '#E2E8F0',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${percent}%`,
                        background: isNearFull
                          ? 'linear-gradient(90deg, #F59E0B 0%, #EF4444 100%)'
                          : 'linear-gradient(90deg, #10B981 0%, #38BDF8 100%)',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>

                {/* Simulated Amenities */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    {t.shelterDirectory.amenitiesTitle}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.775rem',
                        padding: '0.3rem 0.6rem',
                        background: '#F0FDFA',
                        borderRadius: 'var(--radius-sm)',
                        color: '#0F766E',
                      }}
                    >
                      <Droplets size={13} /> {t.shelterDirectory.amenityWater}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.775rem',
                        padding: '0.3rem 0.6rem',
                        background: '#FEE2E2',
                        borderRadius: 'var(--radius-sm)',
                        color: '#DC2626',
                      }}
                    >
                      <HeartPulse size={13} /> {t.shelterDirectory.amenityMedical}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.775rem',
                        padding: '0.3rem 0.6rem',
                        background: '#FFEDD5',
                        borderRadius: 'var(--radius-sm)',
                        color: '#C2410C',
                      }}
                    >
                      <Utensils size={13} /> {t.shelterDirectory.amenityFood}
                    </span>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.775rem',
                        padding: '0.3rem 0.6rem',
                        background: '#CCFBF1',
                        borderRadius: 'var(--radius-sm)',
                        color: '#0F766E',
                      }}
                    >
                      <Mountain size={13} /> {t.shelterDirectory.amenityDryGround}
                    </span>
                  </div>
                </div>

                {/* Non-Clickable Fictitious Phone Number Notice */}
                {shelter.contact_number && (
                  <div
                    style={{
                      paddingTop: '0.75rem',
                      borderTop: '1px solid var(--border-subtle)',
                      fontSize: '0.775rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Info size={14} color="#F97316" />
                    <span>
                      Demo Telephone: <code style={{ color: 'var(--text-primary)', padding: '0.1rem 0.3rem' }}>{shelter.contact_number}</code> ({t.shelterDirectory.demoPhoneNotice})
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Evacuation Preparedness Advice */}
      <div
        className="glass-panel"
        style={{
          padding: '1.75rem',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          background: 'rgba(15, 23, 42, 0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <FileText size={20} color="#38BDF8" />
          <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 700, color: '#FFFFFF' }}>
            {t.shelterDirectory.evacuationTipsTitle}
          </h3>
        </div>
        <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7 }}>
          <li>{t.shelterDirectory.tip1}</li>
          <li>{t.shelterDirectory.tip2}</li>
          <li>{t.shelterDirectory.tip3}</li>
        </ul>
      </div>
    </div>
  );
};
