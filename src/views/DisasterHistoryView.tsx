// ==============================================================================
// JEEVASCAN AI — DISASTER HISTORY & RETROSPECTIVE ARCHIVE VIEW
// Team: RakshaFly AI | Tagline: Find Faster. Rescue Smarter.
// Phase 13 — Authoritative disaster archives, verified government sources & lessons
// ==============================================================================

import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Waves,
  Wind,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Copy,
  Check,
  ShieldCheck,
  Calendar,
  MapPin,
  Activity,
  ArrowRight,
  Info,
  RotateCcw,
} from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';
import type { NavView } from '../components/Navbar';
import type { HistoricalDisasterRecord, DisasterType } from '../types/phase13';
import {
  HISTORICAL_DISASTER_DATA,
  filterDisasterRecords,
} from '../lib/history/disasterHistoryData';

interface DisasterHistoryViewProps {
  t: TranslationDict;
  onNavigate?: (view: NavView) => void;
}

export const DisasterHistoryView: React.FC<DisasterHistoryViewProps> = ({
  t,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(
    HISTORICAL_DISASTER_DATA[0]?.id || null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return filterDisasterRecords(HISTORICAL_DISASTER_DATA, {
      searchQuery,
      disasterType: selectedType,
      year: selectedYear,
    });
  }, [searchQuery, selectedType, selectedYear]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedYear('all');
  };

  const toggleExpand = (id: string) => {
    setExpandedRecordId((prev) => (prev === id ? null : id));
  };

  const handleCopySummary = (rec: HistoricalDisasterRecord) => {
    const text = [
      `=== JEEVASCAN AI — HISTORICAL DISASTER BRIEF ===`,
      `Title: ${rec.title}`,
      `Timeline: ${rec.dateRange}`,
      `Region: ${rec.stateRegion} (${rec.affectedRegions.join(', ')})`,
      `Meteorological Trigger: ${rec.documentedFacts.meteorologicalCause}`,
      `Peak Intensity: ${rec.documentedFacts.peakPrecipitationOrIntensity}`,
      `Documented Impact: ${rec.documentedFacts.officialImpactSummary}`,
      `Casualties: ${rec.documentedFacts.documentedCasualtiesEstimate}`,
      `Official Sources: ${rec.sources.map((s) => `${s.agency} - ${s.title}`).join('; ')}`,
      `Notice: Curated from published official NDMA / IMD / State records.`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedId(rec.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getTypeBadge = (type: DisasterType) => {
    switch (type) {
      case 'flood':
        return (
          <span
            className="badge badge-teal"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
          >
            <Waves size={13} />
            <span>{t.disasterHistory.typeFlood}</span>
          </span>
        );
      case 'cyclone':
        return (
          <span
            className="badge badge-amber"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
          >
            <Wind size={13} />
            <span>{t.disasterHistory.typeCyclone}</span>
          </span>
        );
      case 'glof':
        return (
          <span
            className="badge badge-purple"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              background: '#F3E8FF',
              color: '#7E22CE',
              border: '1px solid #D8B4FE',
            }}
          >
            <AlertTriangle size={13} />
            <span>{t.disasterHistory.typeGlof}</span>
          </span>
        );
      default:
        return <span className="badge badge-subtle">{type.toUpperCase()}</span>;
    }
  };

  const isFiltersActive = searchQuery.trim() !== '' || selectedType !== 'all' || selectedYear !== 'all';

  return (
    <main className="container" style={{ padding: '2.5rem 1.25rem 4.5rem', maxWidth: '1080px' }}>
      {/* 1. Page Header */}
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span className="badge badge-cyan" style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', gap: '0.4rem' }}>
            <History size={14} />
            Phase 13 — Disaster Retrospective Archive
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)', marginBottom: '0.5rem', fontWeight: 800 }}>
          {t.disasterHistory.pageTitle}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '750px', margin: '0 auto' }}>
          {t.disasterHistory.pageSubtitle}
        </p>
      </header>

      {/* 2. Offline Knowledge Base Notice Banner */}
      <section
        aria-label="Offline Storage Status"
        style={{
          background: 'rgba(14, 165, 233, 0.08)',
          border: '1px solid rgba(14, 165, 233, 0.35)',
          borderRadius: 'var(--radius-md)',
          padding: '0.9rem 1.25rem',
          fontSize: '0.825rem',
          color: '#0369A1',
          marginBottom: '1.75rem',
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'flex-start',
        }}
      >
        <BookOpen size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#0284C7' }} />
        <div>
          <strong style={{ display: 'block', color: '#075985', lineHeight: 1.5, marginBottom: '0.2rem' }}>
            {t.disasterHistory.offlineNotice}
          </strong>
          <span style={{ color: '#0369A1' }}>
            {t.disasterHistory.externalSourceNotice}
          </span>
        </div>
      </section>

      {/* 3. Search & Filter Bar */}
      <section
        aria-label="Filter Historical Records"
        className="glass-panel"
        style={{
          padding: '1.15rem 1.35rem',
          marginBottom: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Search Input */}
        <div style={{ flex: '1 1 260px', position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.disasterHistory.searchPlaceholder}
            aria-label={t.disasterHistory.searchPlaceholder}
            className="input-field"
            style={{ width: '100%', paddingLeft: '2.4rem' }}
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          <div className="flex items-center gap-2">
            <Filter size={15} style={{ color: 'var(--text-muted)' }} />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              aria-label={t.disasterHistory.filterType}
              className="input-field"
              style={{ fontSize: '0.85rem', padding: '0.5rem 0.8rem' }}
            >
              <option value="all">{t.disasterHistory.allTypes}</option>
              <option value="flood">{t.disasterHistory.typeFlood}</option>
              <option value="cyclone">{t.disasterHistory.typeCyclone}</option>
              <option value="glof">{t.disasterHistory.typeGlof}</option>
            </select>
          </div>

          <div>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              aria-label={t.disasterHistory.filterYear}
              className="input-field"
              style={{ fontSize: '0.85rem', padding: '0.5rem 0.8rem' }}
            >
              <option value="all">{t.disasterHistory.allYears}</option>
              <option value="2023">2023</option>
              <option value="2020">2020</option>
              <option value="2015">2015</option>
            </select>
          </div>

          {isFiltersActive && (
            <button
              onClick={handleResetFilters}
              className="btn btn-outline"
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.825rem', gap: '0.35rem' }}
              title={t.disasterHistory.clearFilters}
            >
              <RotateCcw size={13} />
              <span>{t.disasterHistory.clearFilters}</span>
            </button>
          )}
        </div>
      </section>

      {/* 4. Active Results Count Bar */}
      <div className="flex items-center justify-between" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {t.disasterHistory.recordsFound}:
          </span>
          <span className="badge badge-subtle" style={{ fontWeight: 700 }}>
            {filteredRecords.length}
          </span>
        </div>

        {onNavigate && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('flood-rescue')}
              className="btn btn-outline"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '0.35rem' }}
            >
              <Waves size={13} style={{ color: '#0284C7' }} />
              <span>{t.nav.floodRescue}</span>
              <ArrowRight size={12} />
            </button>
            <button
              onClick={() => onNavigate('rescue-map')}
              className="btn btn-outline"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '0.35rem' }}
            >
              <MapPin size={13} style={{ color: '#10B981' }} />
              <span>{t.nav.rescueMap}</span>
              <ArrowRight size={12} />
            </button>
          </div>
        )}
      </div>

      {/* 5. Chronological Case Studies Stream */}
      {filteredRecords.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
          <History size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3, color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '1.15rem', marginBottom: '0.35rem' }}>
            {t.disasterHistory.noRecordsFound}
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Try adjusting your search keywords or clearing the active filters.
          </p>
          <button
            onClick={handleResetFilters}
            className="btn btn-primary"
            style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
          >
            {t.disasterHistory.clearFilters}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {filteredRecords.map((rec) => {
            const isExpanded = expandedRecordId === rec.id;
            return (
              <article
                key={rec.id}
                className="glass-panel"
                style={{
                  padding: '1.5rem',
                  borderLeft:
                    rec.disasterType === 'flood'
                      ? '4px solid #0284C7'
                      : rec.disasterType === 'cyclone'
                      ? '4px solid #F59E0B'
                      : '4px solid #9333EA',
                }}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div className="flex items-center gap-2" style={{ flexWrap: 'wrap' }}>
                    <span className="badge badge-subtle" style={{ fontWeight: 800, fontSize: '0.775rem' }}>
                      {rec.year}
                    </span>
                    {getTypeBadge(rec.disasterType)}
                    <span className="badge badge-emerald" style={{ gap: '0.3rem', fontSize: '0.7rem' }}>
                      <ShieldCheck size={12} />
                      Verified Official Record
                    </span>
                  </div>

                  <div className="flex items-center gap-1" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <Calendar size={13} />
                    <span>{rec.dateRange}</span>
                  </div>
                </div>

                {/* Title & Region */}
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  {rec.title}
                </h2>
                <div className="flex items-center gap-2" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <MapPin size={14} style={{ color: '#DC2626' }} />
                  <strong>{rec.stateRegion}</strong>
                  <span>•</span>
                  <span>Districts: {rec.affectedRegions.join(', ')}</span>
                </div>

                {/* Key Facts Summary Pill Box */}
                <div
                  style={{
                    background: '#F8FAFC',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '0.75rem',
                    fontSize: '0.825rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div>
                    <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {t.disasterHistory.peakIntensityLabel}:
                    </span>
                    <strong style={{ color: '#0369A1' }}>
                      {rec.documentedFacts.peakPrecipitationOrIntensity}
                    </strong>
                  </div>

                  <div>
                    <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {t.disasterHistory.officialCasualtiesLabel}:
                    </span>
                    <strong style={{ color: '#B91C1C' }}>
                      {rec.documentedFacts.documentedCasualtiesEstimate}
                    </strong>
                  </div>
                </div>

                {/* Short Brief / Summary */}
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  {rec.documentedFacts.officialImpactSummary}
                </p>

                {/* Expand / Collapse Action Bar */}
                <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleExpand(rec.id)}
                      aria-expanded={isExpanded}
                      className="btn btn-outline"
                      style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem', gap: '0.4rem' }}
                    >
                      <span>{isExpanded ? t.disasterHistory.closeCaseStudy : t.disasterHistory.viewCaseStudy}</span>
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>

                    <button
                      onClick={() => handleCopySummary(rec)}
                      className="btn btn-outline"
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.825rem', gap: '0.35rem' }}
                      title={t.disasterHistory.copySummaryBtn}
                    >
                      {copiedId === rec.id ? (
                        <>
                          <Check size={14} color="#10B981" />
                          <span style={{ color: '#10B981' }}>{t.disasterHistory.copiedBtn}</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>{t.disasterHistory.copySummaryBtn}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                    {rec.sources.length} Official Agency Citations (NDMA / IMD / SDMA)
                  </span>
                </div>

                {/* 6. Detailed Expandable Case Study Panel */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: '1.5rem',
                      paddingTop: '1.5rem',
                      borderTop: '2px dashed var(--border-medium)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.5rem',
                    }}
                  >
                    {/* Section A: Documented Historical Facts */}
                    <section aria-labelledby={`facts-heading-${rec.id}`}>
                      <div className="flex items-center gap-2" style={{ marginBottom: '0.65rem' }}>
                        <Activity size={16} style={{ color: '#0284C7' }} />
                        <h3 id={`facts-heading-${rec.id}`} style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          {t.disasterHistory.factsSectionTitle}
                        </h3>
                      </div>

                      <div
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid var(--border-medium)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '1rem 1.15rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                          fontSize: '0.875rem',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#0369A1', display: 'block', marginBottom: '0.15rem' }}>
                            {t.disasterHistory.meteorologicalCauseLabel}:
                          </strong>
                          <span style={{ color: 'var(--text-primary)', lineHeight: 1.45 }}>
                            {rec.documentedFacts.meteorologicalCause}
                          </span>
                        </div>

                        <div>
                          <strong style={{ color: '#0369A1', display: 'block', marginBottom: '0.15rem' }}>
                            {t.disasterHistory.impactSectionTitle}:
                          </strong>
                          <span style={{ color: 'var(--text-primary)', lineHeight: 1.45 }}>
                            {rec.documentedFacts.inundationAndDisplacement}
                          </span>
                        </div>
                      </div>
                    </section>

                    {/* Section B: Official Emergency Response Measures */}
                    <section aria-labelledby={`response-heading-${rec.id}`}>
                      <div className="flex items-center gap-2" style={{ marginBottom: '0.65rem' }}>
                        <ShieldCheck size={16} style={{ color: '#059669' }} />
                        <h3 id={`response-heading-${rec.id}`} style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          {t.disasterHistory.responseSectionTitle}
                        </h3>
                      </div>

                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: '1.35rem',
                          fontSize: '0.875rem',
                          color: 'var(--text-primary)',
                          lineHeight: 1.55,
                        }}
                      >
                        {rec.responseMeasures.map((measure, idx) => (
                          <li key={idx} style={{ marginBottom: '0.35rem' }}>
                            {measure}
                          </li>
                        ))}
                      </ul>
                    </section>

                    {/* Section C: Institutional Lessons Learned & JeevaScan AI Rationale */}
                    <section aria-labelledby={`lessons-heading-${rec.id}`}>
                      <div className="flex items-center gap-2" style={{ marginBottom: '0.65rem' }}>
                        <Info size={16} style={{ color: '#D97706' }} />
                        <h3 id={`lessons-heading-${rec.id}`} style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          {t.disasterHistory.lessonsSectionTitle}
                        </h3>
                      </div>

                      <div
                        style={{
                          background: 'rgba(245, 158, 11, 0.05)',
                          border: '1px solid rgba(245, 158, 11, 0.25)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '1rem 1.15rem',
                        }}
                      >
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: '1.25rem',
                            fontSize: '0.85rem',
                            color: '#92400E',
                            lineHeight: 1.5,
                          }}
                        >
                          {rec.lessonsLearned.map((lesson, idx) => (
                            <li key={idx} style={{ marginBottom: '0.35rem' }}>
                              {lesson}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </section>

                    {/* Section D: Authoritative Agency Citations & Links */}
                    <section aria-labelledby={`sources-heading-${rec.id}`}>
                      <div className="flex items-center gap-2" style={{ marginBottom: '0.65rem' }}>
                        <BookOpen size={16} style={{ color: '#6366F1' }} />
                        <h3 id={`sources-heading-${rec.id}`} style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                          {t.disasterHistory.sourcesSectionTitle}
                        </h3>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                        {rec.sources.map((src) => (
                          <div
                            key={src.id}
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid var(--border-medium)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.85rem 1rem',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              gap: '0.5rem',
                            }}
                          >
                            <div>
                              <div className="flex items-center justify-between" style={{ marginBottom: '0.25rem' }}>
                                <span className="badge badge-subtle" style={{ fontSize: '0.7rem', fontWeight: 700 }}>
                                  {src.agency}
                                </span>
                                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>
                                  {src.publicationYear}
                                </span>
                              </div>
                              <strong style={{ fontSize: '0.825rem', color: 'var(--text-primary)', display: 'block', lineHeight: 1.35 }}>
                                {src.title}
                              </strong>
                              {src.reportReference && (
                                <span style={{ fontSize: '0.725rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                                  Ref: {src.reportReference}
                                </span>
                              )}
                            </div>

                            <a
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-outline"
                              style={{
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.75rem',
                                color: '#4F46E5',
                                borderColor: '#C7D2FE',
                                width: 'fit-content',
                                gap: '0.3rem',
                              }}
                            >
                              <span>{t.disasterHistory.viewOfficialSourceBtn}</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* 7. Bottom Legal & Research Disclaimer */}
      <footer
        style={{
          marginTop: '3rem',
          padding: '1.25rem',
          background: '#F8FAFC',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}
      >
        <p style={{ margin: 0 }}>
          {t.disasterHistory.disclaimerNotice}
        </p>
      </footer>
    </main>
  );
};

