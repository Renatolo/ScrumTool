
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Home, LayoutDashboard, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchProjects } from "@/lib/supabase/projects";
import { fetchProjectSprints } from "@/lib/supabase/sprints";
import CreateSprintDialog from "@/components/CreateSprintDialog";
import ProductBacklog from "@/components/ProductBacklog";
import { Project } from "@/types/user";
import { Sprint } from "@/types/sprint";
import SprintList from "@/components/SprintList";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

const ProjectPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId || !user) return;
      
      try {
        setLoading(true);
        // Fetch all projects and find the one matching the ID
        const projectsData = await fetchProjects(user.id);
        const projectData = projectsData.find(p => p.id === projectId);
        setProject(projectData || null);
        
        // Fetch sprints that belong to this project directly
        const projectSprints = await fetchProjectSprints(projectId);
        setSprints(projectSprints);
      } catch (error) {
        console.error('Error loading project data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load project data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadProject();
  }, [projectId, user, toast]);
  
  const handleSprintCreated = (newSprint: Sprint) => {
    setSprints(prevSprints => [...prevSprints, newSprint]);
    toast({
      title: 'Success',
      description: 'Sprint created successfully',
    });
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoDashboard = () => {
    navigate('/dashboard');
  };
  
  const handleDeleteProject = async () => {
    if (!projectId || !user) return;
    
    try {
      setIsDeleting(true);
      
      // Delete all tasks associated with this project
      await supabase
        .from('tasks')
        .delete()
        .eq('project_id', projectId);
      
      // Delete all sprints associated with this project
      await supabase
        .from('sprints')
        .delete()
        .eq('project_id', projectId);
      
      // Finally delete the project
      await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      
      toast({
        title: 'Success',
        description: 'Project and all associated items deleted successfully',
      });
      
      // Navigate back to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (!project) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive">Project not found</h2>
          <p className="text-muted-foreground mt-2">The project you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">Back to Dashboard</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{project?.name}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleGoDashboard}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button variant="outline" onClick={handleGoHome}>
            <Home className="mr-2 h-4 w-4" />
            Home
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash className="mr-2 h-4 w-4" />
                Delete Project
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the project
                  "{project.name}" and all its associated sprints and tasks.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteProject}
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      {project?.description && (
        <p className="text-muted-foreground mb-6">{project.description}</p>
      )}
      
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Project Code: <span className="font-mono bg-muted px-2 py-1 rounded">{project?.code}</span></h2>
        <Button onClick={() => setIsCreateSprintOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Sprint
        </Button>
      </div>
      
      <Tabs defaultValue="sprints" className="w-full">
        <TabsList>
          <TabsTrigger value="sprints">Sprints</TabsTrigger>
          <TabsTrigger value="backlog">Product Backlog</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sprints" className="mt-6">
          <SprintList sprints={sprints} projectId={projectId || ''} />
        </TabsContent>
        
        <TabsContent value="backlog" className="mt-6">
          <ProductBacklog projectId={projectId || ''} />
        </TabsContent>
      </Tabs>
      
      {user && projectId && (
        <CreateSprintDialog 
          open={isCreateSprintOpen} 
          onClose={() => setIsCreateSprintOpen(false)} 
          onCreateSprint={handleSprintCreated}
          projectId={projectId}
        />
      )}
    </div>
  );
};

export default ProjectPage;
