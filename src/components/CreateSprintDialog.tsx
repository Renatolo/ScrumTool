
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sprint } from "@/types/sprint";
import { useAuth } from "@/contexts/AuthContext";
import { createSprint } from "@/lib/supabase/sprints";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface CreateSprintDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateSprint: (sprint: Sprint) => void;
  projectId: string;
  hasActiveSprint?: boolean;
  activeSprintId?: string;
}

const CreateSprintDialog = ({ 
  open, 
  onClose, 
  onCreateSprint, 
  projectId, 
  hasActiveSprint = false,
  activeSprintId = ''
}: CreateSprintDialogProps) => {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [dateError, setDateError] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  const validateDates = () => {
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
    
    if (start < today) {
      setDateError("Start date must be today or a future date");
      return false;
    }
    
    if (end < start) {
      setDateError("End date must be after start date");
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateDates()) {
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
    
    // If there's an active sprint, show the confirmation dialog
    if (hasActiveSprint) {
      setShowConfirmDialog(true);
      return;
    }
    
    // If no active sprint, create the sprint directly
    await createNewSprint();
  };

  const createNewSprint = async () => {
    try {
      setIsSubmitting(true);
      
      const newSprintData = {
        name,
        startDate,
        endDate,
        userId: user!.id,
        projectId,
        tasks: []
      };
      
      console.log('Creating new sprint with data:', newSprintData);
      
      // We don't need separate logic for replacing sprints anymore
      // since createSprint now handles the deletion of existing sprints
      const newSprint = await createSprint(newSprintData);
      
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
        description: hasActiveSprint 
          ? "Previous sprint replaced successfully" 
          : "Sprint created successfully",
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
      // Make sure to close the confirmation dialog too
      setShowConfirmDialog(false);
    }
  };

  const handleCloseDialog = () => {
    // Reset the form state
    setName("");
    setStartDate("");
    setEndDate("");
    setDateError("");
    setShowConfirmDialog(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Sprint</DialogTitle>
            <DialogDescription>
              Add a new sprint to your project. Enter the details below.
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

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Active Sprint?</AlertDialogTitle>
            <AlertDialogDescription>
              There is already an active sprint for this project. Creating a new sprint will replace the current one as the active sprint. The current sprint will be deleted. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={createNewSprint}>
              Replace Current Sprint
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CreateSprintDialog;
