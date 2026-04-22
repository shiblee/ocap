import React, { useState } from 'react';
import { X, Send, Mail, MessageSquare, Globe, Smartphone, ChevronRight, ChevronLeft, Save, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import { useProject } from '../context/ProjectContext';

const CreateCampaignModal = ({ isOpen, onClose, onSuccess, campaign }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { activeProject } = useProject();
  
  const [formData, setFormData] = useState({
    name: '',
    channel: 'email',
    subject: '',
    content: ''
  });

  React.useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        channel: campaign.channel || 'email',
        subject: campaign.subject || '',
        content: campaign.content || ''
      });
    } else {
      setFormData({ name: '', channel: 'email', subject: '', content: '' });
    }
  }, [campaign, isOpen]);

  if (!isOpen) return null;

  const channels = [
    { id: 'email', label: 'Email', icon: <Mail size={20} />, color: '#6366f1', desc: 'Send rich emails to your audience' },
    { id: 'sms', label: 'SMS', icon: <MessageSquare size={20} />, color: '#10b981', desc: 'Direct text messages' },
    { id: 'whatsapp', label: 'WhatsApp', icon: <Smartphone size={20} />, color: '#25d366', desc: 'Official WhatsApp Business API' },
    { id: 'web_push', label: 'Web Push', icon: <Globe size={20} />, color: '#f59e0b', desc: 'Browser notifications' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 2) {
      setStep(2);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = { ...formData, project_id: activeProject.id };
      if (campaign) {
        await api.put(`/campaigns/${campaign.id}`, data);
      } else {
        await api.post('/campaigns/', data);
      }
      onSuccess();
      setStep(1);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save campaign.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    color: '#fff',
    outline: 'none',
    fontSize: '14px',
    transition: 'all 0.2s ease'
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px', backdropFilter: 'blur(10px)'
    }}>
      <div className="glass-effect" style={{
        width: '100%', maxWidth: '600px', borderRadius: '28px',
        background: 'rgba(30, 41, 59, 0.95)', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '8px', borderRadius: '10px' }}>
              <Send size={22} color="#6366f1" />
            </div>
            {step === 1 ? 'New Campaign' : 'Message Content'}
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
          {step === 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500', display: 'block', marginBottom: '8px' }}>Campaign Name</label>
                <input 
                  type="text" 
                  style={inputStyle}
                  placeholder="Ex: Welcome Series - April"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500', display: 'block', marginBottom: '16px' }}>Select Channel</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  {channels.map((ch) => (
                    <div 
                      key={ch.id}
                      onClick={() => setFormData({...formData, channel: ch.id})}
                      style={{
                        padding: '16px',
                        borderRadius: '16px',
                        border: '1px solid',
                        borderColor: formData.channel === ch.id ? ch.color : 'rgba(255,255,255,0.05)',
                        background: formData.channel === ch.id ? `${ch.color}10` : 'rgba(15, 23, 42, 0.4)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        transition: '0.2s'
                      }}
                    >
                      <div style={{ background: formData.channel === ch.id ? ch.color : 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px', color: formData.channel === ch.id ? 'white' : '#475569' }}>
                        {ch.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontWeight: '600' }}>{ch.label}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{ch.desc}</div>
                      </div>
                      {formData.channel === ch.id && <ChevronRight size={20} color={ch.color} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {formData.channel === 'email' && (
                <div>
                  <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500', display: 'block', marginBottom: '8px' }}>Email Subject</label>
                  <input 
                    type="text" 
                    style={inputStyle}
                    placeholder="Enter email subject line"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    required
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                  {formData.channel === 'email' ? 'Email Body' : 'Message Text'}
                </label>
                <textarea 
                  rows={6}
                  style={{...inputStyle, resize: 'none'}}
                  placeholder="Write your message here..."
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  required
                />
                <p style={{ fontSize: '11px', color: '#475569', marginTop: '8px' }}>
                  Tips: Use a clear call to action for better engagement.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div style={{ marginTop: '20px', padding: '12px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '13px', display: 'flex', gap: '8px' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
            {step === 2 ? (
              <button 
                type="button" 
                onClick={() => setStep(1)}
                className="glass-effect nav-hover"
                style={{ flex: 1, padding: '14px', borderRadius: '14px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <ChevronLeft size={18} /> Back
              </button>
            ) : (
              <button 
                type="button" 
                onClick={onClose}
                className="glass-effect nav-hover"
                style={{ flex: 1, padding: '14px', borderRadius: '14px', color: 'white' }}
              >
                Cancel
              </button>
            )}
            
            <button 
              type="submit"
              disabled={loading}
              style={{ 
                flex: 2, 
                padding: '14px', 
                borderRadius: '14px', 
                fontWeight: '800', 
                border: 'none', 
                color: 'white', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '8px',
                background: '#4f46e5',
                boxShadow: '0 10px 20px rgba(79, 70, 229, 0.4)',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '15px'
              }}
              onMouseOver={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#4338ca';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseOut={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#4f46e5';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {loading ? 'Processing...' : (step === 1 ? 'Next Step' : 'Launch Campaign')}
              {step === 1 && !loading && <ChevronRight size={18} />}
              {step === 2 && !loading && <Send size={18} />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCampaignModal;
