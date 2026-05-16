import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Trash2, 
  Upload,
  ChevronLeft,
  ChevronRight,
  Database,
  Edit2
} from 'lucide-react';
import api from '../utils/api';
import UploadModal from '../components/UploadModal';
import AddContactModal from '../components/AddContactModal';
import EditContactModal from '../components/EditContactModal';
import { useProject } from '../context/ProjectContext';
import { Briefcase } from 'lucide-react';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const { activeProject } = useProject();
  const limit = 10;

  useEffect(() => {
    fetchContacts();
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
      setContacts(res.data);
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

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this contact?")) {
      try {
        await api.delete(`/contacts/${id}`);
        fetchContacts();
      } catch (err) {
        alert("Failed to delete contact");
      }
    }
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Audience Management
          </h1>
          <p style={{ color: '#94a3b8' }}>View and manage your multi-channel contacts</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
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
          { label: 'Total Contacts', value: contacts.length.toString(), icon: Users, color: '#6366f1' },
          { label: 'Active Web', value: contacts.filter(c => c.web_token).length.toString(), icon: Database, color: '#a855f7' },
          { label: 'Active iOS', value: contacts.filter(c => c.ios_token).length.toString(), icon: Database, color: '#ec4899' },
          { label: 'Active Android', value: contacts.filter(c => c.android_token).length.toString(), icon: Database, color: '#f59e0b' },
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
              <th style={{ padding: '16px 24px', color: '#94a3b8', fontWeight: '600' }}>User</th>
              <th style={{ padding: '16px 24px', color: '#94a3b8', fontWeight: '600' }}>Contact Info</th>
              <th style={{ padding: '16px 24px', color: '#94a3b8', fontWeight: '600' }}>Devices</th>
              <th style={{ padding: '16px 24px', color: '#94a3b8', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '16px 24px', color: '#94a3b8', fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" style={{ padding: '48px', textAlign: 'center' }}><div className="animate-spin" style={{ width: '30px', height: '30px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto' }}></div></td></tr>
            ) : contacts.length === 0 ? (
              <tr><td colSpan="5" style={{ padding: '48px', textAlign: 'center', color: '#64748b' }}>No contacts found in your audience.</td></tr>
            ) : contacts.map((contact) => (
              <tr key={contact.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }} className="nav-hover">
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
                <td style={{ padding: '16px 24px' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      onClick={() => handleEdit(contact)}
                      className="nav-hover" 
                      style={{ color: '#6366f1', background: 'rgba(99, 102, 241, 0.1)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(contact.id)}
                      className="nav-hover" 
                      style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onSuccess={() => { setIsUploadModalOpen(false); fetchContacts(); }} />
      <AddContactModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSuccess={() => { setIsAddModalOpen(false); fetchContacts(); }} />
      <EditContactModal isOpen={isEditModalOpen} contact={selectedContact} onClose={() => { setIsEditModalOpen(false); setSelectedContact(null); }} onSuccess={() => { setIsEditModalOpen(false); setSelectedContact(null); fetchContacts(); }} />
    </div>
  );
};

export default Contacts;
