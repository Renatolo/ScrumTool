
import React from "react";
import { Meeting } from "@/types/project";
import MeetingCard from "../meetings/MeetingCard";

interface MeetingsSectionProps {
  title: string;
  meetings: Meeting[];
  onEdit: (meeting: Meeting) => void;
  onDelete: (meetingId: string) => void;
  onView?: (meeting: Meeting) => void;
  className?: string;
  isPast?: boolean;
  showViewButton?: boolean;
}

const MeetingsSection = ({
  title,
  meetings,
  onEdit,
  onDelete,
  onView,
  className = "",
  isPast = false,
  showViewButton = false
}: MeetingsSectionProps) => {
  if (meetings.length === 0) {
    return null;
  }

  return (
    <div className={`rounded-md ${className}`}>
      <h3 className="text-lg font-medium mb-4">{title}</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {meetings.map((meeting) => (
          <MeetingCard
            key={meeting.id}
            meeting={meeting}
            onEdit={onEdit}
            onDelete={onDelete}
            onView={onView}
            isPast={isPast}
            showViewButton={showViewButton}
          />
        ))}
      </div>
    </div>
  );
};

export default MeetingsSection;
