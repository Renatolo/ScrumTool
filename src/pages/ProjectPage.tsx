import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Project, ProjectMember } from "@/types/user";
import { Sprint } from "@/types/sprint";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { fetchProjectById } from "@/lib/supabase/projects";
import { fetchProjectSprints, getActiveSprintForProject } from "@/lib/supabase/sprints";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Bell, 
  CalendarDays, 
  ClipboardList, 
  Code, 
  ExternalLink, 
  LineChart, 
  Plus, 
  Share2, 
  Sprout,
  Users,
  UserCog,
  UserPlus,
  LayoutDashboard,
  ArrowLeft
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";
import { format } from "date-fns";
import ProductBacklog from "@/components/ProductBacklog";
import CreateSprintDialog from "@/components/CreateSprintDialog";
import KanbanBoard from "@/components/KanbanBoard";
import BurndownChart from "@/components/BurndownChart";
import InviteUserDialog from "@/components/InviteUserDialog";
import EditMemberRoleDialog from "@/components/EditMemberRoleDialog";

const ProjectPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const kanbanBoardRef = useRef<{ refreshBoard: () => void }>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateSprintDialog, setShowCreateSprintDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editMember, setEditMember] = useState<ProjectMember | null>(null);

  useEffect(() => {
    if (!projectId || !user) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        const projectData = await fetchProjectById(projectId);
        if (!projectData) {
          toast({
            title: "Project not found",
            description: "The project you're looking for doesn't exist or you don't have access to it.",
            variant: "destructive",
          });
          navigate("/dashboard");
          return;
        }
        setProject(projectData);

        const memberIds = projectData.members || [];
        if (memberIds.length > 0) {
          const { data: memberProfiles } = await supabase
            .from('profiles')
            .select('id, name, avatar_url')
            .in('id', memberIds);
            
          if (memberProfiles) {
            const membersWithRoles = memberProfiles.map(profile => ({
              ...profile,
              role: projectData.member_roles && projectData.member_roles[profile.id] 
                ? projectData.member_roles[profile.id] 
                : "developer"
            }));
            setProjectMembers(membersWithRoles);
          }
        }
        
        const projectSprints = await fetchProjectSprints(projectId);
        setSprints(projectSprints);
        
        const currentActiveSprint = await getActiveSprintForProject(projectId);
        setActiveSprint(currentActiveSprint);
      } catch (error) {
        console.error("Error fetching project data:", error);
        toast({
          title: "Error",
          description: "Failed to load project data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, user, navigate, toast, refreshTrigger]);

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const handleCreateSprint = () => {
    setShowCreateSprintDialog(true);
  };

  const handleSprintCreated = (newSprint: Sprint) => {
    setSprints([...sprints, newSprint]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sprintStart = new Date(newSprint.startDate);
    sprintStart.setHours(0, 0, 0, 0);
    
    if (sprintStart.getTime() === today.getTime()) {
      setActiveSprint(newSprint);
    }
    setShowCreateSprintDialog(false);
  };

  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
    if (kanbanBoardRef.current) {
      kanbanBoardRef.current.refreshBoard();
    }
  };

  const handleInviteUser = () => {
    setShowInviteDialog(true);
  };
  
  const handleEditMemberRole = (member: ProjectMember) => {
    setEditMember(member);
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case "product_owner": return "Product Owner";
      case "scrum_master": return "Scrum Master";
      case "developer": return "Developer";
      default: return "Developer";
    }
  };
  
  const getRoleBadgeVariant = (role: string) => {
    switch(role) {
      case "product_owner": return "default";
      case "scrum_master": return "secondary";
      case "developer": return "outline";
      default: return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="outline" size="icon" onClick={handleGoToDashboard}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sprout className="h-8 w-8" />
              {project?.name}
            </h1>
          </div>
          <p className="text-muted-foreground">{project?.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleGoToDashboard}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <Button variant="outline" onClick={handleInviteUser}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
          <Button onClick={handleCreateSprint}>
            <Plus className="mr-2 h-4 w-4" />
            Create Sprint
          </Button>
        </div>
      </div>
      
      {activeSprint && (
        <Card className="mb-6 border-green-600/20 bg-green-50/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex justify-between items-center">
              <div className="flex items-center">
                <Bell className="mr-2 h-5 w-5 text-green-600" />
                Active Sprint: {activeSprint.name}
              </div>
              <Badge className="bg-green-600">
                <CalendarDays className="mr-2 h-4 w-4" />
                {format(new Date(activeSprint.startDate), "MMM d")} - {format(new Date(activeSprint.endDate), "MMM d")}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardFooter className="pt-2">
            <Button variant="outline" className="w-full" onClick={() => navigate(`/sprint/${activeSprint.id}`)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View Sprint Details
            </Button>
          </CardFooter>
        </Card>
      )}
      
      <BurndownChart projectId={projectId || ""} projectName={project?.name || ""} />
      
      <Tabs defaultValue="backlog" className="space-y-4">
        <TabsList>
          <TabsTrigger value="backlog" className="flex items-center">
            <ClipboardList className="mr-2 h-4 w-4" />
            Product Backlog
          </TabsTrigger>
          {activeSprint && (
            <TabsTrigger value="sprint-board" className="flex items-center">
              <Code className="mr-2 h-4 w-4" />
              Sprint Board
            </TabsTrigger>
          )}
          {sprints.length > 0 && (
            <TabsTrigger value="sprints" className="flex items-center">
              <LineChart className="mr-2 h-4 w-4" />
              All Sprints
            </TabsTrigger>
          )}
          <TabsTrigger value="team" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Team Members
          </TabsTrigger>
        </TabsList>
        <TabsContent value="backlog" className="space-y-4">
          <ProductBacklog 
            projectId={projectId || ""} 
            onRefresh={refreshData}
            activeSprint={activeSprint}
          />
        </TabsContent>
        {activeSprint && (
          <TabsContent value="sprint-board">
            <KanbanBoard sprintId={activeSprint.id} ref={kanbanBoardRef} />
          </TabsContent>
        )}
        <TabsContent value="sprints">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sprints.map(sprint => (
              <Card key={sprint.id} className={`cursor-pointer hover:border-primary transition-colors ${
                sprint.id === activeSprint?.id ? 'border-green-600 bg-green-50/10' : ''
              }`} onClick={() => navigate(`/sprint/${sprint.id}`)}>
                <CardHeader>
                  <CardTitle className="flex justify-between">
                    <span>{sprint.name}</span>
                    {sprint.id === activeSprint?.id && (
                      <Badge variant="default" className="bg-green-600">Active</Badge>
                    )}
                  </CardTitle>
                  <div className="text-sm text-muted-foreground flex items-center">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {format(new Date(sprint.startDate), "MMM d")} - {format(new Date(sprint.endDate), "MMM d")}
                  </div>
                </CardHeader>
                <CardFooter>
                  <Button variant="outline" className="w-full">
                    View Sprint
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="team">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projectMembers.map(member => (
                <Card key={member.id}>
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarImage src={member.avatar_url} alt={member.name} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{member.name}</CardTitle>
                        <Badge variant={getRoleBadgeVariant(member.role || "developer")}>
                          {getRoleLabel(member.role || "developer")}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardFooter>
                    {project?.members?.includes(user?.id || "") && (
                      <Button variant="outline" className="w-full" onClick={() => handleEditMemberRole(member)}>
                        <UserCog className="mr-2 h-4 w-4" />
                        Change Role
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <CreateSprintDialog
        open={showCreateSprintDialog}
        onClose={() => setShowCreateSprintDialog(false)}
        onCreateSprint={handleSprintCreated}
        projectId={projectId || ""}
        hasActiveSprint={!!activeSprint}
        activeSprintId={activeSprint?.id}
        existingSprints={sprints}
      />
      
      <InviteUserDialog
        open={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        projectId={projectId || ""}
        onSuccess={refreshData}
      />
      
      {editMember && (
        <EditMemberRoleDialog
          open={!!editMember}
          onClose={() => setEditMember(null)}
          projectId={projectId || ""}
          member={editMember}
          onSuccess={refreshData}
        />
      )}
    </div>
  );
};

export default ProjectPage;
