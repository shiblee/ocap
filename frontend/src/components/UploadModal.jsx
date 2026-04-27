import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import api from '../utils/api';
import { useProject } from '../context/ProjectContext';

const UploadModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [step, setStep] = useState(1); // 1: Select File, 2: Map Fields, 3: Uploading
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { activeProject } = useProject();

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Read headers
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const firstLine = text.split('\n')[0];
        const cols = firstLine.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        setHeaders(cols);
        setStep(2);
      };
      reader.readAsText(selectedFile);
    }
  };

  const fields = [
    { key: 'user_name', label: 'User Name (Optional)' },
    { key: 'email', label: 'Email Address' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'web_token', label: 'Web Push Token' },
    { key: 'ios_token', label: 'iOS Push Token' },
    { key: 'android_token', label: 'Android Push Token' },
  ];

  const handleUpload = async () => {
    if (!mapping.email && !mapping.phone) {
      setError("Please map at least Email or Phone column.");
      return;
    }

    setLoading(true);
    setError('');
    setStep(3);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    formData.append('project_id', activeProject.id);

    try {
      const res = await api.post('/contacts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed. Please check your CSV format.");
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backdropFilter: 'blur(8px)'
    }}>
      <div className="glass-effect" style={{
        width: '100%',
        maxWidth: '600px',
        borderRadius: '24px',
        border: '1px solid var(--border-glass)',
        overflow: 'hidden',
        animation: 'slideUp 0.3s ease-out'
      }}>
        {/* Header */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>Import Contacts</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '32px' }}>
          {step === 1 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                background: 'rgba(99, 102, 241, 0.1)', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <Upload size={32} color="#6366f1" />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Upload CSV File</h3>
              <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px' }}>Select a .csv file containing your contact data.</p>
              
              <label className="vibrant-gradient" style={{ 
                display: 'inline-block', 
                padding: '12px 32px', 
                borderRadius: '12px', 
                cursor: 'pointer',
                fontWeight: '600',
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
              }}>
                Choose File
                <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
              </label>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: '#22c55e', fontSize: '14px' }}>
                <CheckCircle2 size={16} />
                <span>File loaded: {file?.name}</span>
              </div>
              
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Map CSV Columns</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
                {fields.map(field => (
                  <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '13px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>{field.label}</label>
                      <select 
                        value={mapping[field.key] || ''}
                        onChange={(e) => setMapping({...mapping, [field.key]: e.target.value})}
                        style={{ 
                          width: '100%', 
                          padding: '8px 12px', 
                          background: 'rgba(15, 23, 42, 0.5)', 
                          border: '1px solid var(--border-glass)', 
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      >
                        <option value="">-- Don't Map --</option>
                        {headers.map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '13px', display: 'flex', gap: '8px' }}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                <button 
                  onClick={() => setStep(1)}
                  className="glass-effect" 
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', color: 'white', border: '1px solid var(--border-glass)' }}
                >
                  Back
                </button>
                <button 
                  onClick={handleUpload}
                  disabled={loading}
                  className="vibrant-gradient"
                  style={{ flex: 2, padding: '12px', borderRadius: '12px', fontWeight: '600', border: 'none' }}
                >
                  Start Import
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div className="animate-spin" style={{ width: '48px', height: '48px', border: '4px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 24px' }}></div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>Processing Audience Data</h3>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>Please wait while we sync your contacts. This may take a moment for large files.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
