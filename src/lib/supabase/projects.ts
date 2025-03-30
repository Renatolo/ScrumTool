
import { supabase } from './client';
import { Project } from '@/types/user';
import { Sprint } from '@/types/sprint';

export const fetchProjects = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .contains('members', [userId]);
      
    if (error) throw error;
    
    return data as Project[];
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
};

export const fetchProject = async (projectId: string) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
      
    if (error) throw error;
    
    return data as Project;
  } catch (error) {
    console.error('Error fetching project:', error);
    throw error;
  }
};

export const fetchActiveProjectSprint = async (projectId: string): Promise<Sprint | null> => {
  try {
    const today = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
    
    const { data, error } = await supabase
      .from('sprints')
      .select('*')
      .eq('project_id', projectId)
      .lte('start_date', today)
      .gte('end_date', today)
      .order('start_date', { ascending: false })
      .limit(1)
      .single();
    
    if (error) {
      // If no active sprint is found, this will error with PGRST116, which is expected
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    
    if (!data) return null;
    
    // Convert database field names to camelCase
    const sprint: Sprint = {
      id: data.id,
      name: data.name,
      startDate: data.start_date,
      endDate: data.end_date,
      tasks: data.tasks || [],
      projectId: data.project_id
    };
    
    return sprint;
  } catch (error) {
    console.error('Error fetching active sprint:', error);
    return null;
  }
};

export const createProject = async (project: Partial<Project>) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();
      
    if (error) throw error;
    
    return data as Project;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
};

export const joinProject = async (projectCode: string, userId: string) => {
  try {
    // Find the project by code
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('code', projectCode)
      .single();
    
    if (error) throw error;
    if (!data) throw new Error('Project not found');
    
    const project = data as Project;
    
    // Check if user is already a member
    const members = project.members || [];
    if (members.includes(userId)) {
      return project;
    }
    
    // Add user to members array
    const updatedMembers = [...members, userId];
    
    // Initialize member_roles if needed and set default role to developer
    const memberRoles = project.member_roles || {};
    memberRoles[userId] = 'developer';
    
    // Update the project
    const { error: updateError } = await supabase
      .from('projects')
      .update({ 
        members: updatedMembers,
        member_roles: memberRoles
      })
      .eq('id', project.id);
      
    if (updateError) throw updateError;
    
    // Return the updated project
    const updatedProject = {
      ...project,
      members: updatedMembers,
      member_roles: memberRoles
    };
    
    return updatedProject;
  } catch (error) {
    console.error('Error joining project:', error);
    throw error;
  }
};

export const inviteUserByEmail = async (projectId: string, userId: string) => {
  try {
    // Get the current project
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
      
    if (error) throw error;
    
    // Check if user is already a member
    const members = project.members || [];
    if (members.includes(userId)) {
      throw new Error('User is already a member of this project');
    }
    
    // Add user to the project
    const updatedMembers = [...members, userId];
    
    // Initialize member_roles if needed and set default role to developer
    const memberRoles = project.member_roles || {};
    memberRoles[userId] = 'developer';
    
    // Update the project
    const { error: updateError } = await supabase
      .from('projects')
      .update({ 
        members: updatedMembers,
        member_roles: memberRoles
      })
      .eq('id', project.id);
      
    if (updateError) throw updateError;
    
    return { message: 'User added to project' };
  } catch (error) {
    console.error('Error inviting user:', error);
    throw error;
  }
};

export const fetchProjectById = async (projectId: string) => {
  return fetchProject(projectId);
};
