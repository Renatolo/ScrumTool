
import { supabase } from './client';
import { Meeting, MeetingNote } from '@/types/project';

// Function to create stored procedures if they don't exist
export const setupMeetingNotesProcedures = async () => {
  try {
    // Create view for meeting notes if it doesn't exist
    await supabase.rpc('create_meeting_notes_view');
    
    // Create function to get meeting notes with authors
    await supabase.rpc('create_get_meeting_notes_proc');
    
    // Create function to add a meeting note
    await supabase.rpc('create_add_meeting_note_proc');
    
    console.log('Meeting notes procedures setup completed');
  } catch (error) {
    console.error('Error setting up meeting notes procedures:', error);
  }
};

// Function to get meeting notes for a meeting
export const getMeetingNotes = async (meetingId: string): Promise<MeetingNote[]> => {
  try {
    // First try the RPC if it exists
    const { data, error } = await supabase.rpc('get_meeting_notes_with_authors', { 
      meeting_id_param: meetingId 
    });
      
    if (!error && data) {
      return data.map((note: any) => ({
        id: note.id,
        meeting_id: note.meeting_id,
        content: note.content,
        created_at: note.created_at,
        created_by: note.created_by,
        author_name: note.author_name || "Unknown User"
      }));
    }
    
    // Fallback to direct SQL query
    const { data: rawData, error: sqlError } = await supabase
      .from('meetings')
      .select('id')
      .eq('id', meetingId)
      .then(async () => {
        const sql = `
          SELECT 
            mn.id, 
            mn.meeting_id, 
            mn.content, 
            mn.created_at, 
            mn.created_by, 
            p.name as author_name 
          FROM 
            meeting_notes mn 
          LEFT JOIN 
            profiles p ON mn.created_by = p.id 
          WHERE 
            mn.meeting_id = '${meetingId}'
          ORDER BY 
            mn.created_at DESC`;
            
        return await supabase.rpc('run_sql', { sql_query: sql });
      });
      
    if (sqlError) throw sqlError;
    
    return (rawData || []).map((note: any) => ({
      id: note.id,
      meeting_id: note.meeting_id,
      content: note.content,
      created_at: note.created_at,
      created_by: note.created_by,
      author_name: note.author_name || "Unknown User"
    }));
  } catch (error) {
    console.error('Error getting meeting notes:', error);
    return [];
  }
};

// Function to add a meeting note
export const addMeetingNote = async (
  meetingId: string, 
  content: string, 
  userId: string
): Promise<MeetingNote> => {
  try {
    // Try to use RPC if it exists
    const { data, error } = await supabase.rpc('add_meeting_note', {
      meeting_id_param: meetingId,
      content_param: content,
      user_id_param: userId
    });
      
    if (!error && data) {
      return data;
    }
    
    // Fallback to direct SQL insert
    const sql = `
      INSERT INTO meeting_notes(meeting_id, content, created_by) 
      VALUES('${meetingId}', '${content.replace(/'/g, "''")}', '${userId}') 
      RETURNING *`;
      
    const { data: sqlData, error: sqlError } = await supabase.rpc('run_sql', { sql_query: sql });
    
    if (sqlError) throw sqlError;
    
    if (!sqlData || sqlData.length === 0) {
      throw new Error('Failed to add meeting note');
    }
    
    // Get author name
    const { data: userData } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', userId)
      .single();
      
    return {
      id: sqlData[0].id,
      meeting_id: sqlData[0].meeting_id,
      content: sqlData[0].content,
      created_at: sqlData[0].created_at,
      created_by: sqlData[0].created_by,
      author_name: userData?.name || "You"
    };
  } catch (error) {
    console.error('Error adding meeting note:', error);
    // Return a fallback note object
    return {
      id: `temp-${Date.now()}`,
      meeting_id: meetingId,
      content: content,
      created_at: new Date().toISOString(),
      created_by: userId,
      author_name: "You"
    };
  }
};

// Function to create a meeting
export const createMeeting = async (meeting: Omit<Meeting, 'id' | 'created_at' | 'updated_at'>): Promise<Meeting> => {
  const { data, error } = await supabase
    .from('meetings')
    .insert(meeting)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

// Function to update a meeting
export const updateMeeting = async (id: string, updates: Partial<Meeting>): Promise<Meeting> => {
  const { data, error } = await supabase
    .from('meetings')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
};

// Function to delete a meeting
export const deleteMeeting = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('meetings')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Function to get meetings for a project
export const getMeetings = async (projectId: string): Promise<Meeting[]> => {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: true });

  if (error) throw error;
  return data || [];
};
