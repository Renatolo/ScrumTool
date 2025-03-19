
import { supabase } from './client';
import { type Project } from '@/types/user';

/**
 * Fetches all projects a user has access to
 * @param userId - The user's ID
 * @returns Array of projects
 */
export async function fetchProjects(userId: string) {
  try {
    // Get projects the user owns
    const { data: ownedProjects, error: ownedError } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId);
    
    if (ownedError) throw ownedError;
    
    // Get projects the user is a member of
    const { data: memberProjects, error: memberError } = await supabase
      .from('projects')
      .select('*')
      .contains('members', [userId]);
    
    if (memberError) throw memberError;
    
    // Combine and deduplicate projects
    const allProjects = [...(ownedProjects || []), ...(memberProjects || [])];
    const uniqueProjects = Array.from(
      new Map(allProjects.map((project) => [project.id, project])).values()
    );
    
    return uniqueProjects as Project[];
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

/**
 * Fetches a single project by ID
 * @param projectId - The project's ID
 * @returns The project or null if not found
 */
export async function fetchProject(projectId: string): Promise<Project | null> {
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
    return null;
  }
}

/**
 * Creates a new project
 * @param project - The project data
 * @returns The created project
 */
export async function createProject(project: Omit<Project, 'id'> & { user_id: string }) {
  const { data, error } = await supabase
    .from('projects')
    .insert(project)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating project:', error);
    throw error;
  }
  
  return data as Project;
}

/**
 * Joins a project using the project code
 * @param code - The project join code
 * @param userId - The user's ID
 * @returns The joined project
 */
export async function joinProject(code: string, userId: string) {
  try {
    // Find the project with the given code
    console.log("DEBUG");
    console.log(code);
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('code', code)
      .maybeSingle();
    
    if (error) throw error;
    
    if (!data) {
      throw new Error('Project not found with this code');
    }
    
    // If user is already a member, just return the project
    if (data.members && data.members.includes(userId)) {
      return data as Project;
    }
    
    // Add user to project members
    const updatedMembers = [...(data.members || []), userId];
    
    const { error: updateError } = await supabase
      .from('projects')
      .update({ members: updatedMembers })
      .eq('id', data.id);
      
    if (updateError) throw updateError;
    
    // Return the updated project
    return {
      ...data,
      members: updatedMembers
    } as Project;
  } catch (error) {
    console.error('Error joining project:', error);
    throw error;
  }
}

/**
 * Deletes a project and its associated data
 * @param projectId - The project ID
 * @returns boolean indicating success
 */
export async function deleteProject(projectId: string) {
  try {
    // Delete all tasks associated with this project
    const { error: tasksError } = await supabase
      .from('tasks')
      .delete()
      .eq('project_id', projectId);
    
    if (tasksError) throw tasksError;
    
    // Delete all sprints associated with this project
    const { error: sprintsError } = await supabase
      .from('sprints')
      .delete()
      .eq('project_id', projectId);
    
    if (sprintsError) throw sprintsError;
    
    // Finally delete the project
    const { error: projectError } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);
    
    if (projectError) throw projectError;
    
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}
