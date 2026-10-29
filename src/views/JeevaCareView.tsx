// ==============================================================================
// JEEVASCAN AI — JEEVACARE DONATION & PLEDGE COORDINATION VIEW
// Team: RakshaFly AI | Tagline: Find Faster. Rescue Smarter.
// Phase 12 — Transparent disaster relief donation coordination and pledge tracking
// ==============================================================================

import React, { useState, useMemo } from 'react';
import {
  HeartHandshake,
  ShieldAlert,
  ArrowLeft,
  Package,
  Droplets,
  HeartPulse,
  Coins,
  Search,
} from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';
import type { NavView } from '../components/Navbar';
import type {
  DonationCategory,
  ReliefCampaign,
  JeevaCarePledge,
} from '../types/phase12';
import {
  listReliefCampaigns,
  listCarePledges,
  createCarePledge,
  updateCarePledgeStatus,
  cancelCarePledge,
  DEMO_PLEDGE_NOTICE,
} from '../lib/care/jeevaCareStore';

interface JeevaCareViewProps {
  t: TranslationDict;
  onNavigate: (view: NavView) => void;
}

export const JeevaCareView: React.FC<JeevaCareViewProps> = ({ t, onNavigate }) => {
  const [campaigns, setCampaigns] = useState<ReliefCampaign[]>(() => listReliefCampaigns());
  const [pledges, setPledges] = useState<JeevaCarePledge[]>(() => listCarePledges());
  const [activeTab, setActiveTab] = useState<'campaigns' | 'make_pledge' | 'pledge_tracker'>('campaigns');

  // Form State
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(() => {
    const list = listReliefCampaigns();
    return list.length > 0 ? list[0].id : '';
  });
  const [pledgeCategory, setPledgeCategory] = useState<DonationCategory>('food_water');
  const [donorName, setDonorName] = useState<string>('');
  const [donorCity, setDonorCity] = useState<string>('Hyderabad');
  const [monetaryAmount, setMonetaryAmount] = useState<number>(1000);
  const [physicalQuantity, setPhysicalQuantity] = useState<number>(20);
  const [physicalUnit, setPhysicalUnit] = useState<string>('Kits');
  const [itemDescription, setItemDescription] = useState<string>('');

  // Feedback State
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const refreshData = () => {
    const c = listReliefCampaigns();
    const p = listCarePledges();
    setCampaigns(c);
    setPledges(p);
  };

  const filteredPledges = useMemo(() => {
    return pledges.filter((plg) => {
      if (statusFilter !== 'all' && plg.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mCode = plg.pledgeCode.toLowerCase().includes(q);
        const mDonor = plg.donorDisplayName.toLowerCase().includes(q);
        const mCamp = plg.campaignTitle.toLowerCase().includes(q);
        if (!mCode && !mDonor && !mCamp) return false;
      }
      return true;
    });
  }, [pledges, statusFilter, searchQuery]);

  const handleSubmitPledge = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    try {
      const newPledge = createCarePledge({
        campaignId: selectedCampaignId,
        category: pledgeCategory,
        donorDisplayName: donorName,
        donorCity,
        monetaryAmountInr: pledgeCategory === 'money_pledge' ? Number(monetaryAmount) : undefined,
        physicalQuantity: pledgeCategory !== 'money_pledge' ? Number(physicalQuantity) : undefined,
        physicalUnit,
        itemDescription,
      });

      refreshData();
      setStatusMessage({
        type: 'success',
        text: `Donation pledge ${newPledge.pledgeCode} recorded successfully. Awaiting community verification. (Demo pledge - no payment processed)`,
      });
      setActiveTab('pledge_tracker');
      setDonorName('');
      setItemDescription('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error recording pledge';
      setStatusMessage({ type: 'error', text: msg });
    }
  };

  const handleVerifyPledge = (pledgeId: string) => {
    try {
      updateCarePledgeStatus(pledgeId, 'verified', 'OP-VERIFIER-1', 'Pledge confirmed by relief coordinator');
      refreshData();
    } catch (err: unknown) {
      console.warn(err);
    }
  };

  const handleFulfillPledge = (pledgeId: string) => {
    try {
      updateCarePledgeStatus(pledgeId, 'fulfilled', 'OP-VERIFIER-1', 'Relief goods received and staged at camp');
      refreshData();
    } catch (err: unknown) {
      console.warn(err);
    }
  };

  const handleCancelPledge = (pledgeId: string) => {
    try {
      cancelCarePledge(pledgeId, 'Pledge cancelled by donor or coordinator');
      refreshData();
    } catch (err: unknown) {
      console.warn(err);
    }
  };

  return (
    <div className="container" style={{ padding: '1.5rem 1rem 4rem', maxWidth: '1440px' }}>
      {/* 1. HEADER */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button
          onClick={() => onNavigate('home')}
          className="btn"
          style={{
            padding: '4px 8px',
            fontSize: '0.75rem',
            marginBottom: '0.65rem',
            backgroundColor: 'transparent',
            color: 'var(--color-navy)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={14} />
          <span>{t.nav.home || 'Home'}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(217, 119, 6, 0.1)',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HeartHandshake size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-navy)', margin: 0 }}>
                {t.care.pageTitle || 'JeevaCare Donation Coordination'}
              </h1>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                {t.care.pageSubtitle || 'Transparent community disaster relief pledge tracking for food, clean water, medical aid, and emergency funds.'}
              </p>
            </div>
          </div>

          <span
            className="badge"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              color: '#D97706',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            DEMO PLEDGE ONLY — NO PAYMENT PROCESSED
          </span>
        </div>

        {/* Mandatory Financial Safety Notice */}
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            fontSize: '0.775rem',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            lineHeight: 1.4,
          }}
        >
          <ShieldAlert size={16} style={{ flexShrink: 0, color: '#D97706' }} />
          <span>
            <strong>Payment Safety Notice:</strong> {DEMO_PLEDGE_NOTICE}
          </span>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          style={{
            padding: '0.65rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: statusMessage.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${statusMessage.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
            color: statusMessage.type === 'success' ? '#065F46' : '#991B1B',
            fontSize: '0.775rem',
            marginBottom: '1rem',
          }}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('campaigns')}
          className="btn"
          style={{
            padding: '6px 14px',
            fontSize: '0.8rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: activeTab === 'campaigns' ? '#102A43' : 'transparent',
            color: activeTab === 'campaigns' ? '#FFFFFF' : 'var(--color-navy)',
            fontWeight: 700,
          }}
        >
          Relief Campaigns ({campaigns.length})
        </button>

        <button
          onClick={() => setActiveTab('make_pledge')}
          className="btn"
          style={{
            padding: '6px 14px',
            fontSize: '0.8rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: activeTab === 'make_pledge' ? '#102A43' : 'transparent',
            color: activeTab === 'make_pledge' ? '#FFFFFF' : 'var(--color-navy)',
            fontWeight: 700,
          }}
        >
          Make a Relief Pledge
        </button>

        <button
          onClick={() => setActiveTab('pledge_tracker')}
          className="btn"
          style={{
            padding: '6px 14px',
            fontSize: '0.8rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: activeTab === 'pledge_tracker' ? '#102A43' : 'transparent',
            color: activeTab === 'pledge_tracker' ? '#FFFFFF' : 'var(--color-navy)',
            fontWeight: 700,
          }}
        >
          Community Pledge Tracker ({pledges.length})
        </button>
      </div>

      {/* 2. TAB 1: RELIEF CAMPAIGNS DIRECTORY */}
      {activeTab === 'campaigns' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="glass-panel"
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-medium)',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.725rem', fontWeight: 700, color: '#D97706' }}>
                    {camp.campaignCode}
                  </span>
                  <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                    Sample Campaign
                  </span>
                </div>

                <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-navy)' }}>
                  {camp.title}
                </h3>

                <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.775rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {camp.description}
                </p>

                {/* Progress Stats */}
                <div style={{ padding: '0.65rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.75rem' }}>
                  {camp.monetaryTargetInr && (
                    <div style={{ marginBottom: '0.35rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>Financial Target:</span>
                        <strong>₹{camp.monetaryPledgedInr?.toLocaleString()} / ₹{camp.monetaryTargetInr?.toLocaleString()}</strong>
                      </div>
                      <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#E2E8F0', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, Math.round(((camp.monetaryPledgedInr || 0) / camp.monetaryTargetInr) * 100))}%`, backgroundColor: '#059669' }} />
                      </div>
                    </div>
                  )}

                  {camp.physicalTargetUnits && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>{camp.itemUnitName}:</span>
                        <strong>{camp.physicalPledgedUnits} / {camp.physicalTargetUnits} units</strong>
                      </div>
                      <div style={{ height: '6px', borderRadius: '3px', backgroundColor: '#E2E8F0', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, Math.round(((camp.physicalPledgedUnits || 0) / camp.physicalTargetUnits) * 100))}%`, backgroundColor: '#0284C7' }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedCampaignId(camp.id);
                  setActiveTab('make_pledge');
                }}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  backgroundColor: '#102A43',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                }}
              >
                <HeartHandshake size={15} />
                <span>Pledge Support for this Drive</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 3. TAB 2: PLEDGE SUBMISSION FORM */}
      {activeTab === 'make_pledge' && (
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <form
            onSubmit={handleSubmitPledge}
            className="glass-panel"
            style={{
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-medium)',
              backgroundColor: '#FFFFFF',
            }}
          >
            <h3 style={{ margin: '0 0 0.85rem 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-navy)' }}>
              Submit a Disaster Relief Pledge
            </h3>

            {/* Campaign Selection */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Select Relief Campaign
              </label>
              <select
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="input-field"
                style={{ width: '100%', fontSize: '0.8rem' }}
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Donation Category Selector */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Pledge Category
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                {[
                  { id: 'food_water', label: 'Food & Water', icon: <Droplets size={14} /> },
                  { id: 'first_aid_medical', label: 'Medical & First Aid', icon: <HeartPulse size={14} /> },
                  { id: 'relief_materials', label: 'Relief Materials', icon: <Package size={14} /> },
                  { id: 'money_pledge', label: 'Financial Pledge (Demo)', icon: <Coins size={14} /> },
                ].map((cat) => {
                  const isSelected = pledgeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setPledgeCategory(cat.id as DonationCategory)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        border: `1.5px solid ${isSelected ? '#D97706' : 'var(--border-subtle)'}`,
                        backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.08)' : '#FAFCFF',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? '#D97706' : 'var(--color-navy)',
                      }}
                    >
                      {cat.icon}
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conditional Fields: Monetary vs Physical */}
            {pledgeCategory === 'money_pledge' ? (
              <div style={{ marginBottom: '1rem', padding: '0.85rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Pledged Financial Contribution (INR)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-navy)' }}>₹</span>
                  <input
                    type="number"
                    min={100}
                    max={500000}
                    value={monetaryAmount}
                    onChange={(e) => setMonetaryAmount(Number(e.target.value))}
                    className="input-field"
                    style={{ flex: 1, fontSize: '0.85rem' }}
                  />
                </div>
                <span style={{ fontSize: '0.7rem', color: '#D97706', display: 'block', marginTop: '0.3rem' }}>
                  Notice: Pledges register your voluntary commitment. No card details or online payments are ever requested.
                </span>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Pledged Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={physicalQuantity}
                    onChange={(e) => setPhysicalQuantity(Number(e.target.value))}
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Units / Package Type
                  </label>
                  <input
                    type="text"
                    value={physicalUnit}
                    onChange={(e) => setPhysicalUnit(e.target.value)}
                    placeholder="e.g. Kits, Bottles, Blankets"
                    className="input-field"
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            )}

            {/* Item Description */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Pledge Details & Description
              </label>
              <textarea
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="e.g. 20 sealed packs of potable water and oral rehydration salts ready for camp delivery."
                rows={2}
                className="input-field"
                style={{ width: '100%', fontSize: '0.8rem' }}
                required
              />
            </div>

            {/* Donor Metadata */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Donor / Organization Name *
                </label>
                <input
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="e.g. Hyderabad Youth Club"
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  City / District
                </label>
                <input
                  type="text"
                  value={donorCity}
                  onChange={(e) => setDonorCity(e.target.value)}
                  placeholder="e.g. Secunderabad"
                  className="input-field"
                  style={{ width: '100%', fontSize: '0.8rem' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '0.85rem',
                backgroundColor: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
              }}
            >
              <HeartHandshake size={16} />
              <span>Record Community Pledge (Demo Simulation)</span>
            </button>
          </form>
        </div>
      )}

      {/* 4. TAB 3: COMMUNITY PLEDGE TRACKER */}
      {activeTab === 'pledge_tracker' && (
        <div
          className="glass-panel"
          style={{
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-medium)',
            backgroundColor: '#FFFFFF',
          }}
        >
          {/* Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
              <Search size={14} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search by pledge code, donor, campaign..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{ width: '100%', fontSize: '0.775rem' }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
              style={{ fontSize: '0.775rem' }}
            >
              <option value="all">All Pledge Statuses</option>
              <option value="pledged">Pledged (Awaiting Verification)</option>
              <option value="verified">Verified by Coordinator</option>
              <option value="fulfilled">Fulfilled & Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Pledges Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.775rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-subtle)', textAlign: 'left', borderBottom: '1.5px solid var(--border-medium)' }}>
                  <th style={{ padding: '8px 10px', color: 'var(--color-navy)' }}>Pledge Code</th>
                  <th style={{ padding: '8px 10px', color: 'var(--color-navy)' }}>Campaign</th>
                  <th style={{ padding: '8px 10px', color: 'var(--color-navy)' }}>Donor</th>
                  <th style={{ padding: '8px 10px', color: 'var(--color-navy)' }}>Pledged Item / Amount</th>
                  <th style={{ padding: '8px 10px', color: 'var(--color-navy)' }}>Status</th>
                  <th style={{ padding: '8px 10px', color: 'var(--color-navy)', textAlign: 'right' }}>Operator Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPledges.map((plg) => {
                  return (
                    <tr key={plg.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--color-navy)' }}>
                        {plg.pledgeCode}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-secondary)' }}>
                        {plg.campaignTitle}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <strong>{plg.donorDisplayName}</strong>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{plg.donorCity}</span>
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        {plg.category === 'money_pledge' ? (
                          <strong style={{ color: '#059669' }}>₹{plg.monetaryAmountInr?.toLocaleString()}</strong>
                        ) : (
                          <span>
                            <strong>{plg.physicalQuantity} {plg.physicalUnit}</strong>
                            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{plg.itemDescription}</span>
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            backgroundColor: plg.status === 'fulfilled' ? '#ECFDF5' : plg.status === 'verified' ? '#EFF6FF' : plg.status === 'cancelled' ? '#FEF2F2' : '#FFFBEB',
                            color: plg.status === 'fulfilled' ? '#059669' : plg.status === 'verified' ? '#0284C7' : plg.status === 'cancelled' ? '#DC2626' : '#D97706',
                          }}
                        >
                          {plg.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end' }}>
                          {plg.status === 'pledged' && (
                            <button
                              onClick={() => handleVerifyPledge(plg.id)}
                              className="btn btn-primary"
                              style={{ padding: '3px 8px', fontSize: '0.7rem', backgroundColor: '#0284C7' }}
                              title="Verify pledge with donor"
                            >
                              Verify
                            </button>
                          )}
                          {plg.status === 'verified' && (
                            <button
                              onClick={() => handleFulfillPledge(plg.id)}
                              className="btn btn-primary"
                              style={{ padding: '3px 8px', fontSize: '0.7rem', backgroundColor: '#059669' }}
                              title="Confirm receipt of goods/pledge at camp"
                            >
                              Fulfill
                            </button>
                          )}
                          {plg.status !== 'fulfilled' && plg.status !== 'cancelled' && (
                            <button
                              onClick={() => handleCancelPledge(plg.id)}
                              className="btn"
                              style={{ padding: '3px 8px', fontSize: '0.7rem', backgroundColor: 'transparent', color: '#DC2626', border: '1px solid #DC2626' }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredPledges.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No community pledges match the filter criteria.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
