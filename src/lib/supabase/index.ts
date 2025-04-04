
import { supabase } from './client';

// Re-export all functions from the separate files
export { supabase };
export * from './tasks';
export * from './sprints';
export * from './sprint-tasks';
export * from './projects';
export * from './meetings';

