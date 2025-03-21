
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { inviteUserByEmail } from "@/lib/supabase/projects";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase/client";
import type { Profile } from "@/types/user";

interface InviteUserDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: () => void;
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
        console.log("Fetching profiles from database...");
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, avatar_url');
        
        if (error) {
          console.error("Error fetching profiles:", error);
          throw error;
        }
        
        // Transform the data to match our Profile interface
        const formattedProfiles = data.map(profile => ({
          id: profile.id,
          name: profile.name || 'Unnamed User',
          email: '', // We don't have email in the profiles table
          avatarUrl: profile.avatar_url
        }));
        
        setProfiles(formattedProfiles);
        console.log("Profiles loaded:", formattedProfiles);
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

    try {
      setIsSubmitting(true);
      
      // Since we don't have email in profiles table, we need to get it from auth.users
      // For now, we'll just use the user ID directly
      await inviteUserByEmail(projectId, selectedUserId);
      
      const selectedProfile = profiles.find(profile => profile.id === selectedUserId);
      
      toast({
        title: "Success",
        description: `User ${selectedProfile?.name || 'selected'} has been invited to the project`,
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
                  {profiles.length > 0 ? (
                    profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name || 'Unnamed User'}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-users" disabled>
                      No users available
                    </SelectItem>
                  )}
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
