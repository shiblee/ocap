import React from 'react';
import { 
  Users, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useProject } from '../context/ProjectContext';
import { Briefcase } from 'lucide-react';

// Mock data for the chart
const data = [
  { name: 'Mon', value: 400 },
  { name: 'Tue', value: 300 },
  { name: 'Wed', value: 600 },
  { name: 'Thu', value: 800 },
  { name: 'Fri', value: 500 },
  { name: 'Sat', value: 900 },
  { name: 'Sun', value: 1100 },
];

const StatCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="glass-effect" style={{ padding: '20px', flex: 1, minWidth: '200px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>{title}</p>
        <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: '10px 0' }}>{value}</h2>
        {trend && (
          <p style={{ color: '#10b981', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4' }}>
            <TrendingUp size={12} /> {trend}
          </p>
        )}
      </div>
      <div style={{ 
        background: `rgba(${color}, 0.1)`, 
        color: `rgb(${color})`,
        padding: '10px', 
        borderRadius: '10px' 
      }}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = React.useState({
    total_audience: 0,
    messages_sent: 0,
    messages_failed: 0,
    delivery_rate: 0,
    channel_health: [],
    config_warnings: []
  });
  const [loading, setLoading] = React.useState(true);
  const { activeProject } = useProject();

  React.useEffect(() => {
    fetchStats();
  }, [activeProject]);

  const fetchStats = async () => {
    if (!activeProject) {
      setStats({
        total_audience: 0,
        messages_sent: 0,
        messages_failed: 0,
        delivery_rate: 0,
        channel_health: [],
        config_warnings: [],
        volume_stats: []
      });
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // project_id is automatically added by api.js interceptor if available in localStorage
      const res = await api.get('/analytics/stats');
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#6366f1' }}>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>Loading Analytics...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', color: 'white', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold' }}>Executive Overview</h1>
        <p style={{ color: '#94a3b8' }}>Real-time messaging analytics across all channels.</p>
      </header>

      {!activeProject && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '24px', borderRadius: '16px', color: '#ef4444', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Briefcase size={24} />
          <div>
            <h4 style={{ fontWeight: '700' }}>No Project Selected</h4>
            <p style={{ fontSize: '14px', color: 'rgba(239, 68, 68, 0.8)' }}>Please select a project from the sidebar to view its analytics desk.</p>
          </div>
        </div>
      )}

      {/* Health Alert Banner */}
      <AnimatePresence>
        {stats.config_warnings.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-effect"
            style={{ 
              padding: '20px 32px', 
              marginBottom: '30px', 
              border: '1px solid rgba(245, 158, 11, 0.2)',
              background: 'rgba(245, 158, 11, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '10px', borderRadius: '12px' }}>
                <AlertTriangle color="#f59e0b" size={24} />
              </div>
              <div>
                <h4 style={{ fontWeight: '700', fontSize: '16px', color: '#fff' }}>
                  {stats.config_warnings.includes("Email (SMTP)") ? '🚨 High Deliverability Risk' : 'Configuration Required'}
                </h4>
                <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>
                  {stats.config_warnings.includes("Email (SMTP)") 
                    ? `Critical: Your Email setup is incomplete. Campaigns may land in SPAM or fail entirely. Affected: ${stats.config_warnings.join(', ')}.`
                    : `The following channels are not fully configured: ${stats.config_warnings.join(', ')}. Campaigns on these channels will fail.`
                  }
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/settings')}
              className="vibrant-btn"
              style={{ padding: '10px 24px', borderRadius: '10px', fontSize: '14px', whiteSpace: 'nowrap' }}
            >
              Configure Now
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '30px' }}>
        <StatCard 
          title="Total Audience" 
          value={stats.total_audience.toLocaleString()} 
          icon={Users} 
          color="99, 102, 241" 
        />
        <StatCard 
          title="Messages Sent" 
          value={stats.messages_sent > 1000 ? `${(stats.messages_sent / 1000).toFixed(1)}k` : stats.messages_sent} 
          icon={Send} 
          color="168, 85, 247" 
        />
        <StatCard 
          title="Delivery Rate" 
          value={`${stats.delivery_rate}%`} 
          icon={CheckCircle} 
          color="16, 185, 129" 
        />
        <StatCard 
          title="Total Failures" 
          value={stats.messages_failed} 
          icon={AlertTriangle} 
          color="239, 68, 68" 
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginBottom: '30px' }}>
        <div className="glass-effect" style={{ padding: '24px', borderRadius: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>Volume Performance</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#6366f1' }} /> Messages Sent
              </div>
            </div>
          </div>
          <div style={{ height: '320px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.volume_stats.length > 0 ? stats.volume_stats : [
                { name: 'Mon', value: 0 }, { name: 'Tue', value: 0 }, { name: 'Wed', value: 0 },
                { name: 'Thu', value: 0 }, { name: 'Fri', value: 0 }, { name: 'Sat', value: 0 }, { name: 'Sun', value: 0 }
              ]}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'rgba(15, 23, 42, 0.9)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                  }}
                  itemStyle={{ color: '#fff', fontSize: '13px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Channel Health - Real Data */}
        <div className="glass-effect" style={{ flex: 1, padding: '24px', minWidth: '300px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px' }}>Channel Health</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {stats.channel_health.map((item) => (
              <div key={item.channel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                  <span style={{ textTransform: 'capitalize' }}>{item.channel.replace('_', ' ')}</span>
                  <span style={{ color: '#94a3b8' }}>{item.rate}% success</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${item.rate}%`, 
                    height: '100%', 
                    background: item.rate > 90 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #6366f1, #a855f7)',
                    borderRadius: '3px',
                    transition: 'width 1s ease-in-out'
                  }} />
                </div>
              </div>
            ))}
            {stats.channel_health.length === 0 && (
              <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', marginTop: '40px' }}>
                No messaging data available yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
