import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Upload,
  ChevronLeft,
  ChevronRight,
  Database,
  Edit2,
  Trash2,
  Lock,
  CheckCircle2,
  History
} from 'lucide-react';
import api from '../utils/api';
import UploadModal from '../components/UploadModal';
import AddContactModal from '../components/AddContactModal';
import EditContactModal from '../components/EditContactModal';
import ImportHistoryModal from '../components/ImportHistoryModal';
import ContactCampaignHistoryModal from '../components/ContactCampaignHistoryModal';
import { useProject } from '../context/ProjectContext';
import { Briefcase } from 'lucide-react';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [totalContacts, setTotalContacts] = useState(0);
  const [stats, setStats] = useState({ activeWeb: 0, activeIos: 0, activeAndroid: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedHistoryContact, setSelectedHistoryContact] = useState(null);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isCampaignHistoryModalOpen, setIsCampaignHistoryModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const { activeProject } = useProject();
  const limit = 10;

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  useEffect(() => {
    fetchContacts();
    setSelectedContacts([]);
  }, [page, searchTerm, activeProject]);

  const fetchContacts = async () => {
    if (!activeProject) {
      setContacts([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get(`/contacts/?skip=${page * limit}&limit=${limit}&search=${searchTerm}`);
      setContacts(res.data.items || []);
      setTotalContacts(res.data.total || 0);
      setStats({
        activeWeb: res.data.active_web || 0,
        activeIos: res.data.active_ios || 0,
        activeAndroid: res.data.active_android || 0
      });
    } catch (err) {
      console.error("Failed to fetch contacts", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (contact) => {
    setSelectedContact(contact);
    setIsEditModalOpen(true);
  };

  const handleBulkDelete = async () => {
    if (!adminPassword) {
      setBulkDeleteError("Please enter your password");
      return;
    }
    setBulkDeleteLoading(true);
    setBulkDeleteError('');
    try {
      await api.post('/contacts/bulk-delete', {
        contact_ids: selectedContacts,
        password: adminPassword
      });
      setIsBulkDeleteModalOpen(false);
      setAdminPassword('');
      const deletedCount = selectedContacts.length;
      setSelectedContacts([]);
      showToast(`${deletedCount} contact(s) deleted successfully`);
      fetchContacts();
    } catch (err) {
      setBulkDeleteError(err.response?.data?.detail || "Failed to verify password or delete contacts");
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this contact?")) {
      try {
        await api.delete(`/contacts/${id}`);
        showToast("Contact deleted successfully");
        fetchContacts();
      } catch (err) {
        alert("Failed to delete contact");
      }
    }
  };

  return (
    <div style={{ padding: '32px', position: 'relative' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          background: 'rgba(34, 197, 94, 0.9)',
          backdropFilter: 'blur(8px)',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 9999,
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <CheckCircle2 size={20} />
          <span style={{ fontWeight: '600', fontSize: '14px' }}>{toastMessage}</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Audience Management
          </h1>
          <p style={{ color: '#94a3b8' }}>View and manage your multi-channel contacts</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {selectedContacts.length > 0 && (
            <button 
              onClick={() => setIsBulkDeleteModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: 'none', color: '#ef4444', fontWeight: '600', cursor: 'pointer', background: 'rgba(239, 68, 68, 0.1)' }}
            >
              <Trash2 size={18} />
              Delete ({selectedContacts.length})
            </button>
          )}
          <button 
            onClick={() => setIsHistoryModalOpen(true)}
            className="glass-effect nav-hover" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border-glass)', color: 'white' }}
          >
            <History size={18} />
            History
          </button>
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="glass-effect nav-hover" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: '1px solid var(--border-glass)', color: 'white' }}
          >
            <Upload size={18} />
            Import CSV
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '12px', border: 'none', color: 'white', fontWeight: '800', cursor: 'pointer', background: '#4f46e5', boxShadow: '0 10px 25px rgba(79, 70, 229, 0.5)', fontSize: '15px' }}
          >
            <UserPlus size={18} />
            Add Contact
          </button>
        </div>
      </div>

      {!activeProject && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '24px', borderRadius: '16px', color: '#ef4444', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Briefcase size={24} />
          <div>
            <h4 style={{ fontWeight: '700' }}>No Project Selected</h4>
            <p style={{ fontSize: '14px', color: 'rgba(239, 68, 68, 0.8)' }}>Please select a project from the sidebar to view its audience.</p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {[
          { label: 'Total Contacts', value: totalContacts.toString(), icon: Users, color: '#6366f1' },
          { label: 'Active Web', value: stats.activeWeb.toString(), icon: Database, color: '#a855f7' },
          { label: 'Active iOS', value: stats.activeIos.toString(), icon: Database, color: '#ec4899' },
          { label: 'Active Android', value: stats.activeAndroid.toString(), icon: Database, color: '#f59e0b' },
        ].map((stat, i) => (
          <div key={i} className="glass-effect" style={{ padding: '20px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: `${stat.color}15`, padding: '10px', borderRadius: '12px' }}>
              <stat.icon size={24} color={stat.color} />
            </div>
            <div>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '4px' }}>{stat.label}</p>
              <h3 style={{ fontSize: '20px', fontWeight: '700' }}>{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-effect" style={{ padding: '16px', borderRadius: '16px', marginBottom: '24px', display: 'flex', gap: '16px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            placeholder="Search by name, email or phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 10px 10px 40px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-glass)', borderRadius: '10px', color: 'white', outline: 'none' }} 
          />
        </div>
      </div>

      <div className="glass-effect" style={{ borderRadius: '16px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
              <th style={{ padding: '16px 24px', width: '40px' }}>
                <input 
                  type="checkbox" 
                  checked={contacts.length > 0 && selectedContacts.length === contacts.length}
                  onChange={(e) => setSelectedContacts(e.target.checked ? contacts.map(c => c.id) : [])}
                  style={{ width: '16px', height: '16px', accentColor: '#6366f1', cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '16px 24px', color: '#94a3b8', fontWeight: '600' }}>User</th>
              <th style={{ padding: '16px 24px', color: '#94a3b8', fontWeight: '600' }}>Contact Info</th>
              <th style={{ padding: '16px 24px', color: '#94a3b8', fontWeight: '600' }}>Devices</th>
              <th style={{ padding: '16px 24px', color: '#94a3b8', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '16px 24px', color: '#94a3b8', fontWeight: '600' }}>Created At</th>
              <th style={{ padding: '16px 24px', color: '#94a3b8', fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" style={{ padding: '48px', textAlign: 'center' }}><div className="animate-spin" style={{ width: '30px', height: '30px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto' }}></div></td></tr>
            ) : contacts.length === 0 ? (
              <tr><td colSpan="7" style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>No contacts found in your audience.</td></tr>
            ) : contacts.map((contact) => (
              <tr key={contact.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: selectedContacts.includes(contact.id) ? 'rgba(99, 102, 241, 0.05)' : 'transparent' }} className="nav-hover">
                <td style={{ padding: '16px 24px' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedContacts.includes(contact.id)}
                    onChange={(e) => setSelectedContacts(prev => e.target.checked ? [...prev, contact.id] : prev.filter(id => id !== contact.id))}
                    style={{ width: '16px', height: '16px', accentColor: '#6366f1', cursor: 'pointer' }}
                  />
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {contact.user_name?.charAt(0) || contact.email?.charAt(0) || '?'}
                    </div>
                    <span style={{ fontWeight: '600' }}>{contact.user_name || 'Anonymous'}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '14px' }}>{contact.email}</span>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>{contact.phone || 'No phone'}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {contact.web_token && <span title="Web Push" style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', fontSize: '11px' }}>WEB</span>}
                    {contact.ios_token && <span title="iOS Push" style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', fontSize: '11px' }}>iOS</span>}
                    {contact.android_token && <span title="Android Push" style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: '11px' }}>AND</span>}
                  </div>
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <span style={{ 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    background: contact.is_active ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                    color: contact.is_active ? '#22c55e' : '#ef4444', 
                    fontSize: '12px', 
                    fontWeight: '600' 
                  }}>
                    {contact.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '16px 24px', color: '#94a3b8', fontSize: '14px' }}>
                  {formatDate(contact.created_at)}
                </td>
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      onClick={() => { setSelectedHistoryContact(contact); setIsCampaignHistoryModalOpen(true); }}
                      style={{ background: 'rgba(34, 197, 94, 0.1)', border: 'none', color: '#22c55e', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}
                      title="View Campaign Logs"
                    >
                      <History size={16} />
                    </button>
                    <button 
                      onClick={() => { setSelectedContact(contact); setIsEditModalOpen(true); }}
                      style={{ background: 'rgba(99, 102, 241, 0.1)', border: 'none', color: '#6366f1', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}
                      title="Edit Contact"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderTop: '1px solid var(--border-glass)' }}>
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>
            Showing {contacts.length > 0 ? page * limit + 1 : 0} to {Math.min((page + 1) * limit, totalContacts)} of {totalContacts} entries
          </span>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '32px', height: '32px', borderRadius: '8px',
                background: page === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.1)',
                color: page === 0 ? '#64748b' : '#6366f1',
                border: 'none', cursor: page === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={16} />
            </button>
            
            {Array.from({ length: Math.ceil(totalContacts / limit) || 1 }, (_, i) => {
              const totalPages = Math.ceil(totalContacts / limit) || 1;
              if (totalPages > 5) {
                if (i !== 0 && i !== totalPages - 1 && Math.abs(i - page) > 1) {
                  if (i === 1 && page > 2) return <span key={`dots1-${i}`} style={{ color: '#64748b', padding: '0 4px' }}>...</span>;
                  if (i === totalPages - 2 && page < totalPages - 3) return <span key={`dots2-${i}`} style={{ color: '#64748b', padding: '0 4px' }}>...</span>;
                  return null;
                }
              }
              
              return (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: '32px', height: '32px', borderRadius: '8px',
                    background: page === i ? '#6366f1' : 'transparent',
                    color: page === i ? 'white' : '#94a3b8',
                    border: 'none', cursor: 'pointer',
                    fontWeight: page === i ? '600' : '400'
                  }}
                  className={page !== i ? "nav-hover" : ""}
                >
                  {i + 1}
                </button>
              );
            })}

            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * limit >= totalContacts}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '32px', height: '32px', borderRadius: '8px',
                background: (page + 1) * limit >= totalContacts ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.1)',
                color: (page + 1) * limit >= totalContacts ? '#64748b' : '#6366f1',
                border: 'none', cursor: (page + 1) * limit >= totalContacts ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Delete Modal */}
      {isBulkDeleteModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
          <div className="glass-effect" style={{ width: '100%', maxWidth: '400px', borderRadius: '24px', padding: '32px', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trash2 size={32} color="#ef4444" />
              </div>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '700', textAlign: 'center', marginBottom: '8px' }}>Delete {selectedContacts.length} Contacts</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', marginBottom: '24px' }}>
              This action cannot be undone. Please enter your password to confirm deletion.
            </p>
            
            <div style={{ marginBottom: '24px' }}>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="password"
                  placeholder="Enter admin password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 40px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid var(--border-glass)', borderRadius: '12px', color: 'white', outline: 'none' }}
                />
              </div>
              {bulkDeleteError && (
                <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px', textAlign: 'center' }}>{bulkDeleteError}</p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => { setIsBulkDeleteModalOpen(false); setAdminPassword(''); setBulkDeleteError(''); }}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'transparent', border: '1px solid var(--border-glass)', color: 'white', cursor: 'pointer' }}
                disabled={bulkDeleteLoading}
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkDelete}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#ef4444', border: 'none', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                disabled={bulkDeleteLoading}
              >
                {bulkDeleteLoading ? <div className="animate-spin" style={{ width: '20px', height: '20px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }}></div> : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <UploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onSuccess={() => { setIsUploadModalOpen(false); fetchContacts(); }} />
      <AddContactModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={() => { setIsAddModalOpen(false); fetchContacts(); }} />
      <EditContactModal isOpen={isEditModalOpen} contact={selectedContact} onClose={() => { setIsEditModalOpen(false); setSelectedContact(null); }} onSuccess={() => { setIsEditModalOpen(false); setSelectedContact(null); fetchContacts(); }} />
      <ImportHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} />
      <ContactCampaignHistoryModal isOpen={isCampaignHistoryModalOpen} onClose={() => { setIsCampaignHistoryModalOpen(false); setSelectedHistoryContact(null); }} contact={selectedHistoryContact} />
    </div>
  );
};

export default Contacts;
