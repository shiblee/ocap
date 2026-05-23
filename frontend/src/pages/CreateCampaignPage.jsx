import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Send, Mail, MessageSquare, Globe, Smartphone,
  ChevronRight, ChevronLeft, AlertCircle, Code,
  Edit3, Upload, X, ArrowLeft, CheckCircle2, Zap, Calendar
} from 'lucide-react';
import api from '../utils/api';
import { useProject } from '../context/ProjectContext';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { EmailEditor } from 'react-email-editor';

/* ─── Quill Editor ─── */
const QuillEditor = ({ value, onChange }) => {
  const editorRef = React.useRef(null);
  const quillRef = React.useRef(null);
  // Always keep a fresh ref to onChange so the text-change listener
  // never captures a stale closure of the parent's formData.
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

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
            ['clean'],
          ],
        },
      });
      // Use ref so we always call the latest onChange
      quillRef.current.on('text-change', () => {
        onChangeRef.current(quillRef.current.root.innerHTML);
      });
      if (value) quillRef.current.clipboard.dangerouslyPasteHTML(value);
    }
    return () => {
      if (parentContainer) {
        parentContainer.querySelectorAll('.ql-toolbar').forEach(tb => tb.remove());
      }
      quillRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (quillRef.current && value !== quillRef.current.root.innerHTML) {
      const sel = quillRef.current.getSelection();
      quillRef.current.clipboard.dangerouslyPasteHTML(value || '');
      if (sel) quillRef.current.setSelection(sel);
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      style={{
        minHeight: '260px',
        background: '#fff',
        color: '#000',
        borderRadius: '0 0 12px 12px',
        overflow: 'auto',
      }}
    />
  );
};

/* ─── Step Indicator ─── */
const StepIndicator = ({ step }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
    {[
      { n: 1, label: 'Campaign Setup' },
      { n: 2, label: 'Message Content' },
    ].map(({ n, label }, i) => (
      <React.Fragment key={n}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '26px', height: '26px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', fontWeight: '700',
            background: step >= n ? '#6366f1' : 'rgba(255,255,255,0.06)',
            color: step >= n ? '#fff' : '#475569',
            border: step > n ? '2px solid #6366f1' : step === n ? '2px solid #818cf8' : '2px solid rgba(255,255,255,0.08)',
            boxShadow: step === n ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
            transition: 'all 0.3s ease',
            flexShrink: 0,
          }}>
            {step > n ? <CheckCircle2 size={13} /> : n}
          </div>
          <span style={{
            fontSize: '12px', fontWeight: step === n ? '700' : '500',
            color: step === n ? '#c7d2fe' : step > n ? '#6366f1' : '#475569',
            whiteSpace: 'nowrap',
          }}>
            {label}
          </span>
        </div>
        {i === 0 && (
          <div style={{
            flex: 1, height: '2px', borderRadius: '2px', maxWidth: '60px',
            background: step > 1
              ? 'linear-gradient(90deg,#6366f1,#a855f7)'
              : 'rgba(255,255,255,0.07)',
            transition: 'background 0.4s ease',
          }} />
        )}
      </React.Fragment>
    ))}
  </div>
);

