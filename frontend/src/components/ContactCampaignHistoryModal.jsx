import React, { useState, useEffect } from 'react';
import { X, History, XCircle, CheckCircle, Search, ChevronLeft, ChevronRight, User } from 'lucide-react';
import api from '../utils/api';

const ContactCampaignHistoryModal = ({ isOpen, onClose, contact }) => {
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const limit = 5;

  useEffect(() => {
    if (isOpen && contact) {
      fetchLogs();
    }
  }, [isOpen, contact, page, searchTerm]);

  // Reset state when modal opens for a new contact
  useEffect(() => {
    if (isOpen) {
      setPage(0);
      setSearchTerm('');
    }
  }, [isOpen, contact?.id]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/contacts/${contact.id}/campaign-logs?skip=${page * limit}&limit=${limit}&search=${searchTerm}`);
      setLogs(res.data.items || []);
      setTotalLogs(res.data.total || 0);
    } catch (err) {
      console.error("Failed to fetch campaign logs", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  };

  if (!isOpen || !contact) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div className="glass-effect" style={{ width: '100%', maxWidth: '800px', borderRadius: '24px', padding: '32px', border: '1px solid var(--border-glass)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <History size={24} color="#6366f1" />
            </div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Campaign History</h3>
              <p style={{ color: '#94a3b8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <User size={14} /> {contact.user_name || contact.email || contact.phone}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div className="glass-effect" style={{ padding: '12px', borderRadius: '12px', marginBottom: '16px', display: 'flex', gap: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              placeholder="Search by campaign name..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
              style={{ width: '100%', padding: '8px 12px 8px 36px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'white', outline: 'none', fontSize: '14px' }} 
            />
          </div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: '600' }}>Campaign Name</th>
                <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: '600' }}>Channel</th>
                <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: '600' }}>Sent At</th>
                <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: '600' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ padding: '32px', textAlign: 'center' }}><div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto' }}></div></td></tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                    {searchTerm ? "No campaigns match your search." : "No campaigns sent to this contact yet."}
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }} className="nav-hover">
                    <td style={{ padding: '16px 20px', fontWeight: '500' }}>
                      {log.campaign_name}
                      {log.status === 'failed' && log.error_message && (
                        <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>
                          Error: {log.error_message}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#cbd5e1', fontSize: '14px', textTransform: 'capitalize' }}>
                      {log.campaign_channel}
                    </td>
                    <td style={{ padding: '16px 20px', color: '#cbd5e1', fontSize: '14px' }}>
                      {formatDate(log.sent_at)}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {log.status === 'success' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', fontSize: '13px', fontWeight: '600' }}>
                          <CheckCircle size={14} /> Success
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '13px', fontWeight: '600' }}>
                          <XCircle size={14} /> Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {/* Pagination Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid var(--border-glass)' }}>
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>
              Showing {logs.length > 0 ? page * limit + 1 : 0} to {Math.min((page + 1) * limit, totalLogs)} of {totalLogs} entries
            </span>
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '28px', height: '28px', borderRadius: '6px',
                  background: page === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.1)',
                  color: page === 0 ? '#64748b' : '#6366f1',
                  border: 'none', cursor: page === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * limit >= totalLogs}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '28px', height: '28px', borderRadius: '6px',
                  background: (page + 1) * limit >= totalLogs ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.1)',
                  color: (page + 1) * limit >= totalLogs ? '#64748b' : '#6366f1',
                  border: 'none', cursor: (page + 1) * limit >= totalLogs ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactCampaignHistoryModal;
