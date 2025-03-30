
import { useState } from "react";
import { useFetchProjectMembers } from "@/hooks/useFetchProjectMembers";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Edit2 } from "lucide-react";
import InviteUserDialog from "./InviteUserDialog";
import EditMemberRoleDialog from "./EditMemberRoleDialog";
import { Project } from "@/types/project";

interface TeamMembersProps {
  projectId: string;
  project: Project;
  currentUserId: string;
  onMemberAdded: () => void;
}

const TeamMembers = ({ projectId, project, currentUserId, onMemberAdded }: TeamMembersProps) => {
  const { members, loading, refreshMembers } = useFetchProjectMembers(projectId);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showEditRoleDialog, setShowEditRoleDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{id: string, name: string, role?: string}| null>(null);

  const handleEditRole = (member: {id: string, name: string, role?: string}) => {
    setSelectedMember(member);
    setShowEditRoleDialog(true);
  };

  const handleMemberAdded = () => {
    refreshMembers();
    onMemberAdded();
  };

  const handleRoleUpdated = () => {
    refreshMembers();
    onMemberAdded();
    setShowEditRoleDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Team Members</h2>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center p-4 border rounded-lg animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full mr-4"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <p className="text-muted-foreground mb-4">No team members found</p>
            <Button variant="outline" onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <Card key={member.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.avatar_url || ""} alt={member.name} />
                    <AvatarFallback>
                      {member.name?.substring(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {member.role || "Developer"}
                    </p>
                  </div>
                  {member.id !== project.user_id && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEditRole(member)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InviteUserDialog
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        projectId={projectId}
        onSuccess={handleMemberAdded}
      />

      {selectedMember && (
        <EditMemberRoleDialog
          open={showEditRoleDialog}
          onClose={() => setShowEditRoleDialog(false)}
          member={selectedMember}
          projectId={projectId}
          onSuccess={handleRoleUpdated}
        />
      )}
    </div>
  );
};

export default TeamMembers;
