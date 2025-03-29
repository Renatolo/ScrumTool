
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Meeting {
  id: string;
  name: string;
  date: string;
  project_id: string;
}

interface EditMeetingDialogProps {
  open: boolean;
  onClose: () => void;
  meeting: Meeting;
  onSuccess: () => void;
}

const EditMeetingDialog = ({
  open,
  onClose,
  meeting,
  onSuccess,
}: EditMeetingDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState(meeting.name);
  const [date, setDate] = useState<Date>(new Date(meeting.date));
  const [time, setTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const meetingDate = new Date(meeting.date);
    setDate(meetingDate);
    
    // Format time in HH:MM format
    const hours = meetingDate.getHours().toString().padStart(2, '0');
    const minutes = meetingDate.getMinutes().toString().padStart(2, '0');
    setTime(`${hours}:${minutes}`);
    
    setName(meeting.name);
  }, [meeting]);

  const handleUpdate = async () => {
    if (!user || !name.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      
      // Combine date and time
      const [hours, minutes] = time.split(":").map(Number);
      const meetingDateTime = new Date(date);
      meetingDateTime.setHours(hours, minutes);
      
      const { error } = await supabase
        .from("meetings")
        .update({
          name: name.trim(),
          date: meetingDateTime.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", meeting.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Meeting updated successfully",
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating meeting:", error);
      toast({
        title: "Error",
        description: "Failed to update meeting",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Meeting</DialogTitle>
          <DialogDescription>
            Update the meeting details.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Meeting Name</Label>
            <Input
              id="name"
              placeholder="Sprint Planning"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => newDate && setDate(newDate)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdate} 
            disabled={submitting || !name.trim()}
          >
            {submitting ? "Updating..." : "Update Meeting"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditMeetingDialog;
