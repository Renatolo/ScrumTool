
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { FileText, User, Clock } from "lucide-react";
import { MeetingNote } from "@/types/project";

interface MeetingNotesListProps {
  meetingId: string;
  meetingName: string;
}

const MeetingNotesList = ({ meetingId, meetingName }: MeetingNotesListProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Fetch meeting notes - using a more direct approach with raw SQL
  useEffect(() => {
    const fetchNotes = async () => {
      if (!meetingId) return;
      
      try {
        setLoading(true);
        
        // Use SQL to join meeting_notes and profiles since the meeting_notes table isn't in the type definition
        const { data, error } = await supabase
          .rpc('get_meeting_notes_with_authors', { meeting_id_param: meetingId })
          .select('*');
        
        if (error) {
          console.error("RPC error:", error);
          // Fallback to basic query without join
          const { data: basicData, error: basicError } = await supabase
            .from('meetings')
            .select('id')
            .eq('id', meetingId)
            .then(async () => {
              return await supabase.from('meeting_notes_view')
                .select('*')
                .eq('meeting_id', meetingId)
                .order('created_at', { ascending: false });
            });
            
          if (basicError) throw basicError;
          
          // Map the data to our MeetingNote interface
          const formattedNotes: MeetingNote[] = (basicData || []).map((note: any) => ({
            id: note.id,
            meeting_id: note.meeting_id,
            content: note.content,
            created_at: note.created_at,
            created_by: note.created_by,
            author_name: note.author_name || "Unknown User"
          }));
          
          setNotes(formattedNotes);
        } else {
          // Format data from RPC call
          const formattedNotes = (data || []).map((note: any) => ({
            id: note.id,
            meeting_id: note.meeting_id,
            content: note.content,
            created_at: note.created_at,
            created_by: note.created_by,
            author_name: note.author_name || "Unknown User"
          }));
          
          setNotes(formattedNotes);
        }
      } catch (error) {
        console.error("Error fetching meeting notes:", error);
        toast({
          title: "Error",
          description: "Failed to load meeting notes",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [meetingId, toast]);

  // Add a new note - using direct SQL approach
  const handleAddNote = async () => {
    if (!user || !newNote.trim()) return;
    
    try {
      setSubmitting(true);
      
      // Use raw insert to avoid type issues
      const { data, error } = await supabase
        .from('meetings')  // First verify the meeting exists
        .select('id')
        .eq('id', meetingId)
        .then(async () => {
          // Then insert the note
          return await supabase.rpc('add_meeting_note', {
            meeting_id_param: meetingId,
            content_param: newNote.trim(),
            user_id_param: user.id
          });
        });
        
      if (error) throw error;
      
      // Add new note to state - use a structured format matching our interface
      const newNoteObj: MeetingNote = {
        id: data?.id || `temp-${Date.now()}`,
        meeting_id: meetingId,
        content: newNote.trim(),
        created_at: new Date().toISOString(),
        created_by: user.id,
        author_name: user?.user_metadata?.name || "You"
      };
      
      // Add the new note to the list
      setNotes(prevNotes => [newNoteObj, ...prevNotes]);
      
      // Clear the input
      setNewNote("");
      
      toast({
        title: "Success",
        description: "Note added successfully",
      });
    } catch (error) {
      console.error("Error adding note:", error);
      toast({
        title: "Error",
        description: "Failed to add note",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted/30 rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Meeting Notes: {meetingName}</h2>
        
        {/* Add new note */}
        <div className="space-y-4">
          <Textarea
            placeholder="Add a note about this meeting..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="min-h-[100px]"
          />
          <div className="flex justify-end">
            <Button 
              onClick={handleAddNote} 
              disabled={!newNote.trim() || submitting}
            >
              {submitting ? "Adding..." : "Add Note"}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Notes list */}
      {notes.length === 0 ? (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium">No notes yet</h3>
          <p className="mt-1 text-sm text-gray-500">Add the first note for this meeting.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <Card key={note.id} className="bg-white">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="font-medium">{note.author_name}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    <time dateTime={note.created_at}>
                      {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </time>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{note.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MeetingNotesList;
