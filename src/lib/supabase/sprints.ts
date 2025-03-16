
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
      return []; // Table doesn't exist yet
    }
    throw error;
  }
  
  const mappedSprints = data.map(sprint => ({
    id: sprint.id,
    name: sprint.name,
    startDate: sprint.start_date || new Date().toISOString(),
    endDate: sprint.end_date || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
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
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to midnight

  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);

  if (startDate < today) {
    throw new Error('Start date must be today or in the future');
  }

  if (endDate <= startDate) {
    throw new Error('End date must be after start date');
  }

  // Map to database schema
  const dbSprint = {
    name: sprint.name,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
    user_id: sprint.userId,
    project_id: sprint.projectId
  };

  // Delete all existing sprints for this project first
  console.log(`Deleting existing sprints for project: ${sprint.projectId}`);
  const { error: deleteError } = await supabase
    .from('sprints')
    .delete()
    .eq('project_id', sprint.projectId);

  if (deleteError) {
    console.error('Error deleting existing sprints:', deleteError);
    throw deleteError;
  }

  // Insert new sprint
  console.log('Creating new sprint:', dbSprint);
  const { data, error } = await supabase
    .from('sprints')
    .insert(dbSprint)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error creating sprint:', error);
    throw error;
  }

  if (!data) {
    throw new Error('Sprint creation failed unexpectedly');
  }

  console.log('Sprint created successfully:', data);
  return {
    id: data.id,
    name: data.name,
    startDate: data.start_date,
    endDate: data.end_date,
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
  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);

  if (endDate <= startDate) {
    throw new Error('End date must be after start date');
  }

  const dbSprint = {
    name: sprint.name,
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
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

  // Unassign tasks first
  const { error: taskError } = await supabase
    .from('tasks')
    .update({ sprint_id: null })
    .eq('sprint_id', id);

  if (taskError) {
    console.error('Error removing tasks from sprint:', taskError);
    throw taskError;
  }

  // Delete sprint
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
  const startDate = new Date(newSprint.startDate);
  const endDate = new Date(newSprint.endDate);

  if (endDate <= startDate) {
    throw new Error('End date must be after start date');
  }

  console.log('Replacing active sprint:', currentSprintId, 'with new sprint');

  try {
    // We can now use createSprint directly since it will delete all existing sprints
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

  const { data, error } = await supabase
    .from('sprints')
    .select('id, name, start_date, end_date, project_id')
    .eq('project_id', projectId)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Error fetching project sprints:', error);
    if (error.code === '42P01') {
      return [];
    }
    throw error;
  }

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
