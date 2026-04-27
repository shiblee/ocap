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
          selectProject(res.data[0]);
        }
      } else if (res.data.length > 0) {
        selectProject(res.data[0]);
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
      // Reload page to ensure all components refresh with new project context
      // Alternatively, we can rely on context updates, but reloading is safer for full isolation
      window.location.reload(); 
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
