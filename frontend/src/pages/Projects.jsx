import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Briefcase, 
  Search, 
  MoreVertical, 
  Globe, 
  Users, 
  Send,
  X,
  PlusCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import api from '../utils/api';
import { useProject } from '../context/ProjectContext';
import { motion, AnimatePresence } from 'framer-motion';

const CreateProjectModal = ({ isOpen, onClose, onSuccess, project }) => {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (project) setFormData({ name: project.name, description: project.description || '' });
    else setFormData({ name: '', description: '' });
  }, [project, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (project) await api.put(`/projects/${project.id}`, formData);
      else await api.post('/projects/', formData);
      onSuccess();
    } catch (err) {
      alert("Failed to save project.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
      <div className="glass-effect" style={{ width: '100%', maxWidth: '450px', padding: '32px', borderRadius: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '800' }}>{project ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24}/></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Project Name</label>
            <input 
              style={{ width: '100%', padding: '12px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required 
            />
          </div>
          <div style={{ marginBottom: '32px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>Description (Optional)</label>
            <textarea 
              style={{ width: '100%', padding: '12px', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', resize: 'none' }}
              rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>
          <button 
            type="submit" 
            className="vibrant-btn" 
            style={{ width: '100%', padding: '14px', borderRadius: '14px', fontWeight: '700' }}
            disabled={loading}
          >
            {loading ? 'Saving...' : (project ? 'Update Project' : 'Create Project')}
          </button>
        </form>
      </div>
    </div>
  );
};

const Projects = () => {
  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const { activeProject, setActiveProject, refreshProjects } = useProject();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects/');
      // Fetch stats for each project
      const projectsWithStats = await Promise.all(res.data.map(async (p) => {
        try {
          const statsRes = await api.get(`/projects/${p.id}/stats`);
          return { ...p, ...statsRes.data };
        } catch {
          return { ...p, campaign_count: 0, contact_count: 0 };
        }
      }));
      setProjectsList(projectsWithStats);
    } catch (err) {
      console.error("Failed to fetch projects", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure? This will delete all campaigns and contacts in this project.")) return;
    try {
      await api.delete(`/projects/${id}`);
      fetchProjects();
      refreshProjects();
    } catch (err) {
      alert("Failed to delete project.");
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
        <div>
          <h1 style={{ fontSize: '36px', fontWeight: '900', letterSpacing: '-1px', marginBottom: '10px' }}>Project Command Center</h1>
          <p style={{ color: '#94a3b8', fontSize: '16px' }}>Manage isolated environments and team workflows.</p>
        </div>
        <button 
          onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
          className="vibrant-btn"
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 28px', borderRadius: '16px', fontWeight: '700' }}
        >
          <Plus size={20} /> Create Project
        </button>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '100px', color: '#6366f1' }}>
          <div className="animate-spin" style={{ width: '40px', height: '40px', border: '4px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 20px' }}></div>
          <p>Scanning Portals...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {projectsList.map((project) => (
            <motion.div 
              key={project.id}
              whileHover={{ y: -5 }}
              className="glass-effect"
              style={{
                padding: '24px',
                borderRadius: '24px',
                border: activeProject?.id === project.id ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.05)',
                background: activeProject?.id === project.id ? 'rgba(99, 102, 241, 0.05)' : 'rgba(30, 41, 59, 0.4)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                height: '220px'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ 
                    background: 'rgba(99, 102, 241, 0.1)', 
                    color: '#6366f1', 
                    padding: '10px', 
                    borderRadius: '12px' 
                  }}>
                    <Briefcase size={22} />
                  </div>
                  {activeProject?.id === project.id && (
                    <div style={{ background: '#22c55e', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase' }}>Active</div>
                  )}
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#fff' }}>{project.name}</h3>
                <p style={{ color: '#64748b', fontSize: '13px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {project.description || "No description provided for this project."}
                </p>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '13px' }}>
                    <Users size={14} /> {project.contact_count || 0}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '13px' }}>
                    <Send size={14} /> {project.campaign_count || 0}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setActiveProject(project)}
                    style={{ background: activeProject?.id === project.id ? '#6366f1' : 'rgba(15, 23, 42, 0.5)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                  >
                    {activeProject?.id === project.id ? 'Selected' : 'Switch'}
                  </button>
                  <button 
                    onClick={() => { setEditingProject(project); setIsModalOpen(true); }}
                    style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}
                  >
                    <MoreVertical size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(project.id)}
                    style={{ background: 'rgba(239, 68, 68, 0.05)', border: 'none', color: '#ef4444', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          
          <button 
            onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
            style={{
              padding: '24px',
              borderRadius: '24px',
              border: '2px dashed rgba(255,255,255,0.1)',
              background: 'transparent',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569',
              transition: '0.2s',
              minHeight: '220px'
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = '#6366f1'}
            onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
          >
            <PlusCircle size={32} style={{ marginBottom: '12px' }} />
            <span style={{ fontWeight: '600' }}>Add New Portal</span>
          </button>
        </div>
      )}

      <CreateProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => { setIsModalOpen(false); fetchProjects(); refreshProjects(); }}
        project={editingProject}
      />
    </div>
  );
};

export default Projects;
