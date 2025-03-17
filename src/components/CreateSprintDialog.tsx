
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sprint } from "@/types/sprint";
import { useAuth } from "@/contexts/AuthContext";
import { createSprint, fetchProjectSprints } from "@/lib/supabase/sprints";
import { useToast } from "@/hooks/use-toast";

interface CreateSprintDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateSprint: (sprint: Sprint) => void;
  projectId: string;
  hasActiveSprint?: boolean;
  activeSprintId?: string;
  existingSprints?: Sprint[];
}

const CreateSprintDialog = ({ 
  open, 
  onClose, 
  onCreateSprint, 
  projectId, 
  hasActiveSprint = false,
  activeSprintId = '',
  existingSprints = []
}: CreateSprintDialogProps) => {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateError, setDateError] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const validateDates = async () => {
    setDateError("");

    if (!startDate || !endDate) {
      setDateError("Both start and end dates are required");
      return false;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to beginning of today

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setDateError("Invalid date format");
      return false;
    }

    // Check for existing sprints with the same start date
    if (existingSprints.length > 0) {
      const existingStartDates = existingSprints.map(sprint => {
        const sprintStartDate = new Date(sprint.startDate);
        sprintStartDate.setHours(0, 0, 0, 0);
        return sprintStartDate.getTime();
      });

      start.setHours(0, 0, 0, 0);
      if (existingStartDates.includes(start.getTime())) {
        setDateError("A sprint with this start date already exists");
        return false;
      }
    }

    if (end < start) {
      setDateError("End date must be after start date");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!await validateDates()) {
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a sprint",
        variant: "destructive",
      });
      return;
    }

    // Create sprint directly without confirmation
    await createNewSprint();
  };

  const createNewSprint = async () => {
    try {
      setIsSubmitting(true);

      // Determine if this is a current sprint (starts today) or future sprint
      const start = new Date(startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);
      
      const isCurrent = start.getTime() === today.getTime();

      const newSprintData = {
        name,
        startDate,
        endDate,
        userId: user!.id,
        projectId,
        tasks: []
      };

      console.log('Creating new sprint with data:', newSprintData);
      console.log('Is current sprint:', isCurrent);

      // Only delete existing active sprint if this is a current sprint
      const newSprint = await createSprint(newSprintData, isCurrent);

      // Notify parent component of new sprint
      onCreateSprint(newSprint);

      // Reset form
      setName("");
      setStartDate("");
      setEndDate("");

      // Close dialog
      onClose();

      toast({
        title: "Success",
        description: isCurrent && hasActiveSprint 
          ? "Previous sprint replaced with new sprint" 
          : `Sprint "${name}" created successfully`
      });
    } catch (error) {
      console.error("Error creating sprint:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create sprint. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseDialog = () => {
    // Reset the form state
    setName("");
    setStartDate("");
    setEndDate("");
    setDateError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCloseDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Sprint</DialogTitle>
          <DialogDescription>
            Add a new sprint to your project. Enter the details below.
            {hasActiveSprint && (
              <p className="mt-2 text-orange-500">
                Note: Creating a sprint with today's start date will replace the current active sprint.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Sprint Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter sprint name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
            {dateError && (
              <p className="text-sm text-destructive mt-1">{dateError}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Sprint"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSprintDialog;
