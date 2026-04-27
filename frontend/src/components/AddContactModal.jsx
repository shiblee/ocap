import React, { useState } from 'react';
import { X, UserPlus, Save, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import { useProject } from '../context/ProjectContext';

const AddContactModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    user_name: '',
    email: '',
    phone: '',
    web_token: '',
    ios_token: '',
    android_token: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { activeProject } = useProject();

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email && !formData.phone) {
      setError("Please provide at least an Email or Phone number.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/contacts/', { ...formData, project_id: activeProject.id });
      onSuccess();
      setFormData({
        user_name: '',
        email: '',
        phone: '',
        web_token: '',
        ios_token: '',
        android_token: ''
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create contact.");
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
    transition: 'all 0.2s ease',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backdropFilter: 'blur(10px)'
    }}>
      <div className="glass-effect" style={{
        width: '100%',
        maxWidth: '520px',
        borderRadius: '28px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(30, 41, 59, 0.95)',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '12px', color: '#fff' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '8px', borderRadius: '10px' }}>
              <UserPlus size={22} color="#6366f1" />
            </div>
            Add New Contact
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* User Name */}
            <div>
              <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500', display: 'block', marginBottom: '8px', marginLeft: '4px' }}>Full Name</label>
              <input 
                type="text" 
                style={inputStyle}
                placeholder="Ex: John Doe"
                value={formData.user_name}
                onChange={(e) => setFormData({...formData, user_name: e.target.value})}
              />
            </div>

            {/* Email & Phone Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500', display: 'block', marginBottom: '8px', marginLeft: '4px' }}>Email Address</label>
                <input 
                  type="email" 
                  style={inputStyle}
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500', display: 'block', marginBottom: '8px', marginLeft: '4px' }}>Phone Number</label>
                <input 
                  type="text" 
                  style={inputStyle}
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            {/* Push Tokens Section */}
            <div style={{ 
              marginTop: '8px',
              padding: '24px', 
              borderRadius: '20px', 
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.03)'
            }}>
              <p style={{ fontSize: '11px', color: '#6366f1', fontWeight: '700', marginBottom: '16px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Push Notification Tokens</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    style={{...inputStyle, paddingLeft: '44px', fontSize: '13px' }}
                    placeholder="Web (VAPID) Token"
                    value={formData.web_token}
                    onChange={(e) => setFormData({...formData, web_token: e.target.value})}
                  />
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🌐</div>
                </div>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    style={{...inputStyle, paddingLeft: '44px', fontSize: '13px' }}
                    placeholder="iOS (APNs) Token"
                    value={formData.ios_token}
                    onChange={(e) => setFormData({...formData, ios_token: e.target.value})}
                  />
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🍎</div>
                </div>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    style={{...inputStyle, paddingLeft: '44px', fontSize: '13px' }}
                    placeholder="Android (FCM) Token"
                    value={formData.android_token}
                    onChange={(e) => setFormData({...formData, android_token: e.target.value})}
                  />
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🤖</div>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ marginTop: '20px', padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '13px', display: 'flex', gap: '8px' }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
            <button 
              type="button"
              onClick={onClose}
              className="glass-effect nav-hover" 
              style={{ flex: 1, padding: '12px', borderRadius: '12px', color: 'white' }}
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading}
              className="vibrant-gradient"
              style={{ 
                flex: 2, 
                padding: '12px', 
                borderRadius: '12px', 
                fontWeight: '600', 
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Save size={18} />
              {loading ? 'Saving...' : 'Save Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContactModal;