/* ─── Main Page ─── */
const CreateCampaignPage = () => {
  const navigate = useNavigate();
  const { id: campaignId } = useParams(); // edit mode if id present
  const { activeProject } = useProject();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetchingCampaign, setFetchingCampaign] = useState(!!campaignId);
  const [error, setError] = useState('');
  const [editorMode, setEditorMode] = useState('visual');
  const [launchMode, setLaunchMode] = useState('draft');
  const [showPreview, setShowPreview] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [savedCampaign, setSavedCampaign] = useState(null);
  const [previewMode, setPreviewMode] = useState('desktop'); // 'desktop' or 'mobile'
  const [previousCampaigns, setPreviousCampaigns] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    channel: 'email',
    subject: '',
    content: '',
    scheduled_at: '',
    social_platforms: [],
    is_recurring: false,
    recurrence_interval: 'daily',
    design: null,
  });

  const emailEditorRef = React.useRef(null);
  const [editorReady, setEditorReady] = useState(false);

  const onLoad = () => {
    setEditorReady(true);
  };

  useEffect(() => {
    if (editorReady && formData.design && emailEditorRef.current?.editor) {
      emailEditorRef.current.editor.loadDesign(formData.design);
    }
  }, [editorReady, formData.design]);

  /* Fetch campaign for edit */
  useEffect(() => {
    if (!campaignId) return;
    (async () => {
      try {
        const res = await api.get(`/campaigns/${campaignId}`);
        const camp = res.data;
        setSavedCampaign(camp);
        setFormData({
          name: camp.name || '',
          channel: camp.channel || 'email',
          subject: camp.subject || '',
          content: camp.content || '',
          scheduled_at: camp.scheduled_at
            ? new Date(camp.scheduled_at).toISOString().slice(0, 16)
            : '',
          social_platforms: camp.social_platforms || [],
          is_recurring: camp.is_recurring === 1,
          recurrence_interval: camp.recurrence_interval || 'daily',
          design: camp.design || null,
        });
        setLaunchMode(camp.status === 'scheduled' ? 'schedule' : 'draft');
        setStep(2); // edit opens directly on step 2
      } catch {
        setError('Failed to load campaign.');
      } finally {
        setFetchingCampaign(false);
      }
    })();
  }, [campaignId]);

  /* Fetch previous email campaigns for template copying */
  useEffect(() => {
    if (!activeProject || campaignId) return; // Only need this when creating new campaign
    api.get('/campaigns/?limit=50')
      .then(res => {
        const emails = res.data.filter(c => c.channel === 'email' && c.design);
        setPreviousCampaigns(emails);
      })
      .catch(err => console.error("Failed to load previous campaigns:", err));
  }, [activeProject, campaignId]);

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

  const channels = [
    { id: 'email',       label: 'Email',             icon: <Mail size={20} />,        color: '#6366f1', desc: 'Send rich emails to your audience' },
    { id: 'sms',         label: 'SMS',               icon: <MessageSquare size={20} />, color: '#10b981', desc: 'Direct text messages' },
    { id: 'whatsapp',    label: 'WhatsApp',          icon: <Smartphone size={20} />,  color: '#25d366', desc: 'Official WhatsApp Business API' },
    { id: 'web_push',    label: 'Web Push',          icon: <Globe size={20} />,       color: '#f59e0b', desc: 'Browser notifications' },
    { id: 'social_post', label: 'Social Media Post', icon: <Globe size={20} />,       color: '#f472b6', desc: 'Auto-generate and post to social media' },
  ];

  const handleHtmlImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData(p => ({ ...p, content: ev.target.result }));
      setEditorMode('html');
    };
    reader.readAsText(file);
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step < 2) { setStep(2); return; }

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

        let id;
        if (campaignId) {
          const res = await api.put(`/campaigns/${campaignId}`, payload);
          id = res.data.id;
        } else {
          const res = await api.post('/campaigns/', payload);
          id = res.data.id;
        }

        if (launchMode === 'now') {
          await api.post(`/campaigns/${id}/start`);
        } else if (launchMode === 'schedule' && formData.scheduled_at) {
          await api.post(`/campaigns/${id}/schedule`, {
            scheduled_at: new Date(formData.scheduled_at).toISOString(),
          });
        }

        navigate('/campaigns');
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to save campaign.');
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
    if (!testEmail) return alert('Please enter an email address for testing.');
    if (!campaignId) return alert('Please save the campaign as a draft first before testing.');
    setTestingEmail(true);
    try {
      await api.post(`/campaigns/${campaignId}/test`, { email: testEmail });
      alert('Test email sent successfully!');
      setTestEmail('');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to send test email.');
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
    padding: '9px 14px',
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#fff',
    outline: 'none',
    fontSize: '13px',
    transition: 'all 0.2s ease',
  };

  if (fetchingCampaign) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="cc-page">
      {/* ── Page Header ── */}
      <div className="cc-header">
        <button
          onClick={() => navigate('/campaigns')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            color: '#94a3b8', cursor: 'pointer', fontSize: '14px',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94a3b8'; }}
        >
          <ArrowLeft size={16} /> Back to Campaigns
        </button>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', lineHeight: 1.2 }}>
            {campaignId ? 'Edit Campaign' : 'New Campaign'}
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '2px' }}>
            {campaignId ? `Editing "${formData.name}"` : 'Create a new outreach campaign for your audience'}
          </p>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="cc-grid">

        {/* ── LEFT: Form card ── */}
        <div className="glass-effect" style={{ borderRadius: '16px', overflow: 'hidden', background: 'rgba(30,41,59,0.95)' }}>
          {/* Card header with step indicator */}
          <div style={{ padding: '16px 20px 0' }}>
            <StepIndicator step={step} />
          </div>

          <form onSubmit={handleSubmit} style={{ padding: '0 20px 20px' }}>
            {/* ── STEP 1 ── */}
            {step === 1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    style={inputStyle}
                    placeholder="Ex: Welcome Series — April"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Select Channel
                  </label>
                  <div className="cc-channel-grid">
                    {channels.map(ch => (
                      <div
                        key={ch.id}
                        onClick={() => setFormData(prev => ({ ...prev, channel: ch.id }))}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: '2px solid',
                          borderColor: formData.channel === ch.id ? ch.color : 'rgba(255,255,255,0.06)',
                          background: formData.channel === ch.id ? `${ch.color}15` : 'rgba(15,23,42,0.4)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          transition: 'all 0.2s ease',
                          boxShadow: formData.channel === ch.id ? `0 0 0 3px ${ch.color}20` : 'none',
                        }}
                      >
                        <div style={{
                          background: formData.channel === ch.id ? ch.color : 'rgba(255,255,255,0.06)',
                          padding: '7px', borderRadius: '10px',
                          color: formData.channel === ch.id ? 'white' : '#475569',
                          flexShrink: 0,
                        }}>
                          {ch.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: '#fff', fontWeight: '700', fontSize: '13px' }}>{ch.label}</div>
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch.desc}</div>
                        </div>
                        {formData.channel === ch.id && <ChevronRight size={14} color={ch.color} style={{ flexShrink: 0 }} />}
                      </div>
                    ))}
                  </div>
                </div>

                {formData.channel === 'social_post' && (
                  <div>
                    <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600', display: 'block', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Select Platforms
                    </label>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {['facebook', 'instagram', 'twitter', 'linkedin'].map(p => (
                        <label key={p} style={{
                          display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                          color: '#fff', fontSize: '14px',
                          background: formData.social_platforms.includes(p) ? 'rgba(244,114,182,0.1)' : 'rgba(255,255,255,0.05)',
                          padding: '10px 18px', borderRadius: '12px',
                          border: '1px solid',
                          borderColor: formData.social_platforms.includes(p) ? '#f472b6' : 'transparent',
                          transition: 'all 0.2s ease',
                        }}>
                          <input
                            type="checkbox"
                            checked={formData.social_platforms.includes(p)}
                            onChange={e => {
                              const platforms = e.target.checked
                                ? [...formData.social_platforms, p]
                                : formData.social_platforms.filter(x => x !== p);
                              setFormData(prev => ({ ...prev, social_platforms: platforms }));
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
              /* ── STEP 2 ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {formData.channel === 'email' && (
                  <>
                    <div>
                      <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Email Subject
                      </label>
                      <input
                        type="text"
                        style={inputStyle}
                        placeholder="Enter email subject line"
                        value={formData.subject}
                        onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                        required
                      />
                    </div>
                    
                    {!campaignId && previousCampaigns.length > 0 && (
                      <div style={{ marginTop: '4px' }}>
                        <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                  </>
                )}

                {/* Editor section */}
                <div>
                  {/* Label + controls row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                    <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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

                  {/* Editor body */}
                  {formData.channel === 'email' ? (
                      <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', minHeight: '600px' }}>
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
                      rows={8}
                      style={{ ...inputStyle, resize: 'vertical' }}
                      placeholder="Write your message here..."
                      value={formData.content}
                      onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
                      required
                    />
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                    <p style={{ fontSize: '11px', color: '#475569' }}>
                      💡 Use a clear call to action for better engagement.
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
                              platform: formData.social_platforms[0] || 'social media',
                            });
                            setFormData(prev => ({ ...prev, content: res.data.content }));
                          } catch (err) {
                            alert(err.response?.data?.detail || 'AI Generation failed.');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        style={{ padding: '8px 16px', borderRadius: '10px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc', fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        ✨ Generate with Gemini
                      </button>
                    )}
                  </div>

                   {/* Preview + Test email */}
                  {formData.channel === 'email' && (
                    <div className="cc-preview-test-row">
                      <button
                        type="button"
                        onClick={handlePreviewClick}
                        style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.5)', background: 'rgba(99,102,241,0.08)', color: '#a5b4fc', cursor: 'pointer', fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap' }}
                      >
                        Preview Template
                      </button>
                      {campaignId && (
                        <div style={{ display: 'flex', gap: '8px', flex: 1, minWidth: 0, width: '100%' }}>
                          <input
                            type="email"
                            placeholder="test@example.com"
                            style={{ ...inputStyle, flex: 1, padding: '8px 10px', minWidth: 0 }}
                            value={testEmail}
                            onChange={e => setTestEmail(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={handleTestEmail}
                            disabled={testingEmail}
                            style={{ padding: '8px 14px', borderRadius: '10px', border: 'none', background: '#10b981', color: '#fff', cursor: testingEmail ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '13px', whiteSpace: 'nowrap', flexShrink: 0 }}
                          >
                            {testingEmail ? 'Sending…' : 'Send Test'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Launch Settings */}
                <div style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <label style={{ fontSize: '12px', color: '#fff', fontWeight: '700', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Launch Settings
                  </label>
                  <div className="cc-launch-row">
                    {[
                      { mode: 'draft',    label: 'Save as Draft',       icon: <Edit3 size={16} />,       color: '#64748b' },
                      { mode: 'now',      label: 'Launch Immediately',  icon: <Zap size={16} />,          color: '#10b981' },
                      { mode: 'schedule', label: 'Schedule for Later',  icon: <Calendar size={16} />,     color: '#f59e0b' },
                    ].map(({ mode, label, icon, color }) => (
                      <label key={mode} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        cursor: 'pointer', padding: '9px 12px', borderRadius: '10px',
                        border: '1px solid',
                        borderColor: launchMode === mode ? color : 'rgba(255,255,255,0.06)',
                        background: launchMode === mode ? `${color}15` : 'rgba(15,23,42,0.3)',
                        color: launchMode === mode ? color : '#64748b',
                        fontWeight: '600', fontSize: '12px',
                        transition: 'all 0.2s ease', flex: '1', minWidth: '120px',
                      }}>
                        <input type="radio" name="launchMode" value={mode} checked={launchMode === mode} onChange={() => setLaunchMode(mode)} style={{ display: 'none' }} />
                        <div style={{ color: launchMode === mode ? color : '#475569' }}>{icon}</div>
                        {label}
                      </label>
                    ))}
                  </div>

                  {/* Recurring */}
                  <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(99,102,241,0.05)', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.1)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: '#fff', fontWeight: '600', fontSize: '13px' }}>
                      <input type="checkbox" checked={formData.is_recurring} onChange={e => setFormData(prev => ({ ...prev, is_recurring: e.target.checked }))} style={{ width: '16px', height: '16px', accentColor: '#6366f1' }} />
                      🔁 Recurring Campaign
                    </label>
                    {formData.is_recurring && (
                      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>Repeat every:</span>
                        <select
                          style={{ ...inputStyle, width: 'auto', padding: '6px 12px', fontSize: '13px' }}
                          value={formData.recurrence_interval}
                          onChange={e => setFormData(prev => ({ ...prev, recurrence_interval: e.target.value }))}
                        >
                          <option value="daily" style={{ background: '#1e293b' }}>Day</option>
                          <option value="weekly" style={{ background: '#1e293b' }}>Week</option>
                          <option value="monthly" style={{ background: '#1e293b' }}>Month</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Schedule datetime */}
                  {launchMode === 'schedule' && (
                    <div style={{ marginTop: '14px' }}>
                      <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Select Date &amp; Time</label>
                      <input
                        type="datetime-local"
                        style={{ ...inputStyle, width: 'auto', padding: '6px 12px', fontSize: '13px' }}
                        value={formData.scheduled_at}
                        onChange={e => setFormData(prev => ({ ...prev, scheduled_at: e.target.value }))}
                        required={launchMode === 'schedule'}
                        min={new Date().toISOString().slice(0, 16)}
                        className="cc-datetime-input"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ marginTop: '20px', padding: '12px 16px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '13px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {/* Action buttons */}
            <div className="cc-action-row">
              {step === 2 ? (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="glass-effect nav-hover"
                  style={{ flex: 1, padding: '11px', borderRadius: '12px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                >
                  <ChevronLeft size={18} /> Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/campaigns')}
                  className="glass-effect nav-hover"
                  style={{ flex: 1, padding: '11px', borderRadius: '12px', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 2, padding: '11px', borderRadius: '12px', fontWeight: '700',
                  border: 'none', color: 'white', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '8px',
                  background: loading ? '#374151' : '#4f46e5',
                  boxShadow: loading ? 'none' : '0 8px 16px rgba(79,70,229,0.35)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease', fontSize: '14px',
                }}
                onMouseOver={e => { if (!loading) { e.currentTarget.style.background = '#4338ca'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                onMouseOut={e => { if (!loading) { e.currentTarget.style.background = '#4f46e5'; e.currentTarget.style.transform = 'translateY(0)'; } }}
              >
                {loading ? 'Processing…' : step === 1 ? 'Next: Message Content' : launchMode === 'draft' ? 'Save Campaign' : launchMode === 'schedule' ? 'Schedule Campaign' : 'Launch Campaign'}
                {step === 1 && !loading && <ChevronRight size={18} />}
                {step === 2 && !loading && <Send size={18} />}
              </button>
            </div>
          </form>
        </div>

        {/* ── RIGHT: Info sidebar ── */}
        <div className="cc-sidebar">
          {/* Campaign Summary card */}
          <div className="cc-sidebar-summary glass-effect" style={{ borderRadius: '14px', padding: '16px', background: 'rgba(30,41,59,0.9)' }}>
            <p style={{ fontSize: '10px', color: '#475569', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Campaign Summary</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Name',    value: formData.name    || '—' },
                { label: 'Channel', value: (channels.find(c => c.id === formData.channel)?.label) || '—' },
                { label: 'Subject', value: formData.subject || '—' },
                { label: 'Project', value: activeProject?.name || 'None selected' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: '10px', color: '#475569', marginBottom: '2px' }}>{label}</div>
                  <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '600', wordBreak: 'break-word' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips card */}
          <div className="glass-effect" style={{ borderRadius: '14px', padding: '16px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <p style={{ fontSize: '10px', color: '#818cf8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>💡 Pro Tips</p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '14px' }}>
              {[
                'Keep subject lines under 50 characters for best open rates.',
                'Personalize content using {{first_name}} variables.',
                'Send on Tuesday–Thursday for highest engagement.',
                'Always test before launching to your full list.',
              ].map((tip, i) => (
                <li key={i} style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.5' }}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Preview Modal ── */}
      {showPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ width: '100%', maxWidth: '820px', background: '#fff', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h3 style={{ color: '#0f172a', margin: 0, fontWeight: '700' }}>Template Preview</h3>
              <button onClick={() => setShowPreview(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}>
                <X size={22} />
              </button>
            </div>
            <iframe
              title="Template Preview"
              srcDoc={formData.content || '<p style="text-align:center;color:#94a3b8;font-family:sans-serif;margin-top:20px;">No content to preview</p>'}
              style={{ width: '100%', height: '100%', border: 'none', flex: 1, background: '#fff', minHeight: '500px' }}
            />
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default CreateCampaignPage;
