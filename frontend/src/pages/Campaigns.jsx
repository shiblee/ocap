import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Plus, 
  Search, 
  MoreVertical, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Mail,
  MessageSquare,
  Globe,
  Smartphone,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';
import api from '../utils/api';
import CreateCampaignModal from '../components/CreateCampaignModal';
import { useProject } from '../context/ProjectContext';
import { Briefcase } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const styles = {
    draft: { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', label: 'Draft' },
    scheduled: { bg: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', label: 'Scheduled' },
    sending: { bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', label: 'Sending', animate: true },
    completed: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', label: 'Completed' },
    failed: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: 'Failed' }
  };

  const style = styles[status] || styles.draft;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 12px',
      borderRadius: '20px',
      background: style.bg,
      color: style.color,
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'capitalize'
    }}>
      {style.animate && (
        <span style={{ 
          width: '6px', 
          height: '6px', 
          borderRadius: '50%', 
          background: style.color,
          animation: 'pulse 1.5s infinite'
        }} />
      )}
      {style.label}
    </div>
  );
};

const ChannelIcon = ({ channel }) => {
  const icons = {
    email: <Mail size={16} />,
    sms: <MessageSquare size={16} />,
    whatsapp: <Smartphone size={16} />,
    web_push: <Globe size={16} />,
    ios_push: <Smartphone size={16} />,
    android_push: <Smartphone size={16} />
  };
  return icons[channel] || <Send size={16} />;
};

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const { activeProject } = useProject();
  const limit = 10;

  useEffect(() => {
    fetchCampaigns();
    // Poll for updates every 3 seconds if there are sending campaigns
    const interval = setInterval(fetchCampaigns, 3000);
    return () => clearInterval(interval);
  }, [page, searchTerm]);

  const fetchCampaigns = async () => {
    if (!activeProject) {
      setCampaigns([]);
      setLoading(false);
      return;
    }
    try {
      // project_id is automatically added by api.js interceptor if available in localStorage
      const res = await api.get(`/campaigns/?skip=${page * limit}&limit=${limit}&search=${searchTerm}`);
      setCampaigns(res.data);
    } catch (err) {
      console.error("Failed to fetch campaigns", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (id) => {
    try {
      await api.post(`/campaigns/${id}/start`);
      fetchCampaigns();
    } catch (err) {
      alert("Failed to start campaign.");
    }
  };

  const handleStop = async (id) => {
    if (!window.confirm("Are you sure you want to stop this campaign?")) return;
    try {
      await api.patch(`/campaigns/${id}/stop`);
      fetchCampaigns();
    } catch (err) {
      alert("Failed to stop campaign.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("This will permanently delete the campaign and its history. Continue?")) return;
    try {
      await api.delete(`/campaigns/${id}`);
      fetchCampaigns();
    } catch (err) {
      alert("Failed to delete campaign.");
    }
  };

  const [editingCampaign, setEditingCampaign] = useState(null);

  const handleEdit = (camp) => {
    setEditingCampaign(camp);
    setIsModalOpen(true);
  };

  return (
    <div style={{ padding: '40px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>Campaigns</h1>
          <p style={{ color: '#94a3b8' }}>Design, schedule and track your messaging performance.</p>
        </div>
        <button 
          onClick={() => {
            setEditingCampaign(null);
            setIsModalOpen(true);
          }}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '12px 28px', 
            borderRadius: '12px', 
            border: 'none',
            color: 'white',
            fontWeight: '800',
            cursor: 'pointer',
            background: '#4f46e5',
            boxShadow: '0 10px 25px rgba(79, 70, 229, 0.5)',
            fontSize: '15px',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#4338ca';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#4f46e5';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <Plus size={20} /> Create Campaign
        </button>
      </header>

      {!activeProject && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '24px', borderRadius: '16px', color: '#ef4444', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Briefcase size={24} />
          <div>
            <h4 style={{ fontWeight: '700' }}>No Project Selected</h4>
            <p style={{ fontSize: '14px', color: 'rgba(239, 68, 68, 0.8)' }}>Please select a project from the sidebar to view its campaigns.</p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="glass-effect" style={{ padding: '16px', borderRadius: '16px', marginBottom: '24px', display: 'flex', gap: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search campaigns by name or subject..." 
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0); // Reset to first page on search
            }}
            style={{ 
              width: '100%', 
              padding: '10px 10px 10px 40px', 
              background: 'rgba(15, 23, 42, 0.5)', 
              border: '1px solid var(--border-glass)', 
              borderRadius: '10px',
              color: 'white',
              outline: 'none'
            }} 
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-effect" style={{ borderRadius: '24px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
              <th style={{ padding: '20px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', fontSize: '13px' }}>CAMPAIGN NAME</th>
              <th style={{ padding: '20px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', fontSize: '13px' }}>CHANNEL</th>
              <th style={{ padding: '20px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', fontSize: '13px' }}>STATUS</th>
              <th style={{ padding: '20px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', fontSize: '13px' }}>PROGRESS</th>
              <th style={{ padding: '20px 24px', textAlign: 'left', color: '#64748b', fontWeight: '600', fontSize: '13px' }}>CREATED</th>
              <th style={{ padding: '20px 24px', textAlign: 'right' }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((camp) => {
              const progress = camp.total_contacts > 0 
                ? Math.round((camp.sent_count / camp.total_contacts) * 100) 
                : 0;
                
              return (
                <tr key={camp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: '0.2s' }} className="table-row-hover">
                  <td style={{ padding: '24px' }}>
                    <div style={{ fontWeight: '600', color: '#fff', fontSize: '15px' }}>{camp.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{camp.subject || 'No subject'}</div>
                  </td>
                  <td style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '14px' }}>
                      <ChannelIcon channel={camp.channel} />
                      <span style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px' }}>{camp.channel.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td style={{ padding: '24px' }}>
                    <StatusBadge status={camp.status} />
                  </td>
                  <td style={{ padding: '24px' }}>
                    <div style={{ width: '140px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
                        <span>{camp.sent_count} / {camp.total_contacts}</span>
                        <span>{progress}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ 
                          width: `${progress}%`, 
                          height: '100%', 
                          background: camp.status === 'stopped' ? '#ef4444' : 'linear-gradient(90deg, #6366f1, #a855f7)',
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '24px', color: '#64748b', fontSize: '14px' }}>
                    {new Date(camp.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      {camp.status === 'sending' ? (
                        <button 
                          onClick={() => handleStop(camp.id)}
                          style={{
                            padding: '6px 12px', borderRadius: '8px', border: '1px solid #ef4444',
                            background: 'transparent', color: '#ef4444', fontSize: '12px',
                            fontWeight: '600', cursor: 'pointer'
                          }}
                        >
                          Stop
                        </button>
                      ) : (
                        (camp.status === 'draft' || camp.status === 'stopped') && (
                          <button 
                            onClick={() => handleStart(camp.id)}
                            style={{
                              padding: '6px 12px', borderRadius: '8px', border: '1px solid #22c55e',
                              background: 'transparent', color: '#22c55e', fontSize: '12px',
                              fontWeight: '600', cursor: 'pointer'
                            }}
                          >
                            {camp.status === 'stopped' ? 'Resume' : 'Start'}
                          </button>
                        )
                      )}
                      
                      {(camp.status === 'draft' || camp.status === 'scheduled') && (
                        <button 
                          onClick={() => handleEdit(camp)}
                          style={{
                            padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                            background: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: '12px',
                            fontWeight: '600', cursor: 'pointer'
                          }}
                        >
                          Edit
                        </button>
                      )}

                      <button 
                        onClick={() => handleDelete(camp.id)}
                        style={{
                          padding: '6px 8px', borderRadius: '8px', border: 'none',
                          background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', 
                          cursor: 'pointer'
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)' }}>
          <span style={{ color: '#64748b', fontSize: '14px' }}>Showing page {page + 1}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'none', color: page === 0 ? '#334155' : 'white', cursor: page === 0 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              disabled={campaigns.length < limit}
              onClick={() => setPage(p => p + 1)}
              style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'none', color: campaigns.length < limit ? '#334155' : 'white', cursor: campaigns.length < limit ? 'not-allowed' : 'pointer' }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {campaigns.length === 0 && !loading && (
          <div style={{ padding: '80px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ marginBottom: '20px', opacity: 0.5 }}><Send size={48} style={{ margin: '0 auto' }} /></div>
            <h3>No campaigns found</h3>
            <p>Create your first campaign to start messaging your audience.</p>
          </div>
        )}
      </div>

      <CreateCampaignModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingCampaign(null);
        }}
        campaign={editingCampaign}
        onSuccess={() => {
          setIsModalOpen(false);
          setEditingCampaign(null);
          fetchCampaigns();
        }}
      />
    </div>
  );
};

export default Campaigns;
