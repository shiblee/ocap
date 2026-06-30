import React, { useState, useEffect } from 'react';
import { X, FileText, AlertCircle, CheckCircle2, History, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../utils/api';
import { useProject } from '../context/ProjectContext';
import { formatDateTimeIST } from '../utils/dateFormatter';

const ImportHistoryModal = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedErrorLog, setSelectedErrorLog] = useState(null);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const { activeProject } = useProject();
  const limit = 5;

  useEffect(() => {
    if (isOpen && activeProject) {
      fetchLogs();
    }
  }, [isOpen, activeProject, page, searchTerm]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/contacts/import-logs?project_id=${activeProject.id}&skip=${page * limit}&limit=${limit}&search=${searchTerm}`);
      setLogs(res.data.items || []);
      setTotalLogs(res.data.total || 0);
    } catch (err) {
      console.error("Failed to fetch import logs", err);
    } finally {
      setLoading(false);
    }
  };



  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
      <div className="glass-effect" style={{ width: '100%', maxWidth: '800px', borderRadius: '24px', padding: '32px', border: '1px solid var(--border-glass)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <History size={24} color="#6366f1" />
            </div>
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '700' }}>Import History</h3>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Logs of previously imported CSV files</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {!selectedErrorLog && (
          <div className="glass-effect" style={{ padding: '12px', borderRadius: '12px', marginBottom: '16px', display: 'flex', gap: '16px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Search by file name..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                style={{ width: '100%', padding: '8px 12px 8px 36px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-glass)', borderRadius: '8px', color: 'white', outline: 'none', fontSize: '14px' }} 
              />
            </div>
          </div>
        )}

        {selectedErrorLog ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ fontWeight: '600' }}>Errors for {selectedErrorLog.filename}</h4>
              <button 
                onClick={() => setSelectedErrorLog(null)}
                style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '13px' }}
              >
                Back to History
              </button>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '12px', padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
              {selectedErrorLog.error_details && selectedErrorLog.error_details.length > 0 ? (
                <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                  {selectedErrorLog.error_details.map((err, idx) => (
                    <li key={idx} style={{ padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '12px' }}>
                      <AlertCircle size={16} color="#ef4444" style={{ marginTop: '2px' }} />
                      <div>
                        <span style={{ fontWeight: '600', color: '#ef4444' }}>Row {err.row}:</span> <span style={{ color: '#e2e8f0' }}>{err.error}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: '#94a3b8' }}>No detailed errors available.</p>
              )}
            </div>
          </div>
        ) : (
          <div style={{ background: 'rgba(15, 23, 42, 0.5)', borderRadius: '16px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                  <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: '600' }}>File Name</th>
                  <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: '600' }}>Date</th>
                  <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: '600' }}>Total Rows</th>
                  <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: '600' }}>Imported</th>
                  <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: '600' }}>Failed</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center' }}><div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto' }}></div></td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>No import history found.</td></tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }} className="nav-hover">
                      <td style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} color="#94a3b8" />
                        <span style={{ fontWeight: '500' }}>{log.filename}</span>
                      </td>
                      <td style={{ padding: '16px 20px', color: '#cbd5e1', fontSize: '14px' }}>
                        {formatDateTimeIST(log.created_at)}
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: '600' }}>
                        {log.total_rows}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', fontSize: '13px', fontWeight: '600' }}>
                          <CheckCircle2 size={14} /> {log.imported_count}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        {log.failed_count > 0 ? (
                          <button 
                            onClick={() => setSelectedErrorLog(log)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '13px', fontWeight: '600', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer' }}
                            title="View Errors"
                          >
                            <AlertCircle size={14} /> {log.failed_count}
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '14px' }}>0</span>
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
        )}
      </div>
    </div>
  );
};

export default ImportHistoryModal;
