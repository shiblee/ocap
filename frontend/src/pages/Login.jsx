import React, { useState } from 'react';
import { Mail, Lock, LogIn, Loader2, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    const result = await login(email, password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    setIsSubmitting(false);
  };

  const fieldStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    marginBottom: '20px'
  };

  const inputStyle = {
    width: '100%',
    height: '52px',
    padding: '0 16px 0 48px',
    background: 'rgba(15, 23, 42, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    color: '#fff',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.3s ease',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
  };

  const iconStyle = {
    position: 'absolute',
    left: '16px',
    color: '#6366f1', // Indigo icon
    opacity: 0.8
  };

  return (
    <div style={{
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: 'radial-gradient(circle at 10% 20%, #1e293b 0%, #0f172a 90%)',
      padding: '20px'
    }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="glass-effect"
        style={{ 
          padding: '48px 40px', 
          width: '100%', 
          maxWidth: '440px', 
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          background: 'rgba(30, 41, 59, 0.8)'
        }}
      >
        <header style={{ marginBottom: '40px' }}>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            style={{ 
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              boxShadow: '0 10px 20px rgba(99, 102, 241, 0.3)'
            }}
          >
            {isSubmitting ? <Loader2 className="animate-spin" color="white" size={36} /> : <LogIn color="white" size={36} />}
          </motion.div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>Welcome Back</h1>
          <p style={{ color: '#94a3b8', marginTop: '8px', fontSize: '15px' }}>Access your OCAP Master Terminal</p>
        </header>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{ 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444', 
              padding: '12px', 
              borderRadius: '12px',
              fontSize: '13px',
              marginBottom: '24px',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              justifyContent: 'center'
            }}
          >
             Invalid credentials. Access denied.
          </motion.div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={fieldStyle}>
            <Mail size={20} style={iconStyle} />
            <input 
              type="email" 
              placeholder="Administrator Email" 
              style={inputStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              onFocus={(e) => {
                e.target.style.borderColor = '#6366f1';
                e.target.style.background = 'rgba(15, 23, 42, 0.6)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.target.style.background = 'rgba(15, 23, 42, 0.4)';
              }}
            />
          </div>

          <div style={fieldStyle}>
            <Lock size={20} style={iconStyle} />
            <input 
              type="password" 
              placeholder="Secure Password" 
              style={inputStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              onFocus={(e) => {
                e.target.style.borderColor = '#6366f1';
                e.target.style.background = 'rgba(15, 23, 42, 0.6)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.target.style.background = 'rgba(15, 23, 42, 0.4)';
              }}
            />
          </div>

          <button 
            type="submit" 
            className="vibrant-btn" 
            style={{ 
              marginTop: '10px', 
              width: '100%', 
              height: '54px', 
              borderRadius: '14px',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Authenticating...' : 'Sign In to Portal'}
            {!isSubmitting && <ChevronRight size={18} />}
          </button>
        </form>

        <footer style={{ marginTop: '40px' }}>
          <p style={{ fontSize: '12px', color: '#475569', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            © 2026 OCAP. Expert Project Management System.
          </p>
        </footer>
      </motion.div>
    </div>
  );
};

export default Login;
