
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
  // Validate dates for coherence
  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to beginning of today
  
  // Check that start date is today or in the future
  if (startDate < today) {
    throw new Error('Start date must be today or a future date');
  }
  
  if (endDate < startDate) {
    throw new Error('End date must be after start date');
  }
  
  // Map from our application schema to database schema
  const dbSprint = {
    name: sprint.name,
    start_date: sprint.startDate,
    end_date: sprint.endDate,
    user_id: sprint.userId,
    project_id: sprint.projectId
  };
  
  // Check for ANY existing sprint for this project and delete it
  const { data: existingSprints } = await supabase
    .from('sprints')
    .select('id')
    .eq('project_id', sprint.projectId);
  
  if (existingSprints && existingSprints.length > 0) {
    console.log('Found existing sprint(s) for this project:', existingSprints);
    // Delete all existing sprints for this project
    for (const existingSprint of existingSprints) {
      await deleteSprint(existingSprint.id);
    }
  }
  
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
  // Validate dates for coherence
  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);
  
  if (endDate < startDate) {
    throw new Error('End date must be after start date');
  }
  
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
  console.log('Deleting sprint with ID:', id);
  
  // First delete any tasks associated with this sprint
  try {
    await supabase
      .from('tasks')
      .update({ sprint_id: null })
      .eq('sprint_id', id);
  } catch (error) {
    console.error('Error removing tasks from sprint:', error);
    // Continue with deletion even if this fails
  }
  
  const { error } = await supabase
    .from('sprints')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting sprint:', error);
    throw error;
  }
  
  console.log('Sprint deleted successfully');
  return true;
}

/**
 * Replaces the current active sprint with a new one
 * @param currentSprintId - The ID of the current sprint to delete
 * @param newSprint - The new sprint data to create
 * @returns The created sprint
 */
export async function replaceActiveSprint(currentSprintId: string, newSprint: Omit<Sprint, 'id'> & { userId: string }) {
  // Validate dates for coherence
  const startDate = new Date(newSprint.startDate);
  const endDate = new Date(newSprint.endDate);
  
  if (endDate < startDate) {
    throw new Error('End date must be after start date');
  }
  
  console.log('Replacing active sprint:', currentSprintId, 'with new sprint');
  
  // Start a transaction to ensure both operations succeed or fail together
  try {
    // First: Delete the current sprint
    const deleteResult = await deleteSprint(currentSprintId);
    
    if (!deleteResult) {
      throw new Error('Failed to delete current sprint');
    }
    
    // Second: Create the new sprint
    return await createSprint(newSprint);
  } catch (error) {
    console.error('Error in replaceActiveSprint:', error);
    throw error;
  }
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
