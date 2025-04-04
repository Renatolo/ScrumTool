import { useState } from "react";
import { Meeting } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import CreateMeetingDialog from "./CreateMeetingDialog";
import EditMeetingDialog from "./EditMeetingDialog";
import MeetingsSection from "./meetings/MeetingsSection";
import PaginatedMeetingsSection from "./meetings/PaginatedMeetingsSection";
import MeetingDetail from "./meetings/MeetingDetail";
import { useMeetings } from "@/hooks/useMeetings";

interface MeetingsListProps {
  projectId: string;
  isTab?: boolean;
  onViewMeetingInTab?: (meeting: Meeting) => void;
}

const MeetingsList = ({ projectId, isTab = false, onViewMeetingInTab }: MeetingsListProps) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const { loading, upcomingMeetings, pastMeetings, deleteMeeting, refreshMeetings } = useMeetings(projectId);

  const handleCreateMeeting = () => {
    setShowCreateDialog(true);
  };

  const handleEditMeeting = (meeting: Meeting) => {
    setEditMeeting(meeting);
  };

  const handleViewMeeting = (meeting: Meeting) => {
    // If we're in the tab view, display the detail directly
    if (isTab) {
      setSelectedMeeting(meeting);
    } else {
      // If we're in the overview, redirect to the meetings tab
      if (onViewMeetingInTab) {
        onViewMeetingInTab(meeting);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[200px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // If a meeting is selected, show its details
  if (selectedMeeting && isTab) {
    return (
      <MeetingDetail
        meeting={selectedMeeting}
        onBack={() => setSelectedMeeting(null)}
      />
    );
  }

  const allMeetingsEmpty = upcomingMeetings.length === 0 && pastMeetings.length === 0;

  // Get the next meeting (for overview)
  const nextMeeting = upcomingMeetings.length > 0 ? upcomingMeetings[0] : null;
  const hasUpcomingMeetingSoon = nextMeeting && 
    (new Date(nextMeeting.date).getTime() - new Date().getTime()) < 1000 * 60 * 60 * 24; // 24 hours

  // If not in tab mode, just show the overview content
  if (!isTab) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Today's Meetings</h2>
          {/* Create button removed from overview */}
        </div>
        
        {allMeetingsEmpty ? (
          <div className="text-center py-10">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium">No meetings scheduled for today</h3>
            <p className="mt-1 text-sm text-gray-500">Check the Meetings tab to see all meetings.</p>
          </div>
        ) : (
          <div>
            {hasUpcomingMeetingSoon && nextMeeting && (
              <div className="p-4 border rounded-lg bg-primary/10 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-primary mr-2" />
                      <span className="text-sm font-medium text-primary">Upcoming Meeting</span>
                    </div>
                    <h3 className="text-lg font-medium mt-1">{nextMeeting.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(nextMeeting.date), "EEEE, PPP 'at' p")}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => handleViewMeeting(nextMeeting)}>
                    View Details
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Keep existing dialogs */}
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
  }

  // Tab view for the dedicated meetings page
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Team Meetings</h2>
        <Button onClick={handleCreateMeeting}>
          <Plus className="mr-2 h-4 w-4" />
          Create Meeting
        </Button>
      </div>
      
      {allMeetingsEmpty ? (
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
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger 
              value="upcoming"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Upcoming Meetings
            </TabsTrigger>
            <TabsTrigger 
              value="past"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Past Meetings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming">
            <div className="pt-4">
              <MeetingsSection
                title="Upcoming Meetings"
                meetings={upcomingMeetings}
                onEdit={handleEditMeeting}
                onDelete={deleteMeeting}
                onView={handleViewMeeting}
                className="bg-green-50/20"
                showViewButton
              />
            </div>
          </TabsContent>
          
          <TabsContent value="past">
            <div className="pt-4">
              <PaginatedMeetingsSection
                title="Past Meetings"
                meetings={pastMeetings}
                onEdit={handleEditMeeting}
                onDelete={deleteMeeting}
                onView={handleViewMeeting}
                className="bg-red-50/10"
                itemsPerPage={5}
                showViewButton
              />
            </div>
          </TabsContent>
        </Tabs>
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
