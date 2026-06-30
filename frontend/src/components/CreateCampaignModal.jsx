import React, { useState } from 'react';
import { X, Send, Mail, MessageSquare, Globe, Smartphone, ChevronRight, ChevronLeft, Save, AlertCircle, Code, Edit3, Upload, Zap } from 'lucide-react';
import api from '../utils/api';
import { useProject } from '../context/ProjectContext';
import { formatForDateTimeInput, parseFromDateTimeInput } from '../utils/dateFormatter';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { EmailEditor } from 'react-email-editor';

const QuillEditor = ({ value, onChange }) => {
  const editorRef = React.useRef(null);
  const quillRef = React.useRef(null);

  React.useEffect(() => {
    const parentContainer = editorRef.current?.parentElement;
    
    if (editorRef.current && !quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: [
            [{ font: [] }, { size: [] }],
            [{ header: [1, 2, 3, 4, 5, 6, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ color: [] }, { background: [] }],
            [{ script: 'sub' }, { script: 'super' }],
            [{ header: 1 }, { header: 2 }, 'blockquote', 'code-block'],
            [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
            [{ direction: 'rtl' }, { align: [] }],
            ['link', 'image', 'video', 'formula'],
            ['clean']
          ]
        }
      });

      quillRef.current.on('text-change', () => {
        onChange(quillRef.current.root.innerHTML);
      });
      
      if (value) {
        quillRef.current.clipboard.dangerouslyPasteHTML(value);
      }
    }

    return () => {
      if (parentContainer) {
        const toolbars = parentContainer.querySelectorAll('.ql-toolbar');
        toolbars.forEach(tb => tb.remove());
      }
      quillRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (quillRef.current && value !== quillRef.current.root.innerHTML) {
      const currentSelection = quillRef.current.getSelection();
      quillRef.current.clipboard.dangerouslyPasteHTML(value || '');
      if (currentSelection) {
        quillRef.current.setSelection(currentSelection);
      }
    }
  }, [value]);

  return <div ref={editorRef} style={{ minHeight: '350px', background: '#fff', color: '#000', borderRadius: '0 0 10px 10px', overflow: 'auto', maxWidth: '100%' }} />;
};

