
import React from "react";
import { Meeting } from "@/types/project";
import MeetingCard from "./MeetingCard";

interface MeetingsSectionProps {
  title: string;
  meetings: Meeting[];
  onEdit: (meeting: Meeting) => void;
  onDelete: (meetingId: string) => void;
  isPast?: boolean;
  className?: string;
}

const MeetingsSection = ({ 
  title, 
  meetings, 
  onEdit, 
  onDelete,
  isPast = false,
  className = ""
}: MeetingsSectionProps) => {
  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      <h3 className={`text-lg font-medium mb-4 ${isPast ? "text-red-800" : "text-green-800"}`}>{title}</h3>
      {meetings.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {meetings.map((meeting) => (
            <MeetingCard 
              key={meeting.id}
              meeting={meeting}
              onEdit={onEdit}
              onDelete={onDelete}
              isPast={isPast}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-5 bg-muted/20 rounded-lg">
          <p className="text-muted-foreground">No {isPast ? "past" : "upcoming"} meetings</p>
        </div>
      )}
    </div>
  );
};

export default MeetingsSection;
