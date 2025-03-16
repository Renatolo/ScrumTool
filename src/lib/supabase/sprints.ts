
import { supabase } from './client';
import { type Sprint } from '@/types/sprint';

/**
 * Fetches all sprints for a user
 * @param userId - The user's ID
 * @returns Array of sprints
 */
export async function fetchSprints(userId: string) {
  console.time('fetchSprints');
  const { data, error } = await supabase
    .from('sprints')
    .select('*')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching sprints:', error);
    if (error.code === '42P01') {
      // Table doesn't exist yet
      return [];
    }
    throw error;
  }
  
  // Map from database schema to our application schema
  const mappedSprints = data.map(sprint => ({
    id: sprint.id,
    name: sprint.name,
    startDate: sprint.start_date || new Date().toISOString(),
    endDate: sprint.end_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // Default to 2 weeks later
    tasks: [],
    projectId: sprint.project_id
  }));
  
  console.timeEnd('fetchSprints');
  return mappedSprints as Sprint[];
}

/**
 * Creates a new sprint
 * @param sprint - The sprint data
 * @returns The created sprint
 */
export async function createSprint(sprint: Omit<Sprint, 'id'> & { userId: string }) {
  // Map from our application schema to database schema
  const dbSprint = {
    name: sprint.name,
    start_date: sprint.startDate,
    end_date: sprint.endDate,
    user_id: sprint.userId,
    project_id: sprint.projectId
  };
  
  const { data, error } = await supabase
    .from('sprints')
    .insert(dbSprint)
    .select()
    .single();
  
  if (error) {
    console.error('Error creating sprint:', error);
    throw error;
  }
  
  // Map back to our application schema
  return {
    id: data.id,
    name: data.name,
    startDate: data.start_date || new Date().toISOString(),
    endDate: data.end_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    tasks: [],
    projectId: data.project_id
  } as Sprint;
}

/**
 * Updates an existing sprint
 * @param sprint - The sprint data
 * @returns boolean indicating success
 */
export async function updateSprint(sprint: Sprint & { userId: string }) {
  // Map from our application schema to database schema
  const dbSprint = {
    name: sprint.name,
    start_date: sprint.startDate,
    end_date: sprint.endDate,
    user_id: sprint.userId,
    project_id: sprint.projectId
  };
  
  const { error } = await supabase
    .from('sprints')
    .update(dbSprint)
    .eq('id', sprint.id);
  
  if (error) {
    console.error('Error updating sprint:', error);
    throw error;
  }
  
  return true;
}

/**
 * Deletes a sprint
 * @param id - The sprint ID
 * @returns boolean indicating success
 */
export async function deleteSprint(id: string) {
  const { error } = await supabase
    .from('sprints')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting sprint:', error);
    throw error;
  }
  
  return true;
}

/**
 * Fetches sprints for a specific project
 * @param projectId - The project's ID
 * @returns Array of sprints
 */
export async function fetchProjectSprints(projectId: string) {
  console.time('fetchProjectSprints');
  console.log('Fetching sprints for project:', projectId);
  
  // Use more efficient query with fewer columns if possible
  const { data, error } = await supabase
    .from('sprints')
    .select('id, name, start_date, end_date, project_id')
    .eq('project_id', projectId)
    .order('start_date', { ascending: false });
  
  if (error) {
    console.error('Error fetching project sprints:', error);
    if (error.code === '42P01') {
      // Table doesn't exist yet
      return [];
    }
    throw error;
  }
  
  // Map from database schema to our application schema
  const mappedSprints = data.map(sprint => ({
    id: sprint.id,
    name: sprint.name,
    startDate: sprint.start_date || new Date().toISOString(),
    endDate: sprint.end_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    tasks: [],
    projectId: sprint.project_id
  }));
  
  console.timeEnd('fetchProjectSprints');
  return mappedSprints as Sprint[];
}
