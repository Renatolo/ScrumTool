
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
    const { data, error } = await supabase
      .rpc('get_meeting_notes_with_authors', { meeting_id_param: meetingId });
      
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
    
    // Fallback to direct query
    const { data: basicData, error: basicError } = await supabase
      .from('meeting_notes')
      .select(`
        id,
        meeting_id,
        content,
        created_at,
        created_by,
        profiles:created_by (name)
      `)
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: false });
      
    if (basicError) throw basicError;
    
    return (basicData || []).map((note: any) => ({
      id: note.id,
      meeting_id: note.meeting_id,
      content: note.content,
      created_at: note.created_at,
      created_by: note.created_by,
      author_name: note.profiles?.name || "Unknown User"
    }));
  } catch (error) {
    console.error('Error getting meeting notes:', error);
    throw error;
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
    const { data, error } = await supabase
      .rpc('add_meeting_note', {
        meeting_id_param: meetingId,
        content_param: content,
        user_id_param: userId
      });
      
    if (!error && data) {
      return data;
    }
    
    // Fallback to direct insert
    const { data: noteData, error: noteError } = await supabase
      .from('meeting_notes')
      .insert({
        meeting_id: meetingId,
        content,
        created_by: userId
      })
      .select('*')
      .single();
      
    if (noteError) throw noteError;
    
    return {
      id: noteData.id,
      meeting_id: noteData.meeting_id,
      content: noteData.content,
      created_at: noteData.created_at,
      created_by: noteData.created_by,
      author_name: "You" // Default name, will be updated later
    };
  } catch (error) {
    console.error('Error adding meeting note:', error);
    throw error;
  }
};

export * from './client';
