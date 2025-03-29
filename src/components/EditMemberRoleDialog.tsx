
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { ProjectMember } from "@/types/user";

interface EditMemberRoleDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  member: ProjectMember;
  onSuccess: () => void;
}

const EditMemberRoleDialog = ({
  open,
  onClose,
  projectId,
  member,
  onSuccess
}: EditMemberRoleDialogProps) => {
  const [selectedRole, setSelectedRole] = useState<string>(member.role || "developer");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !projectId || !member) return;
    
    try {
      setIsSubmitting(true);
      
      // Fetch the current project data
      const { data: projectData, error: fetchError } = await supabase
        .from('projects')
        .select('members, member_roles')
        .eq('id', projectId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Initialize or update the member_roles object
      const memberRoles = projectData.member_roles || {};
      memberRoles[member.id] = selectedRole;
      
      // Update the project with the new member role
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          member_roles: memberRoles
        })
        .eq('id', projectId);
      
      if (updateError) throw updateError;
      
      toast({
        title: "Success",
        description: `${member.name}'s role updated to ${selectedRole}`,
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating member role:", error);
      toast({
        title: "Error",
        description: "Failed to update member role",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Member Role</DialogTitle>
          <DialogDescription>
            Change the role for {member.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <Label>Select Role</Label>
            <RadioGroup value={selectedRole} onValueChange={setSelectedRole}>
              <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-accent/50">
                <RadioGroupItem value="product_owner" id="product_owner" />
                <Label htmlFor="product_owner" className="flex-1">
                  <div className="font-medium">Product Owner</div>
                  <div className="text-xs text-muted-foreground">Manages the product backlog and prioritizes work</div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-accent/50">
                <RadioGroupItem value="scrum_master" id="scrum_master" />
                <Label htmlFor="scrum_master" className="flex-1">
                  <div className="font-medium">Scrum Master</div>
                  <div className="text-xs text-muted-foreground">Facilitates the scrum process and removes impediments</div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 border p-3 rounded-md hover:bg-accent/50">
                <RadioGroupItem value="developer" id="developer" />
                <Label htmlFor="developer" className="flex-1">
                  <div className="font-medium">Developer</div>
                  <div className="text-xs text-muted-foreground">Team member who works on implementing features</div>
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Role"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemberRoleDialog;
