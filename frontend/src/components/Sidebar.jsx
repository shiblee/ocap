import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Send, 
  Settings, 
  LogOut,
  Zap,
  FolderOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProjectSwitcher from './ProjectSwitcher';

const NavItem = ({ to, icon: Icon, label, active, onClick }) => (
  <Link to={to} style={{ textDecoration: 'none' }} onClick={onClick}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '12px 16px',
      borderRadius: '8px',
      color: active ? 'white' : '#94a3b8',
      background: active ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
      transition: 'all 0.2s ease',
      marginBottom: '8px'
    }} className={active ? '' : 'nav-hover'}>
      <Icon size={20} color={active ? '#6366f1' : 'currentColor'} />
      <span style={{ fontWeight: active ? '600' : '400' }}>{label}</span>
    </div>
  </Link>
);

const Sidebar = () => {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <div className="glass-effect" style={{
      width: '260px',
      height: 'calc(100vh - 40px)',
      margin: '20px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', padding: '0 10px' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          padding: '6px',
          borderRadius: '8px'
        }}>
          <Zap size={24} color="white" fill="white" />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>OCAP</h2>
      </div>

      <ProjectSwitcher />

      <nav style={{ flex: 1 }}>
        <NavItem 
          to="/dashboard" 
          icon={LayoutDashboard} 
          label="Dashboard" 
          active={location.pathname === '/dashboard'} 
        />
        <NavItem 
          to="/projects" 
          icon={FolderOpen} 
          label="Projects" 
          active={location.pathname === '/projects'} 
        />
        <NavItem 
          to="/contacts" 
          icon={Users} 
          label="Audience" 
          active={location.pathname === '/contacts'} 
        />
        <NavItem 
          to="/campaigns" 
          icon={Send} 
          label="Campaigns" 
          active={location.pathname === '/campaigns'} 
        />
        <NavItem 
          to="/settings" 
          icon={Settings} 
          label="Settings" 
          active={location.pathname === '/settings'} 
        />
      </nav>

      <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
        <NavItem 
          to="/login" 
          icon={LogOut} 
          label="Sign Out" 
          active={false} 
          onClick={(e) => {
            e.preventDefault();
            logout();
          }}
        />
      </div>
    </div>
  );
};

export default Sidebar;
