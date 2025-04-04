
import React from "react";
import { format } from "date-fns";
import { Calendar, ArrowLeft } from "lucide-react";
import { Meeting } from "@/types/project";
import { Button } from "@/components/ui/button";
import MeetingNotesList from "./MeetingNotesList";

interface MeetingDetailProps {
  meeting: Meeting;
  onBack: () => void;
}

const MeetingDetail = ({ meeting, onBack }: MeetingDetailProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" onClick={onBack} className="mr-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to meetings
        </Button>
      </div>
      
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold mb-2">{meeting.name}</h1>
        <div className="flex items-center text-muted-foreground mb-2">
          <Calendar className="mr-2 h-4 w-4" />
          {format(new Date(meeting.date), "EEEE, PPP 'at' p")}
        </div>
        {meeting.description && (
          <p className="mt-2 text-gray-600">{meeting.description}</p>
        )}
      </div>
      
      <MeetingNotesList 
        meetingId={meeting.id} 
        meetingName={meeting.name} 
      />
    </div>
  );
};

export default MeetingDetail;
