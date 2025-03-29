
import { useState } from "react";
import { Meeting } from "@/types/project";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";
import CreateMeetingDialog from "./CreateMeetingDialog";
import EditMeetingDialog from "./EditMeetingDialog";
import MeetingsSection from "./meetings/MeetingsSection";
import { useMeetings } from "@/hooks/useMeetings";

interface MeetingsListProps {
  projectId: string;
}

const MeetingsList = ({ projectId }: MeetingsListProps) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null);
  const { loading, upcomingMeetings, pastMeetings, deleteMeeting, refreshMeetings } = useMeetings(projectId);

  const handleCreateMeeting = () => {
    setShowCreateDialog(true);
  };

  const handleEditMeeting = (meeting: Meeting) => {
    setEditMeeting(meeting);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[200px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const allMeetingsEmpty = upcomingMeetings.length === 0 && pastMeetings.length === 0;

  return (
    <div className="space-y-4">
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
        <div className="space-y-8">
          {/* Upcoming Meetings */}
          <MeetingsSection
            title="Upcoming Meetings"
            meetings={upcomingMeetings}
            onEdit={handleEditMeeting}
            onDelete={deleteMeeting}
            className="bg-green-50/20"
          />
          
          {/* Past Meetings */}
          <MeetingsSection
            title="Past Meetings"
            meetings={pastMeetings}
            onEdit={handleEditMeeting}
            onDelete={deleteMeeting}
            isPast={true}
            className="bg-red-50/10"
          />
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
