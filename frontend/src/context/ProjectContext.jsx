import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects/');
      setProjects(res.data);
      
      const savedProjectId = localStorage.getItem('active_project_id');
      if (savedProjectId) {
        const found = res.data.find(p => p.id === parseInt(savedProjectId));
        if (found) {
          setActiveProject(found);
        } else if (res.data.length > 0) {
          setActiveProject(res.data[0]);
          localStorage.setItem('active_project_id', res.data[0].id);
        }
      } else if (res.data.length > 0) {
        setActiveProject(res.data[0]);
        localStorage.setItem('active_project_id', res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
    } finally {
      setLoading(false);
    }
  };

  const selectProject = (project) => {
    setActiveProject(project);
    if (project) {
      localStorage.setItem('active_project_id', project.id);
      // Removed window.location.reload() to prevent slow page reloads, React context will handle it natively.
    }
  };

  const refreshProjects = async () => {
    const res = await api.get('/projects/');
    setProjects(res.data);
    // Update active project if it changed
    if (activeProject) {
      const updated = res.data.find(p => p.id === activeProject.id);
      if (updated) setActiveProject(updated);
    }
  };

  return (
    <ProjectContext.Provider value={{ 
      projects, 
      activeProject, 
      setActiveProject: selectProject, 
      loading,
      refreshProjects 
    }}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => useContext(ProjectContext);
