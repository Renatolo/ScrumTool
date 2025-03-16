import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Home, Trash, Users, BarChart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchProjects } from "@/lib/supabase/projects";
import { fetchProjectSprints } from "@/lib/supabase/sprints";
import { fetchSprintTasks } from "@/lib/supabase/tasks";
import CreateSprintDialog from "@/components/CreateSprintDialog";
import { Project } from "@/types/user";
import { Sprint } from "@/types/sprint";
import { Task } from "@/types/task";
import ProductBacklog from "@/components/ProductBacklog";
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
import { supabase } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ProjectPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [pastSprints, setPastSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, { name: string; id: string }>>({});
  const [projectStats, setProjectStats] = useState({
    totalSprints: 0,
    totalTasks: 0,
    completionRate: 0,
    teamSize: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadProject = async () => {
      if (!projectId || !user) return;
      
      try {
        setLoading(true);
        const projectsData = await fetchProjects(user.id);
        const projectData = projectsData.find(p => p.id === projectId);
        setProject(projectData || null);
        
        const projectSprints = await fetchProjectSprints(projectId);
        setSprints(projectSprints);
        
        updateSprintCategories(projectSprints);
        
        if (projectData && projectData.members && projectData.members.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', projectData.members);
          
          if (profiles && profiles.length > 0) {
            const userMap: Record<string, { name: string; id: string }> = {};
            profiles.forEach(profile => {
              userMap[profile.id] = { 
                name: profile.name || 'Unknown User',
                id: profile.id
              };
            });
            setUserProfiles(userMap);
          }
          
          const allProjectTasks = await supabase
            .from('tasks')
            .select('*')
            .eq('project_id', projectId);
          
          if (allProjectTasks.data) {
            const totalTasks = allProjectTasks.data.length;
            const completedTasks = allProjectTasks.data.filter(t => t.status === "done").length;
            const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            setProjectStats({
              totalSprints: projectSprints.length,
              totalTasks: totalTasks,
              completionRate: completionRate,
              teamSize: projectData?.members?.length || 1,
            });
          }
        }
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
  
  const updateSprintCategories = (sprintList: Sprint[]) => {
    const today = new Date();
    
    const active = sprintList.find(s => 
      new Date(s.startDate) <= today && new Date(s.endDate) >= today
    ) || null;
    
    const past = sprintList.filter(s => 
      new Date(s.endDate) < today
    );
    
    setActiveSprint(active);
    setPastSprints(past);
    
    if (active) {
      loadSprintTasks(active.id);
    }
  };
  
  const loadSprintTasks = async (sprintId: string) => {
    try {
      const sprintTasks = await fetchSprintTasks(sprintId);
      setTasks(sprintTasks);
    } catch (error) {
      console.error('Error loading sprint tasks:', error);
    }
  };
  
  const handleSprintCreated = (newSprint: Sprint) => {
    console.log('New sprint created:', newSprint);
    
    setSprints(prevSprints => {
      const nonConflictingSprints = prevSprints.filter(s => 
        new Date(s.endDate) < new Date(newSprint.startDate) ||
        new Date(s.startDate) > new Date(newSprint.endDate)
      );
      
      return [...nonConflictingSprints, newSprint];
    });
    
    const today = new Date();
    const startDate = new Date(newSprint.startDate);
    const endDate = new Date(newSprint.endDate);
    
    if (startDate <= today && endDate >= today) {
      setActiveSprint(newSprint);
      loadSprintTasks(newSprint.id);
    }
    
    setPastSprints(prev => {
      const newPastSprints = [...prev];
      if (endDate < today) {
        newPastSprints.push(newSprint);
      }
      return newPastSprints;
    });
    
    setProjectStats(prev => ({
      ...prev,
      totalSprints: prev.totalSprints + 1
    }));
    
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
      
      await supabase
        .from('tasks')
        .delete()
        .eq('project_id', projectId);
      
      await supabase
        .from('sprints')
        .delete()
        .eq('project_id', projectId);
      
      await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      
      toast({
        title: 'Success',
        description: 'Project and all associated items deleted successfully',
      });
      
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

  const handleRefresh = () => {
    if (projectId && user) {
      loadProject();
    }
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };
  
  const loadProject = async () => {
    if (!projectId || !user) return;
    
    try {
      setLoading(true);
      const projectsData = await fetchProjects(user.id);
      const projectData = projectsData.find(p => p.id === projectId);
      setProject(projectData || null);
      
      const projectSprints = await fetchProjectSprints(projectId);
      setSprints(projectSprints);
      
      updateSprintCategories(projectSprints);
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
    <div className="container mx-auto p-6">
      <div className="flex items-center text-muted-foreground mb-2">
        <Button variant="link" className="p-0 mr-1 h-auto" onClick={() => navigate('/dashboard')}>
          Projects
        </Button>
        <span className="mx-1">›</span>
        <span>{project.name}</span>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">{project?.name}</h1>
        <Button variant="default" onClick={() => setIsCreateSprintOpen(true)} className="bg-[#6B8C6B] hover:bg-[#5a7a5a]">
          <Plus className="mr-2 h-4 w-4" />
          Create Sprint
        </Button>
      </div>
      
      {project?.description && (
        <p className="text-muted-foreground mb-8">{project.description}</p>
      )}
      
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-2">Current Sprint</h2>
              <p className="text-muted-foreground mb-6">Active sprint progress and tasks</p>
              
              {activeSprint ? (
                <div>
                  <Button variant="outline" className="w-full" onClick={() => navigate(`/sprint/${activeSprint.id}`)}>
                    View Sprint Board
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-lg mb-4">No Active Sprint</p>
                  <p className="text-muted-foreground mb-6">Create a new sprint to start tracking your work</p>
                  <Button onClick={() => setIsCreateSprintOpen(true)} className="bg-[#6B8C6B] hover:bg-[#5a7a5a]">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Sprint
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          <div className="mb-6">
            {projectId && <ProductBacklog projectId={projectId} onRefresh={handleRefresh} />}
          </div>
          
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-2">Past Sprints</h2>
              <p className="text-muted-foreground mb-4">View completed sprints and their results</p>
              
              {pastSprints.length > 0 ? (
                <SprintList sprints={pastSprints} projectId={projectId} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No past sprints available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Users className="mr-2 h-5 w-5" /> Team Members
              </h2>
              
              <div className="space-y-4 mb-6">
                {Object.values(userProfiles).map((profile) => (
                  <div key={profile.id} className="flex items-center">
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
                    </Avatar>
                    <span>{profile.name}</span>
                  </div>
                ))}
              </div>
              
              <Button variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <BarChart className="mr-2 h-5 w-5" /> Project Stats
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Sprints</span>
                  <span className="font-semibold">{projectStats.totalSprints}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Tasks</span>
                  <span className="font-semibold">{projectStats.totalTasks}</span>
                </div>
                <div className="flex justify-between">
                  <span>Completion Rate</span>
                  <span className="font-semibold">{projectStats.completionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Team Size</span>
                  <span className="font-semibold">{projectStats.teamSize}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-6">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
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
      </div>
      
      {user && projectId && (
        <CreateSprintDialog 
          open={isCreateSprintOpen} 
          onClose={() => setIsCreateSprintOpen(false)} 
          onCreateSprint={handleSprintCreated}
          projectId={projectId}
          hasActiveSprint={activeSprint !== null}
          activeSprintId={activeSprint?.id}
        />
      )}
    </div>
  );
};

export default ProjectPage;
