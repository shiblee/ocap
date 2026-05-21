import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Send,
  Settings,
  LogOut,
  Zap,
  FolderOpen,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProjectSwitcher from './ProjectSwitcher';

/* ─── Single nav item ─── */
const NavItem = ({ to, icon: Icon, label, active, onClick }) => (
  <Link to={to} style={{ textDecoration: 'none' }} onClick={onClick}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '11px 14px',
        borderRadius: '10px',
        color: active ? 'white' : '#94a3b8',
        background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
        transition: 'all 0.2s ease',
        marginBottom: '4px',
        cursor: 'pointer',
      }}
      className={active ? '' : 'nav-hover'}
    >
      <Icon size={19} color={active ? '#6366f1' : 'currentColor'} />
      <span style={{ fontWeight: active ? '600' : '400', fontSize: '14px' }}>
        {label}
      </span>
    </div>
  </Link>
);

/* ─── Sidebar inner content (shared by both desktop & drawer) ─── */
const SidebarContent = ({ onNavClick }) => {
  const location = useLocation();
  const { logout } = useAuth();

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/projects',  icon: FolderOpen,      label: 'Projects'  },
    { to: '/contacts',  icon: Users,           label: 'Audience'  },
    { to: '/campaigns', icon: Send,            label: 'Campaigns' },
    { to: '/settings',  icon: Settings,        label: 'Settings'  },
  ];

  return (
    <>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', padding: '0 6px' }}>
        <div style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', padding: '6px', borderRadius: '8px', flexShrink: 0 }}>
          <Zap size={22} color="white" fill="white" />
        </div>
        <h2 style={{ fontSize: '19px', fontWeight: 'bold', letterSpacing: '-0.5px' }}>OCAP</h2>
      </div>

      {/* Project switcher */}
      <ProjectSwitcher />

      {/* Nav links */}
      <nav style={{ flex: 1, marginTop: '8px' }}>
        {navItems.map(item => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            active={location.pathname === item.to || location.pathname.startsWith(item.to + '/')}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* Sign out */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '16px' }}>
        <NavItem
          to="/login"
          icon={LogOut}
          label="Sign Out"
          active={false}
          onClick={(e) => { e.preventDefault(); logout(); onNavClick?.(); }}
        />
      </div>
    </>
  );
};

/* ─── Main Sidebar component ─── */
const Sidebar = () => {
  const [open, setOpen] = useState(false);

  // Close drawer on route change / resize
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) setOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      {/* ── Desktop sidebar (always visible ≥ 769px) ── */}
      <div className="sidebar-desktop glass-effect">
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <SidebarContent onNavClick={() => {}} />
        </div>
      </div>

      {/* ── Mobile top bar (visible < 769px) ── */}
      <div className="sidebar-topbar glass-effect">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)', padding: '5px', borderRadius: '7px' }}>
            <Zap size={18} color="white" fill="white" />
          </div>
          <span style={{ fontSize: '17px', fontWeight: '800', letterSpacing: '-0.5px' }}>OCAP</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
        >
          <Menu size={24} />
        </button>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {open && (
        <div
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer panel ── */}
      <div className={`sidebar-drawer glass-effect ${open ? 'sidebar-drawer--open' : ''}`}>
        <button
          onClick={() => setOpen(false)}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
        >
          <X size={22} />
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingTop: '8px' }}>
          <SidebarContent onNavClick={() => setOpen(false)} />
        </div>
      </div>
    </>
  );
};

export default Sidebar;
