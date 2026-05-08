import React from 'react';
import { ChevronDown, Briefcase, Plus } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { useNavigate } from 'react-router-dom';

const ProjectSwitcher = () => {
  const { projects, activeProject, setActiveProject } = useProject();
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();

  return (
    <div style={{ position: 'relative', marginBottom: '24px' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="glass-effect"
        style={{
          width: '100%',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.05)',
          textAlign: 'left',
          transition: '0.2s'
        }}
      >
        <div style={{ 
          background: 'rgba(99, 102, 241, 0.2)', 
          padding: '8px', 
          borderRadius: '8px',
          color: '#6366f1'
        }}>
          <Briefcase size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>Active Project</div>
          <div style={{ color: 'white', fontWeight: '600', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeProject ? activeProject.name : 'Select Project'}
          </div>
        </div>
        <ChevronDown size={16} color="#475569" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
      </button>

      {isOpen && (
        <>
          <div 
            onClick={() => setIsOpen(false)}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40 }}
          />
          <div className="glass-effect" style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            zIndex: 50,
            padding: '8px',
            background: 'rgba(30, 41, 59, 0.95)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setActiveProject(p);
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: activeProject?.id === p.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  color: activeProject?.id === p.id ? '#6366f1' : '#94a3b8',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '2px'
                }}
                className="nav-hover"
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeProject?.id === p.id ? '#6366f1' : 'transparent', border: activeProject?.id === p.id ? 'none' : '1px solid #475569' }} />
                <span style={{ fontWeight: activeProject?.id === p.id ? '600' : '400', fontSize: '13px' }}>{p.name}</span>
              </button>
            ))}
            
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
            
            <button
              onClick={() => {
                navigate('/projects');
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: 'none',
                background: 'transparent',
                color: '#fff',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
              className="nav-hover"
            >
              <Plus size={16} />
              <span style={{ fontSize: '13px', fontWeight: '500' }}>Manage Projects</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectSwitcher;
