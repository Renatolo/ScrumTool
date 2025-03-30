
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchProject, fetchActiveProjectSprint } from "@/lib/supabase/projects";
import { fetchProjectSprints } from "@/lib/supabase/sprints";
import { Sprint } from "@/types/sprint";
import { Project } from "@/types/project";
import CreateSprintDialog from "@/components/CreateSprintDialog";
import KanbanBoard from "@/components/KanbanBoard";
import ProductBacklog from "@/components/ProductBacklog";
import MeetingsList from "@/components/MeetingsList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarPlus, Users } from "lucide-react";
import InviteUserDialog from "@/components/InviteUserDialog";
import { ProjectMember, useFetchProjectMembers } from "@/hooks/useFetchProjectMembers";
import EditMemberRoleDialog from "@/components/EditMemberRoleDialog";
import BurndownChart from "@/components/BurndownChart";
import SprintsList from "@/components/SprintsList";

const ProjectPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { toast } = useToast();
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [allSprints, setAllSprints] = useState<Sprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("overview");
  const [selectedMember, setSelectedMember] = useState<ProjectMember | null>(null);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const kanbanBoardRef = useRef<{ refreshBoard: () => void } | null>(null);

  const { members, loading: loadingMembers, refreshMembers } = useFetchProjectMembers(projectId || "");
  
  useEffect(() => {
    if (!projectId) return;
    
    const loadProject = async () => {
      try {
        const project = await fetchProject(projectId);
        if (!project) {
          toast({
            title: "Project not found",
            description: "The project you requested does not exist",
            variant: "destructive",
          });
          navigate("/dashboard");
          return;
        }
        
        setProject(project);
        
        // Load active sprint
        const activeSprint = await fetchActiveProjectSprint(projectId);
        setActiveSprint(activeSprint);
        
        // Load all sprints
        const sprints = await fetchProjectSprints(projectId);
        setAllSprints(sprints);
        
      } catch (error) {
        console.error("Error loading project:", error);
        toast({
          title: "Error",
          description: "Failed to load project data",
          variant: "destructive",
        });
      }
    };
    
    loadProject();
  }, [projectId, navigate]);
  
  if (!user) {
    return <div>Loading...</div>;
  }
  
  const handleCreateSprint = async (sprint: Sprint) => {
    try {
      setAllSprints((prev) => [...prev, sprint]);
      
      // If this is the active sprint, update the active sprint state
      const today = new Date();
      const sprintStart = new Date(sprint.startDate);
      const sprintEnd = new Date(sprint.endDate);
      
      if (sprintStart <= today && sprintEnd >= today) {
        setActiveSprint(sprint);
      }
      
      toast({
        title: "Sprint created",
        description: `Sprint "${sprint.name}" has been created`,
      });
      
      // Close the dialog
      setShowCreateSprint(false);
    } catch (error) {
      console.error("Error creating sprint:", error);
      toast({
        title: "Error",
        description: "Failed to create sprint",
        variant: "destructive",
      });
    }
  };

  const handleEditMemberRole = (member: ProjectMember) => {
    setSelectedMember(member);
    setIsEditRoleDialogOpen(true);
  };
  
  const refreshProjectData = async () => {
    if (!projectId) return;
    
    setIsRefreshing(true);
    try {
      // Refresh active sprint
      const activeSprint = await fetchActiveProjectSprint(projectId);
      setActiveSprint(activeSprint);
      
      // Refresh all sprints
      const sprints = await fetchProjectSprints(projectId);
      setAllSprints(sprints);
      
      // Refresh kanban board if available
      if (kanbanBoardRef.current && activeSprint) {
        kanbanBoardRef.current.refreshBoard();
      }
    } catch (error) {
      console.error("Error refreshing project data:", error);
      toast({
        title: "Error",
        description: "Failed to refresh project data",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  if (!project) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">{project.description}</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setIsInviteDialogOpen(true)}
            variant="outline"
            className="hidden sm:flex"
          >
            <Users className="mr-2 h-4 w-4" />
            Add Member
          </Button>
          <Button onClick={() => setShowCreateSprint(true)}>
            <CalendarPlus className="mr-2 h-4 w-4" />
            Create Sprint
          </Button>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Project Overview</TabsTrigger>
          {activeSprint && <TabsTrigger value="sprint">Active Sprint</TabsTrigger>}
          <TabsTrigger value="backlog">Product Backlog</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 gap-6">
            {/* Burndown chart */}
            <BurndownChart projectId={projectId || ""} projectName={project.name} />
            
            {/* All Sprints section - Using our new component */}
            <SprintsList 
              projectId={projectId || ""} 
              onCreateClick={() => setShowCreateSprint(true)} 
            />
          </div>
        </TabsContent>

        {activeSprint && (
          <TabsContent value="sprint">
            <div className="mb-4">
              <h2 className="text-2xl font-bold mb-2">{activeSprint.name}</h2>
            </div>
            <KanbanBoard 
              sprintId={activeSprint.id} 
              ref={kanbanBoardRef} 
            />
          </TabsContent>
        )}

        <TabsContent value="backlog">
          <ProductBacklog 
            projectId={projectId || ""} 
            onRefresh={refreshProjectData} 
            activeSprint={activeSprint}
          />
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Team Members</CardTitle>
                <Button onClick={() => setIsInviteDialogOpen(true)}>Add Member</Button>
              </div>
              <CardDescription>Manage your project team members and their roles</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {loadingMembers ? (
                  <div className="h-40 flex items-center justify-center">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {members.map((member) => (
                      <Card key={member.id} className="bg-secondary/30 border">
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-full overflow-hidden bg-muted">
                              {member.avatar_url ? (
                                <img
                                  src={member.avatar_url}
                                  alt={member.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                                  {member.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{member.name}</p>
                              <div className="flex items-center">
                                <span className="text-sm text-muted-foreground">
                                  {member.role ? (
                                    <span className="capitalize">{member.role.replace('_', ' ')}</span>
                                  ) : (
                                    "Developer"
                                  )}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-auto ml-2 text-xs hover:bg-muted p-1"
                                  onClick={() => handleEditMemberRole(member)}
                                >
                                  Edit Role
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {members.length === 0 && (
                      <div className="col-span-full py-8 text-center">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <h3 className="text-lg font-medium">No team members yet</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Add team members to collaborate on this project
                        </p>
                        <Button onClick={() => setIsInviteDialogOpen(true)} className="mt-4">
                          Add Team Member
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings">
          <MeetingsList projectId={projectId || ""} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateSprintDialog
        open={showCreateSprint}
        onClose={() => setShowCreateSprint(false)}
        onCreateSprint={handleCreateSprint}
        projectId={projectId || ""}
        hasActiveSprint={!!activeSprint}
        activeSprintId={activeSprint?.id}
        existingSprints={allSprints}
      />
      
      <InviteUserDialog
        open={isInviteDialogOpen}
        onClose={() => setIsInviteDialogOpen(false)}
        projectId={projectId || ""}
        onSuccess={() => {
          refreshMembers();
        }}
      />
      
      {selectedMember && (
        <EditMemberRoleDialog
          open={isEditRoleDialogOpen}
          onClose={() => setIsEditRoleDialogOpen(false)}
          projectId={projectId || ""}
          member={selectedMember}
          onSuccess={() => {
            refreshMembers();
            setIsEditRoleDialogOpen(false);
            setSelectedMember(null);
          }}
        />
      )}
    </div>
  );
};

export default ProjectPage;
