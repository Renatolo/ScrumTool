
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { inviteUserByEmail } from "@/lib/supabase/projects";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface InviteUserDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: () => void;
}

interface Profile {
  id: string;
  name: string;
  email: string;
}

const InviteUserDialog = ({
  open,
  onClose,
  projectId,
  onSuccess
}: InviteUserDialogProps) => {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfiles = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email');
        
        if (error) throw error;
        
        setProfiles(data as Profile[] || []);
      } catch (error) {
        console.error("Error fetching profiles:", error);
        setError("Failed to load user profiles");
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchProfiles();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedUserId) {
      setError("Please select a user");
      return;
    }

    const selectedProfile = profiles.find(profile => profile.id === selectedUserId);
    if (!selectedProfile || !selectedProfile.email) {
      setError("Invalid user selection");
      return;
    }

    try {
      setIsSubmitting(true);
      await inviteUserByEmail(projectId, selectedProfile.email.trim());
      
      toast({
        title: "Success",
        description: `Invitation sent to ${selectedProfile.name || selectedProfile.email}`,
      });
      
      // Reset form and close dialog
      setSelectedUserId("");
      onClose();
      onSuccess();
    } catch (error) {
      console.error("Error inviting user:", error);
      setError(error instanceof Error ? error.message : "Failed to invite user. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUserChange = (value: string) => {
    setSelectedUserId(value);
    if (error) setError("");
  };

  const handleCloseDialog = () => {
    setSelectedUserId("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleCloseDialog}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Select a user to invite to this project.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user">Select User</Label>
            {isLoading ? (
              <div className="h-10 bg-muted/50 rounded-md flex items-center justify-center">
                <span className="text-sm text-muted-foreground">Loading users...</span>
              </div>
            ) : (
              <Select value={selectedUserId} onValueChange={handleUserChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.name || profile.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleCloseDialog} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUserDialog;
