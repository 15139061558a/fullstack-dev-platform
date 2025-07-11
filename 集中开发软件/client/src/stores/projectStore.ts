import { create } from 'zustand';

interface Project {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  members: ProjectMember[];
  files: File[];
  _count: {
    files: number;
    deployments: number;
  };
}

interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
}

interface File {
  id: string;
  name: string;
  path: string;
  content: string;
  type: string;
  projectId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  removeProject: (projectId: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
  
  setProjects: (projects) => set({ projects }),
  
  setCurrentProject: (project) => set({ currentProject: project }),
  
  addProject: (project) => set((state) => ({
    projects: [project, ...state.projects]
  })),
  
  updateProject: (projectId, updates) => set((state) => ({
    projects: state.projects.map(project => 
      project.id === projectId ? { ...project, ...updates } : project
    ),
    currentProject: state.currentProject?.id === projectId 
      ? { ...state.currentProject, ...updates }
      : state.currentProject
  })),
  
  removeProject: (projectId) => set((state) => ({
    projects: state.projects.filter(project => project.id !== projectId),
    currentProject: state.currentProject?.id === projectId ? null : state.currentProject
  })),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
})); 