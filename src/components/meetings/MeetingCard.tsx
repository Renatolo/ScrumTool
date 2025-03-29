
import React from "react";
import { format } from "date-fns";
import { Calendar, Edit, Trash2 } from "lucide-react";
import { Meeting } from "@/types/project";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MeetingCardProps {
  meeting: Meeting;
  onEdit: (meeting: Meeting) => void;
  onDelete: (meetingId: string) => void;
  isPast?: boolean;
}

const MeetingCard = ({ meeting, onEdit, onDelete, isPast = false }: MeetingCardProps) => {
  return (
    <Card key={meeting.id} className={isPast ? "opacity-90" : ""}>
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
          onClick={() => onEdit(meeting)}
          className="bg-blue-100 hover:bg-blue-200"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={() => onDelete(meeting.id)}
          className="bg-red-400 hover:bg-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MeetingCard;
