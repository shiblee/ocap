import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach token if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ocap_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Attach project_id to query params if available
    const projectId = localStorage.getItem('active_project_id');
    if (projectId) {
      config.params = {
        ...config.params,
        project_id: projectId
      };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token might be expired or invalid
      localStorage.removeItem('ocap_token');
      localStorage.removeItem('ocap_email');
      // Force reload to trigger AuthContext update/redirect
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
