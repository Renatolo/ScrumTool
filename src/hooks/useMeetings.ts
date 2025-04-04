
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Meeting } from "@/types/project";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export const useMeetings = (projectId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchMeetings = async () => {
      if (!projectId) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("meetings")
          .select("*")
          .eq("project_id", projectId)
          .order("date", { ascending: true });
          
        if (error) throw error;
        setMeetings(data || []);
      } catch (error) {
        console.error("Error fetching meetings:", error);
        toast({
          title: "Error",
          description: "Failed to load meetings data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, [projectId, toast, refreshTrigger]);

  const deleteMeeting = async (meetingId: string) => {
    if (!user) return;
    
    try {
      // First check if there are any notes for this meeting
      const { count, error: countError } = await supabase
        .from("meeting_notes")
        .select("*", { count: "exact", head: true })
        .eq("meeting_id", meetingId);
        
      if (countError) throw countError;
      
      // If there are notes, delete them first
      if (count && count > 0) {
        const { error: deleteNotesError } = await supabase
          .from("meeting_notes")
          .delete()
          .eq("meeting_id", meetingId);
          
        if (deleteNotesError) throw deleteNotesError;
      }
      
      // Then delete the meeting
      const { error } = await supabase
        .from("meetings")
        .delete()
        .eq("id", meetingId);
        
      if (error) throw error;
      
      setMeetings(prevMeetings => prevMeetings.filter(meeting => meeting.id !== meetingId));
      toast({
        title: "Success",
        description: "Meeting deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting meeting:", error);
      toast({
        title: "Error",
        description: "Failed to delete meeting",
        variant: "destructive",
      });
    }
  };

  const refreshMeetings = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Format meeting date for display
  const formatMeetingDate = (date: string) => {
    return format(new Date(date), "PPP 'at' p");
  };

  // Separate meetings into upcoming and past
  const now = new Date();
  const upcomingMeetings = meetings
    .filter(meeting => new Date(meeting.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Earliest first
    
  const pastMeetings = meetings
    .filter(meeting => new Date(meeting.date) < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Most recent first

  return {
    loading,
    upcomingMeetings,
    pastMeetings,
    deleteMeeting,
    refreshMeetings,
    formatMeetingDate
  };
};