const CreateCampaignModal = ({ isOpen, onClose, onSuccess, campaign }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { activeProject } = useProject();
  const [editorMode, setEditorMode] = useState('visual'); // 'visual' or 'html'
  
  const [formData, setFormData] = useState({
    name: '',
    channel: 'email',
    subject: '',
    content: '',
    scheduled_at: '',
    social_platforms: [],
    is_recurring: false,
    recurrence_interval: 'daily'
  });

  const handleHtmlImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({ ...prev, content: event.target.result }));
      setEditorMode('html'); // switch to HTML view to show raw code
    };
    reader.readAsText(file);
  };

  const [launchMode, setLaunchMode] = useState('draft'); // 'draft', 'now', 'schedule'
  const [showPreview, setShowPreview] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop'); // 'desktop' or 'mobile'
  const [previousCampaigns, setPreviousCampaigns] = useState([]);

  const handleEditorModeSwitch = (mode) => {
    if (mode === 'visual' && editorMode === 'html') {
      const isComplex = /<html|<body|<table|<style/i.test(formData.content);
      if (isComplex) {
        const confirmSwitch = window.confirm("Your template contains advanced HTML structures (like tables or style tags). Switching to Visual mode will strip these styles and break the layout. Do you want to continue?");
        if (!confirmSwitch) return;
      }
    }
    setEditorMode(mode);
  };

  React.useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        channel: campaign.channel || 'email',
        subject: campaign.subject || '',
        content: campaign.content || '',
        scheduled_at: formatForDateTimeInput(campaign.scheduled_at),
        social_platforms: campaign.social_platforms || [],
        is_recurring: campaign.is_recurring === 1,
        recurrence_interval: campaign.recurrence_interval || 'daily',
        design: campaign.design || null
      });
      if (campaign.status === 'scheduled') {
        setLaunchMode('schedule');
      } else {
        setLaunchMode('draft');
      }
    } else {
      setFormData({ 
        name: '', 
        channel: 'email', 
        subject: '', 
        content: '', 
        scheduled_at: '',
        social_platforms: [],
        is_recurring: false,
        recurrence_interval: 'daily',
        design: null
      });
      setLaunchMode('draft');
    }
  }, [campaign, isOpen]);

  /* Fetch previous email campaigns for template copying */
  React.useEffect(() => {
    if (!isOpen || !activeProject || campaign) return; // Only need this when modal is open for new campaign
    api.get('/campaigns/?limit=50')
      .then(res => {
        const emails = res.data.filter(c => c.channel === 'email' && c.design);
        setPreviousCampaigns(emails);
      })
      .catch(err => console.error("Failed to load previous campaigns:", err));
  }, [activeProject, campaign, isOpen]);

  const handleCopyTemplate = async (e) => {
    const id = e.target.value;
    if (!id) return;
    
    if (window.confirm("This will overwrite your current design. Do you want to continue?")) {
      try {
        const res = await api.get(`/campaigns/${id}`);
        const camp = res.data;
        if (camp.design && emailEditorRef.current?.editor) {
          emailEditorRef.current.editor.loadDesign(camp.design);
          setFormData(prev => ({ ...prev, content: camp.content, design: camp.design }));
        }
      } catch (err) {
        alert("Failed to copy template.");
      }
    }
    e.target.value = ''; // Reset dropdown
  };

  const emailEditorRef = React.useRef(null);
  const [editorReady, setEditorReady] = useState(false);

  const onLoad = () => {
    setEditorReady(true);
  };

  React.useEffect(() => {
    if (editorReady && formData.design && emailEditorRef.current?.editor) {
      emailEditorRef.current.editor.loadDesign(formData.design);
    }
  }, [editorReady, formData.design]);

  if (!isOpen) return null;

  const channels = [
    { id: 'email', label: 'Email', icon: <Mail size={20} />, color: '#6366f1', desc: 'Send rich emails to your audience' },
    { id: 'sms', label: 'SMS', icon: <MessageSquare size={20} />, color: '#10b981', desc: 'Direct text messages' },
    { id: 'whatsapp', label: 'WhatsApp', icon: <Smartphone size={20} />, color: '#25d366', desc: 'Official WhatsApp Business API' },
    { id: 'web_push', label: 'Web Push', icon: <Globe size={20} />, color: '#f59e0b', desc: 'Browser notifications' },
    { id: 'social_post', label: 'Social Media Post', icon: <Globe size={20} />, color: '#f472b6', desc: 'Auto-generate and post to Facebook, Twitter, etc.' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 2) {
      setStep(2);
      return;
    }

    const saveToBackend = async (payloadOverride = {}) => {
      setLoading(true);
      setError('');

      try {
        const payload = { 
          name: formData.name, 
          channel: formData.channel, 
          subject: formData.subject, 
          content: formData.content,
          design: formData.design,
          project_id: activeProject.id,
          social_platforms: formData.social_platforms,
          is_recurring: formData.is_recurring ? 1 : 0,
          recurrence_interval: formData.recurrence_interval,
          ...payloadOverride
        };
        
        let savedCampaignId;
        if (campaign) {
          const res = await api.put(`/campaigns/${campaign.id}`, payload);
          savedCampaignId = res.data.id;
        } else {
          const res = await api.post('/campaigns/', payload);
          savedCampaignId = res.data.id;
        }

        if (launchMode === 'now') {
          await api.post(`/campaigns/${savedCampaignId}/start`);
        } else if (launchMode === 'schedule' && formData.scheduled_at) {
          await api.post(`/campaigns/${savedCampaignId}/schedule`, {
            scheduled_at: parseFromDateTimeInput(formData.scheduled_at)
          });
        }

        onSuccess();
        setStep(1);
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to save campaign.");
      } finally {
        setLoading(false);
      }
    };

    if (formData.channel === 'email' && emailEditorRef.current && emailEditorRef.current.editor) {
      emailEditorRef.current.editor.exportHtml((data) => {
        const { design, html } = data;
        saveToBackend({ content: html, design: design });
      });
    } else {
      saveToBackend();
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) return alert("Please enter an email address for testing.");
    if (!campaign) return alert("Please save the campaign as a draft first before testing.");
    
    setTestingEmail(true);
    try {
      await api.post(`/campaigns/${campaign.id}/test`, { email: testEmail });
      alert("Test email sent successfully!");
      setTestEmail('');
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to send test email.");
    } finally {
      setTestingEmail(false);
    }
  };

  const handlePreviewClick = () => {
    if (formData.channel === 'email' && emailEditorRef.current && emailEditorRef.current.editor) {
      emailEditorRef.current.editor.exportHtml((data) => {
        const { design, html } = data;
        setFormData(prev => ({ ...prev, content: html, design }));
        setShowPreview(true);
      });
    } else {
      setShowPreview(true);
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
    <div className="cm-overlay">
      <div className="glass-effect cm-box">
        <div className="cm-header">
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

        <form onSubmit={handleSubmit} className="cm-form">
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
              
              {formData.channel === 'social_post' && (
                <div style={{ marginTop: '8px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500', display: 'block', marginBottom: '12px' }}>Select Platforms</label>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {['facebook', 'instagram', 'twitter', 'linkedin'].map(p => (
                      <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff', fontSize: '14px', background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '12px', border: '1px solid', borderColor: formData.social_platforms.includes(p) ? '#f472b6' : 'transparent' }}>
                        <input 
                          type="checkbox" 
                          checked={formData.social_platforms.includes(p)}
                          onChange={(e) => {
                            const platforms = e.target.checked 
                              ? [...formData.social_platforms, p] 
                              : formData.social_platforms.filter(x => x !== p);
                            setFormData({...formData, social_platforms: platforms});
                          }}
                          style={{ display: 'none' }}
                        />
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
              )}
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
              
              {!campaign && formData.channel === 'email' && previousCampaigns.length > 0 && (
                <div>
                  <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                    Copy From Previous Template
                  </label>
                  <select
                    style={{ ...inputStyle, color: '#e2e8f0' }}
                    onChange={handleCopyTemplate}
                    defaultValue=""
                  >
                    <option value="" disabled>-- Select a previous campaign --</option>
                    {previousCampaigns.map(camp => (
                      <option key={camp.id} value={camp.id} style={{ background: '#1e293b' }}>
                        {camp.name} {camp.subject ? `(${camp.subject})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
                    {formData.channel === 'email' ? 'Email Body Template' : 'Message Text'}
                  </label>
                  
                  {formData.channel === 'email' && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span>Available Variables:</span>
                      <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', color: '#38bdf8', fontFamily: 'monospace', cursor: 'pointer' }} title="Copy to use in HTML blocks">{`{{user_name}}`}</span>
                      <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', color: '#38bdf8', fontFamily: 'monospace', cursor: 'pointer' }} title="Copy to use in HTML blocks">{`{{email}}`}</span>
                    </div>
                  )}
                </div>
                
                {formData.channel === 'email' ? (
                    <div style={{ background: '#fff', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)', maxWidth: '100%', minHeight: '600px' }}>
                      <EmailEditor
                        ref={emailEditorRef}
                        onLoad={onLoad}
                        minHeight="600px"
                        options={{
                          displayMode: 'email',
                          mergeTags: {
                            user_name: {
                              name: "User Name",
                              value: "{{user_name}}"
                            },
                            email: {
                              name: "Email Address",
                              value: "{{email}}"
                            }
                          }
                        }}
                      />
                    </div>
                ) : (
                  <textarea 
                    rows={6}
                    style={{...inputStyle, resize: 'none'}}
                    placeholder="Write your message here..."
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    required
                  />
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                   <p style={{ fontSize: '11px', color: '#475569' }}>
                    Tips: Use a clear call to action for better engagement.
                  </p>
                  {formData.channel === 'social_post' && (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!activeProject) return;
                        setLoading(true);
                        try {
                          const res = await api.post('/ai/generate-post', { 
                            project_id: activeProject.id,
                            platform: formData.channel === 'social_post' ? (formData.social_platforms[0] || 'social media') : 'email'
                          });
                          setFormData({...formData, content: res.data.content});
                        } catch (err) {
                          alert(err.response?.data?.detail || "AI Generation failed. Check Gemini API key in Settings.");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      style={{ 
                        padding: '8px 16px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', 
                        border: '1px solid rgba(99, 102, 241, 0.3)', color: '#a5b4fc', 
                        fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                    >
                      ✨ Generate with Gemini
                    </button>
                  )}
                </div>
                
                {formData.channel === 'email' && (
                  <div style={{ marginTop: '20px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={handlePreviewClick}
                      style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #4f46e5', background: 'transparent', color: '#4f46e5', cursor: 'pointer', fontWeight: '600' }}
                    >
                      Preview Template
                    </button>
                    
                    {campaign && (
                      <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                        <input 
                          type="email" 
                          placeholder="test@example.com" 
                          style={{...inputStyle, flex: 1, padding: '8px 12px'}} 
                          value={testEmail}
                          onChange={e => setTestEmail(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={handleTestEmail}
                          disabled={testingEmail}
                          style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', cursor: testingEmail ? 'not-allowed' : 'pointer', fontWeight: '600' }}
                        >
                          {testingEmail ? 'Sending...' : 'Send Test'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <label style={{ fontSize: '14px', color: '#fff', fontWeight: '600' }}>Launch Settings</label>
              <div style={{ display: 'flex', gap: '16px' }}>
                {['draft', 'now', 'schedule'].map((mode) => (
                  <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#94a3b8', fontSize: '14px' }}>
                    <input 
                      type="radio" 
                      name="launchMode" 
                      value={mode} 
                      checked={launchMode === mode} 
                      onChange={() => setLaunchMode(mode)} 
                      style={{ accentColor: '#4f46e5' }}
                    />
                    {mode === 'draft' ? 'Save as Draft' : mode === 'now' ? 'Launch Immediately' : 'Schedule for Later'}
                  </label>
                ))}
              </div>

              {/* Recurring Settings */}
              <div style={{ marginTop: '8px', padding: '12px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#fff', fontWeight: '600', fontSize: '13px' }}>
                  <input 
                    type="checkbox" 
                    checked={formData.is_recurring}
                    onChange={(e) => setFormData({...formData, is_recurring: e.target.checked})}
                    style={{ width: '16px', height: '16px', accentColor: '#6366f1' }}
                  />
                  🔁 Recurring Campaign
                </label>
                
                {formData.is_recurring && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Repeat:</span>
                    <select 
                      style={{ ...inputStyle, width: 'max-content', padding: '4px 8px', fontSize: '12px' }}
                      value={formData.recurrence_interval}
                      onChange={(e) => setFormData({...formData, recurrence_interval: e.target.value})}
                    >
                      <option value="daily" style={{ background: '#1e293b' }}>Every Day</option>
                      <option value="weekly" style={{ background: '#1e293b' }}>Every Week</option>
                      <option value="monthly" style={{ background: '#1e293b' }}>Every Month</option>
                    </select>
                  </div>
                )}
              </div>
              
              {launchMode === 'schedule' && (
                <div style={{ marginTop: '8px' }}>
                  <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Select Date & Time</label>
                  <input 
                    type="datetime-local" 
                    style={{...inputStyle, width: 'max-content'}}
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({...formData, scheduled_at: e.target.value})}
                    required={launchMode === 'schedule'}
                    min={formatForDateTimeInput(new Date().toISOString())}
                  />
                </div>
              )}
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
              {loading ? 'Processing...' : (step === 1 ? 'Next Step' : launchMode === 'draft' ? 'Save Campaign' : launchMode === 'schedule' ? 'Schedule Campaign' : 'Launch Campaign')}
              {step === 1 && !loading && <ChevronRight size={18} />}
              {step === 2 && !loading && <Send size={18} />}
            </button>
          </div>
        </form>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.9)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px'
        }}>
          <div style={{ width: '100%', maxWidth: '800px', background: '#fff', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ color: '#0f172a', margin: 0 }}>Template Preview</h3>
              <button onClick={() => setShowPreview(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
            </div>
            <iframe
              title="Template Preview"
              srcDoc={formData.content || '<p style="text-align:center;color:#94a3b8;font-family:sans-serif;margin-top:20px;">No content to preview</p>'}
              style={{ width: '100%', height: '100%', border: 'none', flex: 1, background: '#fff', minHeight: '500px' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateCampaignModal;
