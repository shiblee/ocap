import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Image, Type, Palette, Save, CheckCircle, 
  Mail, MessageSquare, Globe, Bell, Eye, EyeOff, Lock, ChevronRight,
  Activity, Loader2, Send, AlertTriangle, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';

import { useProject } from '../context/ProjectContext';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { activeProject } = useProject();
  
  // Test Modal States
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testChannel, setTestChannel] = useState(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: bool, message: string }

  const [formData, setFormData] = useState({
    app_name: 'OCAP',
    copyright_text: '© 2026 OCAP',
    primary_color: '#6366f1',
    email_config: { provider: 'smtp', host: '', port: 587, user: '', password: '', sender: '', sender_name: '', aws_region: 'us-east-1', aws_access_key_id: '', aws_secret_access_key: '' },
    sms_config: { provider: 'twilio', sid: '', token: '', from: '' },
    whatsapp_config: { phone_id: '', token: '', provider: 'meta' },
    push_config: { server_key: '', vapid_public: '', vapid_private: '' }
  });

  useEffect(() => {
    fetchSettings();
  }, [activeProject]);

  const fetchSettings = async () => {
    try {
      // Fetch Global settings
      const globalRes = await api.get('/settings');
      
      let projectData = {};
      if (activeProject) {
        // Fetch Project-specific settings
        const projRes = await api.get(`/settings/project/${activeProject.id}`);
        projectData = projRes.data;
      }

      setFormData({
        app_name: globalRes.data?.app_name || 'OCAP',
        copyright_text: globalRes.data?.copyright_text || '',
        primary_color: globalRes.data?.primary_color || '#6366f1',
        email_config: {
          provider: 'smtp', host: '', port: 587, user: '', password: '',
          sender: '', sender_name: '', aws_region: 'us-east-1',
          aws_access_key_id: '', aws_secret_access_key: '',
          ...(projectData.email_config || {})
        },
        sms_config: projectData.sms_config || { provider: 'twilio', sid: '', token: '', from: '' },
        whatsapp_config: projectData.whatsapp_config || { phone_id: '', token: '', provider: 'meta' },
        push_config: projectData.push_config || { server_key: '', vapid_public: '', vapid_private: '' }
      });
    } catch (err) {
      console.error("Failed to fetch settings", err);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setSuccess(false);
    try {
      // Save global settings
      await api.put('/settings', {
        app_name: formData.app_name,
        copyright_text: formData.copyright_text,
        primary_color: formData.primary_color
      });

      // Always save project channel settings when a project is active
      if (activeProject) {
        await api.put(`/settings/project/${activeProject.id}`, {
          email_config: formData.email_config,
          sms_config: formData.sms_config,
          whatsapp_config: formData.whatsapp_config,
          push_config: formData.push_config
        });
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await api.post('/settings/test-connection', {
        channel: testChannel,
        recipient: testRecipient
      });
      setTestResult({ success: true, message: res.data.message });
    } catch (err) {
      setTestResult({ success: false, message: err.response?.data?.detail || "Connection attempt failed." });
    } finally {
      setTestLoading(false);
    }
  };

  const openTestModal = (channel) => {
    setTestChannel(channel);
    setTestRecipient('');
    setTestResult(null);
    setIsTestModalOpen(true);
  };

  const TestButton = ({ channel }) => (
    <button
      onClick={() => openTestModal(channel)}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.3)',
        background: 'rgba(99, 102, 241, 0.05)', color: '#6366f1',
        fontSize: '13px', fontWeight: '600', cursor: 'pointer',
        marginTop: '12px'
      }}
      className="nav-hover"
    >
      <Activity size={14} /> Verify & Test Configuration
    </button>
  );

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

  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        width: '100%', padding: '14px 20px', borderRadius: '12px',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        background: activeTab === id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
        color: activeTab === id ? '#6366f1' : '#94a3b8',
        fontWeight: activeTab === id ? '700' : '500',
        transition: '0.2s'
      }}
    >
      <Icon size={18} />
      {label}
    </button>
  );

  return (
    <div style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '16px', color: '#fff' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.2)', padding: '10px', borderRadius: '12px' }}>
            <SettingsIcon size={32} color="#6366f1" />
          </div>
          Settings
        </h1>
        <p style={{ color: '#94a3b8', marginTop: '8px', fontSize: '16px' }}>Configure your branding and messaging channel credentials.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '40px' }}>
        
        {/* Sidebar Nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <TabButton id="general" label="General Branding" icon={LayoutIcon} />
          <TabButton id="email" label="Email" icon={Mail} />
          <TabButton id="sms" label="SMS Gateway" icon={MessageSquare} />
          <TabButton id="whatsapp" label="WhatsApp API" icon={Globe} />
          <TabButton id="push" label="Push Notifications" icon={Bell} />
        </div>

        {/* Content Area */}
        <div style={{ minHeight: '500px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="glass-effect"
              style={{ padding: '32px', borderRadius: '24px' }}
            >
              {activeTab === 'general' && (
                <section>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Type size={20} color="#6366f1" /> Branding & Theme
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={labelStyle}>App Name</label>
                      <input style={inputStyle} value={formData.app_name} onChange={e => setFormData({...formData, app_name: e.target.value})} />
                    </div>
                    <div>
                      <label style={labelStyle}>Theme Color</label>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <input type="color" value={formData.primary_color} onChange={e => setFormData({...formData, primary_color: e.target.value})} style={colorInputStyle} />
                        <code style={{ color: '#fff' }}>{formData.primary_color}</code>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === 'email' && (
                <section>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Mail size={20} color="#6366f1" /> Email Configuration
                    </h3>
                    <TestButton channel="email" />
                  </div>

                  {/* Provider Toggle */}
                  <div style={{ marginBottom: '28px' }}>
                    <label style={labelStyle}>Email Provider</label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {[
                        { value: 'smtp', label: '✉️  SMTP', desc: 'Gmail, SendGrid, Mailgun…' },
                        { value: 'ses',  label: '☁️  AWS SES', desc: 'Amazon Simple Email Service' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setFormData({ ...formData, email_config: { ...formData.email_config, provider: opt.value } })}
                          style={{
                            flex: 1, padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                            border: formData.email_config.provider === opt.value
                              ? '2px solid #6366f1'
                              : '1px solid rgba(255,255,255,0.1)',
                            background: formData.email_config.provider === opt.value
                              ? 'rgba(99,102,241,0.15)'
                              : 'rgba(15,23,42,0.4)',
                            textAlign: 'left', transition: 'all 0.2s',
                          }}
                        >
                          <div style={{ color: formData.email_config.provider === opt.value ? '#a5b4fc' : '#fff', fontWeight: '700', fontSize: '14px' }}>{opt.label}</div>
                          <div style={{ color: '#64748b', fontSize: '12px', marginTop: '3px' }}>{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Common fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={labelStyle}>Sender Business Name</label>
                      <input style={inputStyle} placeholder="e.g. Acme Corp Support" value={formData.email_config.sender_name} onChange={e => setFormData({...formData, email_config: {...formData.email_config, sender_name: e.target.value}})} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={labelStyle}>Sender Email (From Address)</label>
                      <input style={inputStyle} placeholder="hello@yourbrand.com" value={formData.email_config.sender} onChange={e => setFormData({...formData, email_config: {...formData.email_config, sender: e.target.value}})} />
                    </div>

                    {/* ── SMTP fields ── */}
                    {formData.email_config.provider === 'smtp' && (<>
                      <div>
                        <label style={labelStyle}>SMTP Host</label>
                        <input style={inputStyle} placeholder="smtp.gmail.com" value={formData.email_config.host} onChange={e => setFormData({...formData, email_config: {...formData.email_config, host: e.target.value}})} />
                      </div>
                      <div>
                        <label style={labelStyle}>SMTP Port</label>
                        <input style={inputStyle} placeholder="587" value={formData.email_config.port} onChange={e => setFormData({...formData, email_config: {...formData.email_config, port: e.target.value}})} />
                      </div>
                      <div>
                        <label style={labelStyle}>Username</label>
                        <input style={inputStyle} value={formData.email_config.user} onChange={e => setFormData({...formData, email_config: {...formData.email_config, user: e.target.value}})} />
                      </div>
                      <div style={{ position: 'relative' }}>
                        <label style={labelStyle}>Password / App Password</label>
                        <input type={showPassword ? "text" : "password"} style={inputStyle} value={formData.email_config.password} onChange={e => setFormData({...formData, email_config: {...formData.email_config, password: e.target.value}})} />
                        <button onClick={() => setShowPassword(!showPassword)} style={eyeButtonStyle}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </>)}

                    {/* ── AWS SES fields ── */}
                    {formData.email_config.provider === 'ses' && (<>
                      <div>
                        <label style={labelStyle}>AWS Region</label>
                        <select
                          style={{ ...inputStyle, cursor: 'pointer' }}
                          value={formData.email_config.aws_region}
                          onChange={e => setFormData({...formData, email_config: {...formData.email_config, aws_region: e.target.value}})}
                        >
                          {['us-east-1','us-east-2','us-west-1','us-west-2','eu-west-1','eu-west-2','eu-west-3','eu-central-1','ap-south-1','ap-southeast-1','ap-southeast-2','ap-northeast-1','ca-central-1'].map(r => (
                            <option key={r} value={r} style={{ background: '#1e293b' }}>{r}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ gridColumn: 'span 1' }}>
                        {/* spacer */}
                      </div>
                      <div>
                        <label style={labelStyle}>AWS Access Key ID</label>
                        <input style={inputStyle} placeholder="AKIA…" value={formData.email_config.aws_access_key_id} onChange={e => setFormData({...formData, email_config: {...formData.email_config, aws_access_key_id: e.target.value}})} />
                      </div>
                      <div style={{ position: 'relative' }}>
                        <label style={labelStyle}>AWS Secret Access Key</label>
                        <input type={showPassword ? "text" : "password"} style={inputStyle} placeholder="••••••••" value={formData.email_config.aws_secret_access_key} onChange={e => setFormData({...formData, email_config: {...formData.email_config, aws_secret_access_key: e.target.value}})} />
                        <button onClick={() => setShowPassword(!showPassword)} style={eyeButtonStyle}>
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {/* SES info banner */}
                      <div style={{ gridColumn: 'span 2', padding: '14px 18px', borderRadius: '12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '13px', color: '#94a3b8', lineHeight: '1.7' }}>
                        <span style={{ color: '#a5b4fc', fontWeight: '700' }}>AWS SES setup checklist:</span><br />
                        1. Verify your sender email or domain in <strong style={{ color: '#cbd5e1' }}>AWS Console → SES → Verified identities</strong><br />
                        2. Create SMTP / IAM credentials with <strong style={{ color: '#cbd5e1' }}>ses:SendEmail</strong> permission<br />
                        3. Move out of SES Sandbox to send to non-verified addresses (request in AWS console)
                      </div>
                    </>)}
                  </div>
                </section>
              )}

              {activeTab === 'sms' && (
                <section>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <MessageSquare size={20} color="#6366f1" /> SMS Gateway (Twilio)
                    </h3>
                    <TestButton channel="sms" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={labelStyle}>Account SID</label>
                      <input style={inputStyle} value={formData.sms_config.sid} onChange={e => setFormData({...formData, sms_config: {...formData.sms_config, sid: e.target.value}})} />
                    </div>
                    <div style={{ position: 'relative' }}>
                      <label style={labelStyle}>Auth Token</label>
                      <input type={showPassword ? "text" : "password"} style={inputStyle} value={formData.sms_config.token} onChange={e => setFormData({...formData, sms_config: {...formData.sms_config, token: e.target.value}})} />
                      <button onClick={() => setShowPassword(!showPassword)} style={eyeButtonStyle}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <div>
                      <label style={labelStyle}>From Number</label>
                      <input style={inputStyle} placeholder="+1234567890" value={formData.sms_config.from} onChange={e => setFormData({...formData, sms_config: {...formData.sms_config, from: e.target.value}})} />
                    </div>
                  </div>
                </section>
              )}

              {activeTab === 'whatsapp' && (
                <section>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Globe size={20} color="#6366f1" /> WhatsApp Cloud API
                    </h3>
                    <TestButton channel="whatsapp" />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={labelStyle}>Phone Number ID</label>
                      <input style={inputStyle} value={formData.whatsapp_config.phone_id} onChange={e => setFormData({...formData, whatsapp_config: {...formData.whatsapp_config, phone_id: e.target.value}})} />
                    </div>
                    <div style={{ position: 'relative' }}>
                      <label style={labelStyle}>Permanent Access Token</label>
                      <textarea style={{...inputStyle, height: '80px'}} value={formData.whatsapp_config.token} onChange={e => setFormData({...formData, whatsapp_config: {...formData.whatsapp_config, token: e.target.value}})} />
                    </div>
                  </div>
                </section>
              )}

              {activeTab === 'push' && (
                <section>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Bell size={20} color="#6366f1" /> Push Notifications (FCM)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={labelStyle}>VAPID Public Key</label>
                      <input style={inputStyle} value={formData.push_config.vapid_public} onChange={e => setFormData({...formData, push_config: {...formData.push_config, vapid_public: e.target.value}})} />
                    </div>
                    <div>
                      <label style={labelStyle}>FCM Server Key (Legacy)</label>
                      <input type="password" style={inputStyle} value={formData.push_config.server_key} onChange={e => setFormData({...formData, push_config: {...formData.push_config, server_key: e.target.value}})} />
                    </div>
                  </div>
                </section>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Save Button Area */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', marginTop: '24px' }}>
            {success && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '600' }}>
                <CheckCircle size={18} /> Settings saved!
              </motion.div>
            )}
            <button
              onClick={handleSave}
              disabled={loading}
              className="vibrant-btn"
              style={{ padding: '12px 32px', borderRadius: '12px', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '10px', height: '48px' }}
            >
              <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

      </div>

      {/* Test Modal */}
      <AnimatePresence>
        {isTestModalOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', backdropFilter: 'blur(10px)'
          }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-effect"
              style={{ padding: '32px', width: '100%', maxWidth: '400px', borderRadius: '24px', background: 'rgba(30, 41, 59, 1)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>Test {testChannel?.toUpperCase()}</h3>
                <button onClick={() => setIsTestModalOpen(false)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>
                  {testChannel === 'email' ? 'Recipient Email' : 'Recipient Phone Number'}
                </label>
                <input 
                  style={inputStyle} 
                  value={testRecipient} 
                  onChange={e => setTestRecipient(e.target.value)} 
                  placeholder={testChannel === 'email' ? 'e.g. hello@example.com' : 'e.g. +123456789'}
                />
              </div>

              {testResult && (
                <div style={{ 
                  padding: '12px', 
                  borderRadius: '12px', 
                  background: testResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: testResult.success ? '#22c55e' : '#ef4444',
                  fontSize: '13px',
                  marginBottom: '24px',
                  display: 'flex',
                  gap: '8px'
                }}>
                  {testResult.success ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  {testResult.message}
                </div>
              )}

              <button 
                onClick={handleTest}
                disabled={testLoading || !testRecipient}
                className="vibrant-btn"
                style={{ width: '100%', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
              >
                {testLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                {testLoading ? 'Processing...' : 'Send Test Message'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const labelStyle = { display: 'block', color: '#94a3b8', fontSize: '13px', fontWeight: '500', marginBottom: '8px', marginLeft: '4px' };
const colorInputStyle = { width: '48px', height: '48px', border: '2px solid rgba(255,255,255,0.1)', borderRadius: '10px', background: 'transparent', cursor: 'pointer', padding: '4px' };
const eyeButtonStyle = { position: 'absolute', right: '12px', top: '34px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' };
const LayoutIcon = ({ color, size }) => <Type color={color} size={size} />; // Simple generic icon mapping

export default Settings;
