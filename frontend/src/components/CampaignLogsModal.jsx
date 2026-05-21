import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Clock, Search, User, Phone, Mail, Send } from 'lucide-react';
import api from '../utils/api';

const CampaignLogsModal = ({ isOpen, onClose, campaignId }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && campaignId) {
      fetchLogs();
    }
  }, [isOpen, campaignId]);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/campaigns/${campaignId}/logs`);
      setLogs(res.data);
    } catch (err) {
      setError("Failed to load campaign logs.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const successCount = logs.filter(log => log.status === 'success').length;
  const failedCount = logs.filter(log => log.status === 'failed').length;
  const totalCount = logs.length;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', zIndex: 1000,
      display: 'grid', placeItems: 'center',
      padding: '40px 20px', backdropFilter: 'blur(10px)',
      overflowY: 'auto'
    }}>
      <div className="glass-effect" style={{
        width: '100%', maxWidth: '950px', borderRadius: '28px',
        background: 'rgba(30, 41, 59, 0.95)', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex', flexDirection: 'column', maxHeight: '85vh'
      }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '8px', borderRadius: '10px' }}>
              <Clock size={22} color="#6366f1" />
            </div>
            Campaign Delivery Logs
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>
          {!loading && !error && logs.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px',
              marginBottom: '28px'
            }}>
              {/* Total Sent */}
              <div className="nav-hover" style={{
                background: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.15)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'all 0.2s ease',
              }}>
                <div style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  padding: '12px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#818cf8'
                }}>
                  <Send size={22} />
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>Total Attempts</div>
                  <div style={{ color: '#fff', fontSize: '24px', fontWeight: '700', marginTop: '4px' }}>{totalCount}</div>
                </div>
              </div>

              {/* Successful */}
              <div className="nav-hover" style={{
                background: 'rgba(34, 197, 94, 0.05)',
                border: '1px solid rgba(34, 197, 94, 0.15)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'all 0.2s ease',
              }}>
                <div style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  padding: '12px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4ade80'
                }}>
                  <CheckCircle size={22} />
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>Sent Successfully</div>
                  <div style={{ color: '#22c55e', fontSize: '24px', fontWeight: '700', marginTop: '4px' }}>{successCount}</div>
                </div>
              </div>

              {/* Failed */}
              <div className="nav-hover" style={{
                background: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                transition: 'all 0.2s ease',
              }}>
                <div style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  padding: '12px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f87171'
                }}>
                  <AlertCircle size={22} />
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '500' }}>Failed Delivery</div>
                  <div style={{ color: '#ef4444', fontSize: '24px', fontWeight: '700', marginTop: '4px' }}>{failedCount}</div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Loading logs...</div>
          ) : error ? (
            <div style={{ color: '#ef4444', textAlign: 'center', padding: '20px' }}>{error}</div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>No logs found for this campaign.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontSize: '12px', fontWeight: '600' }}>RECIPIENT INFO</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontSize: '12px', fontWeight: '600' }}>STATUS</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontSize: '12px', fontWeight: '600' }}>ERROR MESSAGE</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: '#64748b', fontSize: '12px', fontWeight: '600' }}>TIME</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ color: '#fff', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <User size={14} color="#94a3b8" /> {log.contact_name || 'Unknown'}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Mail size={12} /> {log.contact_email || '-'}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={12} /> {log.contact_phone || '-'}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      {log.status === 'success' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                          <CheckCircle size={14} /> Success
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                          <AlertCircle size={14} /> Failed
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px', color: '#94a3b8', fontSize: '13px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.error_message}>
                      {log.error_message || '-'}
                    </td>
                    <td style={{ padding: '16px', color: '#94a3b8', fontSize: '13px', textAlign: 'right' }}>
                      {new Date(log.sent_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignLogsModal;
