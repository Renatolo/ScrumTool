import { supabase } from './client';
import { type Sprint } from '@/types/sprint';
import { fetchProjects } from './projects';

/**
 * Fetches all sprints for a user (including those from projects they have access to)
 */
export async function fetchSprints(userId: string) {
  console.time('fetchSprints');
  
  try {
    // Get all projects the user has access to (both owned and as a member)
    const accessibleProjects = await fetchProjects(userId);
    
    if (!accessibleProjects.length) {
      console.log('No accessible projects found for user');
      return [];
    }
    
    const projectIds = accessibleProjects.map(project => project.id);
    
    // Fetch sprints for all accessible projects
    const { data, error } = await supabase
      .from('sprints')
      .select('*')
      .in('project_id', projectIds);
    
    if (error) {
      console.error('Error fetching sprints:', error);
      return [];
    }
    
    const mappedSprints = data.map(sprint => ({
      id: sprint.id,
      name: sprint.name,
      startDate: sprint.start_date ?? new Date().toISOString(),
      endDate: sprint.end_date ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      tasks: [],
      projectId: sprint.project_id
    }));
    
    console.timeEnd('fetchSprints');
    return mappedSprints as Sprint[];
  } catch (error) {
    console.error('Error in fetchSprints:', error);
    console.timeEnd('fetchSprints');
    return [];
  }
}

/**
 * Creates a new sprint
 */
export async function createSprint(
  sprint: Omit<Sprint, 'id'> & { userId: string }, 
  isCurrent: boolean = false
) {
  console.log('Creating sprint with isCurrent:', isCurrent);
  
  // If this is a current sprint, delete any existing current sprint
  if (isCurrent) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Fetch existing sprints to find current sprint
    const { data: existingSprints } = await supabase
      .from('sprints')
      .select('id, start_date')
      .eq('project_id', sprint.projectId);
    
    if (existingSprints && existingSprints.length > 0) {
      // Find the current sprint (if any)
      const currentSprint = existingSprints.find(s => {
        const startDate = new Date(s.start_date);
        startDate.setHours(0, 0, 0, 0);
        return startDate.getTime() === today.getTime();
      });
      
      // Delete the current sprint if found
      if (currentSprint) {
        console.log('Deleting existing current sprint:', currentSprint.id);
        const { error: deleteError } = await supabase
          .from('sprints')
          .delete()
          .eq('id', currentSprint.id);
        
        if (deleteError) {
          console.error('Error deleting existing sprint:', deleteError);
          throw deleteError;
        }
      }
    }
  }
  
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

  // Insert new sprint
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
 */
export async function deleteSprint(id: string) {
  console.log('Deleting sprint with ID:', id);

  try {
    // Unassign tasks first
    await supabase
      .from('tasks')
      .update({ sprint_id: null })
      .eq('sprint_id', id);

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
  } catch (error) {
    console.error('Error in deleteSprint:', error);
    return false;
  }
}

/**
 * Fetches sprints for a specific project
 */
export async function fetchProjectSprints(projectId: string) {
  console.time('fetchProjectSprints');

  const { data, error } = await supabase
    .from('sprints')
    .select('id, name, start_date, end_date, project_id')
    .eq('project_id', projectId)
    .order('start_date');

  if (error) {
    console.error('Error fetching project sprints:', error);
    return [];
  }

  const mappedSprints = data.map(sprint => ({
    id: sprint.id,
    name: sprint.name,
    startDate: sprint.start_date ?? new Date().toISOString(),
    endDate: sprint.end_date ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    tasks: [],
    projectId: sprint.project_id
  }));

  console.timeEnd('fetchProjectSprints');
  return mappedSprints as Sprint[];
}

/**
 * Fetches a specific sprint by ID
 */
export async function fetchSprintById(sprintId: string): Promise<Sprint | null> {
  try {
    const { data, error } = await supabase
      .from('sprints')
      .select('*')
      .eq('id', sprintId)
      .single();
    
    if (error) {
      console.error('Error fetching sprint by ID:', error);
      return null;
    }
    
    return {
      id: data.id,
      name: data.name,
      startDate: data.start_date,
      endDate: data.end_date,
      tasks: [],
      projectId: data.project_id
    } as Sprint;
  } catch (error) {
    console.error('Error in fetchSprintById:', error);
    return null;
  }
}

/**
 * Gets the currently active sprint for a project (if any)
 * An active sprint is defined as one where the current date falls between its start and end dates
 */
export async function getActiveSprintForProject(projectId: string): Promise<Sprint | null> {
  try {
    console.log('Finding active sprint for project:', projectId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from('sprints')
      .select('*')
      .eq('project_id', projectId);
    
    if (error) {
      console.error('Error fetching sprints for active sprint check:', error);
      return null;
    }
    
    if (!data || data.length === 0) {
      console.log('No sprints found for project');
      return null;
    }
    
    // Find a sprint where today falls between start_date and end_date
    const activeSprint = data.find(sprint => {
      const startDate = new Date(sprint.start_date);
      const endDate = new Date(sprint.end_date);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999); // Include the full end date
      
      return today >= startDate && today <= endDate;
    });
    
    if (activeSprint) {
      console.log('Found active sprint:', activeSprint.id);
      return {
        id: activeSprint.id,
        name: activeSprint.name,
        startDate: activeSprint.start_date,
        endDate: activeSprint.end_date,
        tasks: [],
        projectId: activeSprint.project_id
      } as Sprint;
    }
    
    console.log('No active sprint found for project');
    return null;
  } catch (error) {
    console.error('Error in getActiveSprintForProject:', error);
    return null;
  }
}
