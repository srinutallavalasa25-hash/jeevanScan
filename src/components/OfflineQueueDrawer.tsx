import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Database, 
  Layers, 
  RefreshCw, 
  Copy, 
  Trash2, 
  Check 
} from 'lucide-react';
import type { TranslationDict } from '../lib/i18n';
import type { PendingQueueItem, LocalDeliveryState } from '../lib/offline/localQueueTypes';
import { getAllLocalQueueItems, removeLocalQueueItem, retryLocalQueueItem } from '../lib/offline/localQueueManager';
import { processLocalQueue } from '../lib/offline/localWorker';
import { formatSOSTextForClipboard } from '../lib/offline/memoryQueue';

interface OfflineQueueDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  t: TranslationDict;
}

export const OfflineQueueDrawer: React.FC<OfflineQueueDrawerProps> = ({
  isOpen,
  onClose,
  t,
}) => {
  const [items, setItems] = useState<PendingQueueItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const qItems = await getAllLocalQueueItems();
      setItems(qItems);
    } catch (err) {
      console.warn('Failed to load local queue items:', err);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    if (isOpen) {
      getAllLocalQueueItems()
        .then((qItems) => {
          if (!ignore) setItems(qItems);
        })
        .catch((err) => {
          console.warn('Failed to load local queue items:', err);
        });
    }
    return () => {
      ignore = true;
    };
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => {
      loadItems();
    };
    window.addEventListener('jeevascan_local_queue_updated', handleUpdate);
    return () => {
      window.removeEventListener('jeevascan_local_queue_updated', handleUpdate);
    };
  }, [loadItems]);

  if (!isOpen) return null;

  const handleProcessAll = async () => {
    setIsProcessing(true);
    try {
      await processLocalQueue();
      await loadItems();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async (item: PendingQueueItem) => {
    try {
      const text = formatSOSTextForClipboard(item.payload);
      await navigator.clipboard.writeText(text);
      setCopiedId(item.queue_id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  const handleRetry = async (queueId: string) => {
    await retryLocalQueueItem(queueId);
    await loadItems();
  };

  const handleRemove = async (queueId: string) => {
    await removeLocalQueueItem(queueId);
    await loadItems();
  };

  const getStatusBadge = (status: LocalDeliveryState, _isMemoryOnly?: boolean) => {
    switch (status) {
      case 'QUEUED_LOCAL':
        return <span className="badge badge-amber">{t.offlineQueue.statusQueuedLocal}</span>;
      case 'TEMPORARY_MEMORY_ONLY':
        return <span className="badge badge-red">{t.offlineQueue.statusMemoryOnly}</span>;
      case 'LOCAL_PROCESSING':
      case 'UPLOADING':
        return (
          <span className="badge badge-cyan" style={{ gap: '0.4rem' }}>
            <span className="pulse-dot pulse-dot-cyan" />
            {t.offlineQueue.statusProcessing}
          </span>
        );
      case 'CONFIRMED_SERVER_RECEIPT':
        return <span className="badge badge-emerald">{t.offlineQueue.statusServerConfirmed || 'Confirmed on Server'}</span>;
      case 'LOCAL_DEMO_COMMITTED':
        return <span className="badge badge-emerald">{t.offlineQueue.statusCommitted}</span>;
      case 'LOCAL_PROCESSING_RETRY':
      case 'RETRY_SCHEDULED':
        return <span className="badge badge-amber">{t.offlineQueue.statusRetry}</span>;
      case 'RETRY_LIMIT_EXCEEDED':
        return <span className="badge badge-red">{t.offlineQueue.statusRetryExceeded || 'Retries Exhausted'}</span>;
      case 'VALIDATION_FAILED_LOCAL':
      case 'VALIDATION_FAILED':
        return <span className="badge badge-red">{t.offlineQueue.statusValidationFailed}</span>;
      case 'EXPIRED_LOCALLY':
        return <span className="badge badge-subtle">{t.offlineQueue.statusExpired}</span>;
      default:
        return <span className="badge badge-subtle">{status}</span>;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 1050,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '100%',
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid var(--border-medium)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(16, 42, 67, 0.15)',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div className="flex items-center gap-2">
            <Database size={20} style={{ color: '#0D9488' }} />
            <div>
              <h2 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--text-primary)' }}>
                {t.offlineQueue.drawerTitle}
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {items.length} {t.offlineQueue.queueDepth}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleProcessAll}
              disabled={isProcessing}
              className="btn btn-outline"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              title="Process local queue"
            >
              <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
              <span>{t.offlineQueue.retryAction}</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.4rem',
              }}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Informative Subtitle Notice */}
        <div
          style={{
            background: 'var(--color-teal-light)',
            borderBottom: '1px solid #99F6E4',
            padding: '0.75rem 1.25rem',
            fontSize: '0.8rem',
            color: 'var(--color-teal-dark)',
          }}
        >
          {t.offlineQueue.drawerSubtitle}
        </div>

        {/* Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Layers size={40} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>{t.offlineQueue.noItems}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {items.map((item) => (
                <div
                  key={item.queue_id}
                  className="glass-panel"
                  style={{
                    padding: '1rem',
                    border: item.is_memory_only
                      ? '1px solid var(--color-red)'
                      : '1px solid var(--border-subtle)',
                    background: item.is_memory_only
                      ? 'var(--color-red-light)'
                      : '#FFFFFF',
                  }}
                >
                  {/* Top row: Category + Durability label */}
                  <div className="flex items-center justify-between" style={{ marginBottom: '0.5rem' }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                      {item.payload.emergency_type} ({item.payload.priority})
                    </strong>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: item.is_memory_only ? 'var(--color-red)' : 'var(--color-teal)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {item.is_memory_only ? t.offlineQueue.memoryOnlyLabel : t.offlineQueue.durableLabel}
                    </span>
                  </div>

                  {/* Description snippet */}
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.6rem', lineHeight: 1.4 }}>
                    {item.payload.description}
                  </p>

                  {/* Error display if any */}
                  {item.last_error && (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#F87171',
                        padding: '0.4rem 0.6rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '0.6rem',
                      }}
                    >
                      {item.last_error}
                    </div>
                  )}

                  {/* Server Receipt Box */}
                  {item.server_receipt && (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: item.server_receipt.mode === 'live_supabase' ? 'var(--color-teal-dark)' : 'var(--text-secondary)',
                        padding: '0.5rem 0.75rem',
                        background: item.server_receipt.mode === 'live_supabase' ? 'var(--color-teal-light)' : '#F1F5F9',
                        border: item.server_receipt.mode === 'live_supabase' ? '1px solid #99F6E4' : '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        marginBottom: '0.6rem',
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>
                        {item.server_receipt.mode === 'live_supabase' ? '✓ Live Server Ingress Confirmed' : '✓ Local Demo Store Committed'}
                        {item.server_receipt.is_duplicate && ' (Duplicate Confirmed)'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                        {new Date(item.server_receipt.received_at).toLocaleTimeString()} · Tracking: <code>{item.server_receipt.tracking_code || item.sos_id.slice(0, 8)}</code>
                      </div>
                      <div style={{ fontSize: '0.7rem', lineHeight: 1.3, color: 'var(--text-secondary)' }}>
                        {item.server_receipt.mode === 'live_supabase'
                          ? (t.offlineQueue.serverReceiptDisclaimer || 'Received on emergency coordination server. Awaiting operator triage; emergency responders have NOT yet been dispatched.')
                          : (t.offlineQueue.demoReceiptDisclaimer || 'Committed to browser local demonstration store only. Emergency responders have NOT been dispatched.')}
                      </div>
                    </div>
                  )}

                  {/* Status row + ID */}
                  <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <div>
                      ID: <span style={{ fontFamily: 'monospace', color: '#38BDF8' }}>{item.sos_id.slice(0, 8)}...</span>
                    </div>
                    <div>{getStatusBadge(item.delivery_status, item.is_memory_only)}</div>
                  </div>

                  {/* Actions row */}
                  <div
                    className="flex items-center justify-end gap-2"
                    style={{
                      marginTop: '0.75rem',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    <button
                      onClick={() => handleCopy(item)}
                      className="btn btn-outline"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      title="Copy SOS payload to clipboard"
                    >
                      {copiedId === item.queue_id ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedId === item.queue_id ? t.offlineQueue.copiedSuccess : t.offlineQueue.copyPayload}</span>
                    </button>

                    {item.delivery_status !== 'LOCAL_DEMO_COMMITTED' && item.delivery_status !== 'CONFIRMED_SERVER_RECEIPT' && (
                      <button
                        onClick={() => handleRetry(item.queue_id)}
                        className="btn btn-outline"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        <RefreshCw size={12} />
                        <span>{t.offlineQueue.retryAction}</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleRemove(item.queue_id)}
                      className="btn btn-outline"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                      title="Remove from queue"
                    >
                      <Trash2 size={12} />
                      <span>{t.offlineQueue.removeAction}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
