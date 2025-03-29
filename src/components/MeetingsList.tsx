
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import CreateMeetingDialog from "./CreateMeetingDialog";
import EditMeetingDialog from "./EditMeetingDialog";

interface Meeting {
  id: string;
  name: string;
  date: string;
  project_id: string;
  created_at: string;
  created_by: string;
  description?: string;
}

interface MeetingsListProps {
  projectId: string;
}

const MeetingsList = ({ projectId }: MeetingsListProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null);
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

  const handleCreateMeeting = () => {
    setShowCreateDialog(true);
  };

  const handleEditMeeting = (meeting: Meeting) => {
    setEditMeeting(meeting);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!user) return;
    
    try {
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

  // Separate meetings into upcoming and past
  const now = new Date();
  const upcomingMeetings = meetings
    .filter(meeting => new Date(meeting.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Earliest first
    
  const pastMeetings = meetings
    .filter(meeting => new Date(meeting.date) < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Most recent first

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[200px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Team Meetings</h2>
        <Button onClick={handleCreateMeeting}>
          <Plus className="mr-2 h-4 w-4" />
          Create Meeting
        </Button>
      </div>
      
      {meetings.length === 0 ? (
        <div className="text-center py-10">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium">No meetings scheduled</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new meeting.</p>
          <div className="mt-6">
            <Button onClick={handleCreateMeeting}>
              <Plus className="mr-2 h-4 w-4" />
              Create Meeting
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming Meetings */}
          <div className="border rounded-lg p-4 bg-green-50/20">
            <h3 className="text-lg font-medium mb-4 text-green-800">Upcoming Meetings</h3>
            {upcomingMeetings.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingMeetings.map((meeting) => (
                  <Card key={meeting.id}>
                    <CardHeader>
                      <CardTitle className="text-xl">{meeting.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground flex items-center mb-2">
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(new Date(meeting.date), "EEEE, PPP 'at' p")}
                      </div>
                      {meeting.description && (
                        <div className="mt-2 text-sm">
                          {meeting.description}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditMeeting(meeting)}
                        className="bg-blue-100 hover:bg-blue-200"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleDeleteMeeting(meeting.id)}
                        className="bg-red-400 hover:bg-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-5 bg-muted/20 rounded-lg">
                <p className="text-muted-foreground">No upcoming meetings</p>
              </div>
            )}
          </div>
          
          {/* Past Meetings */}
          <div className="border rounded-lg p-4 bg-red-50/10">
            <h3 className="text-lg font-medium mb-4 text-red-800">Past Meetings</h3>
            {pastMeetings.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pastMeetings.map((meeting) => (
                  <Card key={meeting.id} className="opacity-90">
                    <CardHeader>
                      <CardTitle className="text-xl">{meeting.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground flex items-center mb-2">
                        <Calendar className="mr-2 h-4 w-4" />
                        {format(new Date(meeting.date), "EEEE, PPP 'at' p")}
                      </div>
                      {meeting.description && (
                        <div className="mt-2 text-sm">
                          {meeting.description}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEditMeeting(meeting)}
                        className="bg-blue-100 hover:bg-blue-200"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => handleDeleteMeeting(meeting.id)}
                        className="bg-red-400 hover:bg-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-5 bg-muted/20 rounded-lg">
                <p className="text-muted-foreground">No past meetings</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      <CreateMeetingDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        projectId={projectId}
        onSuccess={refreshMeetings}
      />
      
      {editMeeting && (
        <EditMeetingDialog
          open={!!editMeeting}
          onClose={() => setEditMeeting(null)}
          meeting={editMeeting}
          onSuccess={refreshMeetings}
        />
      )}
    </div>
  );
};

export default MeetingsList;
