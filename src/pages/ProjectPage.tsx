
import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Project } from "@/types/project";
import { Sprint } from "@/types/sprint";
import { fetchProjectById } from "@/lib/supabase/projects";
import { fetchProjectSprints, getActiveSprintForProject } from "@/lib/supabase/sprints";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Plus,
  Users,
  Calendar,
  ListChecks,
  LineChart,
} from "lucide-react";
import CreateSprintDialog from "@/components/CreateSprintDialog";
import ProductBacklog from "@/components/ProductBacklog";
import BurndownChart from "@/components/BurndownChart";
import MeetingsList from "@/components/MeetingsList";
import TeamMembers from "@/components/TeamMembers";
import SprintList from "@/components/SprintList";

const ProjectPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isLoadingSprints, setIsLoadingSprints] = useState(true);
  const [showCreateSprintDialog, setShowCreateSprintDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!projectId || !user) return;
    
    const fetchProject = async () => {
      try {
        setIsLoadingProject(true);
        const data = await fetchProjectById(projectId);
        setProject(data as Project);
      } catch (error) {
        console.error("Error fetching project:", error);
        toast({
          title: "Error",
          description: "Failed to load project details",
          variant: "destructive",
        });
      } finally {
        setIsLoadingProject(false);
      }
    };

    fetchProject();
  }, [projectId, user]);

  useEffect(() => {
    if (!projectId || !user) return;
    
    const fetchSprints = async () => {
      try {
        setIsLoadingSprints(true);
        const sprintsList = await fetchProjectSprints(projectId);
        setSprints(sprintsList);
        
        // Fetch active sprint
        const active = await getActiveSprintForProject(projectId);
        setActiveSprint(active);
      } catch (error) {
        console.error("Error fetching sprints:", error);
        toast({
          title: "Error",
          description: "Failed to load sprints",
          variant: "destructive",
        });
      } finally {
        setIsLoadingSprints(false);
      }
    };

    fetchSprints();
  }, [projectId, user]);

  const handleCreateSprint = (sprint: Sprint) => {
    setSprints((prev) => [...prev, sprint]);
    if (sprint.startDate === new Date().toISOString().split("T")[0]) {
      setActiveSprint(sprint);
    }
  };

  const refreshProject = async () => {
    if (!projectId || !user) return;
    
    try {
      const data = await fetchProjectById(projectId);
      setProject(data as Project);
      
      const sprintsList = await fetchProjectSprints(projectId);
      setSprints(sprintsList);
      
      const active = await getActiveSprintForProject(projectId);
      setActiveSprint(active);
    } catch (error) {
      console.error("Error refreshing project:", error);
    }
  };

  if (isLoadingProject) {
    return (
      <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto py-8 flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
        <p className="mb-6">The project you're looking for doesn't exist or you don't have access to it.</p>
        <Button asChild>
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <div className="flex items-center mb-2">
            <Button
              variant="ghost"
              size="sm"
              className="mr-2"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </div>
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground mt-1">{project.description}</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          <Button
            onClick={() => setShowCreateSprintDialog(true)}
            className="whitespace-nowrap"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Sprint
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <LineChart className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="sprints">
            <Calendar className="h-4 w-4 mr-2" />
            Sprints
          </TabsTrigger>
          <TabsTrigger value="backlog">
            <ListChecks className="h-4 w-4 mr-2" />
            Product Backlog
          </TabsTrigger>
          <TabsTrigger value="team">
            <Users className="h-4 w-4 mr-2" />
            Team
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="space-y-6">
            <BurndownChart projectId={projectId!} projectName={project.name} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Current Sprint</h2>
                {activeSprint ? (
                  <div className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer" onClick={() => navigate(`/sprint/${activeSprint.id}`)}>
                    <h3 className="text-lg font-medium">{activeSprint.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(activeSprint.startDate).toLocaleDateString()} - {new Date(activeSprint.endDate).toLocaleDateString()}
                    </p>
                    <Button className="mt-4" size="sm">View Sprint</Button>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 flex flex-col items-center justify-center h-40 border-dashed">
                    <p className="text-muted-foreground mb-4">No active sprint</p>
                    <Button onClick={() => setShowCreateSprintDialog(true)} size="sm">Create Sprint</Button>
                  </div>
                )}
              </div>
              
              <MeetingsList projectId={projectId!} />
            </div>
          </div>
        </TabsContent>

        {/* Sprints Tab */}
        <TabsContent value="sprints" className="mt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Sprint Planning</h2>
            <Button onClick={() => setShowCreateSprintDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Sprint
            </Button>
          </div>
          
          <SprintList 
            sprints={sprints}
            activeSprint={activeSprint}
            onCreateSprint={() => setShowCreateSprintDialog(true)}
            loading={isLoadingSprints}
          />
        </TabsContent>

        {/* Backlog Tab */}
        <TabsContent value="backlog" className="mt-6">
          <ProductBacklog 
            projectId={projectId!} 
            onRefresh={refreshProject}
            activeSprint={activeSprint}
          />
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="mt-6">
          <TeamMembers 
            projectId={projectId!} 
            project={project}
            currentUserId={user?.id || ""}
            onMemberAdded={refreshProject}
          />
        </TabsContent>
      </Tabs>

      {/* Create Sprint Dialog */}
      <CreateSprintDialog
        open={showCreateSprintDialog}
        onClose={() => setShowCreateSprintDialog(false)}
        onCreateSprint={handleCreateSprint}
        projectId={projectId!}
        hasActiveSprint={!!activeSprint}
        activeSprintId={activeSprint?.id}
        existingSprints={sprints}
      />
    </div>
  );
};

export default ProjectPage;
