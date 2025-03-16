import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, Home, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { Project } from "@/types/user";
import LogoutButton from "@/components/LogoutButton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createProject, deleteProject } from "@/lib/supabase/projects";
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

const Dashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('projects')
          .select('*');
          
        if (error) throw error;
        
        setProjects(data as Project[] || []);

        const userIds = new Set<string>();
        data?.forEach(project => {
          if (project.user_id) userIds.add(project.user_id);
        });

        if (userIds.size > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', Array.from(userIds));

          if (!profilesError && profiles) {
            const nameMap: Record<string, string> = {};
            profiles.forEach(profile => {
              nameMap[profile.id] = profile.name || 'Unknown User';
            });
            setUserNames(nameMap);
          }
        }
      } catch (error) {
        console.error('Failed to load projects', error);
        toast({
          title: 'Error',
          description: 'Failed to load projects',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      fetchProjects();
    }
  }, [user, toast]);

  const handleViewProject = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const getUserName = (userId: string) => {
    return userNames[userId] || userId.substring(0, 8) + "...";
  };

  const handleCreateProject = async () => {
    if (!user) return;
    
    if (!projectName.trim()) {
      toast({
        title: 'Error',
        description: 'Project name cannot be empty',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const projectCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const ts = new Date().toISOString();
      
      const newProject = await createProject({
        name: projectName.trim(),
        description: projectDescription.trim(),
        created_at: ts,
        user_id: user.id,
        code: projectCode,
        members: [user.id],
      });
      
      toast({
        title: 'Success',
        description: 'Project created successfully',
        duration: 3000,
      });
      
      setProjects([...projects, newProject]);
      
      setProjectName("");
      setProjectDescription("");
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
        duration: 5000,
      });
    }
  };

  const handleDeleteConfirm = async (projectId: string) => {
    setIsDeleting(true);
    setProjectToDelete(projectId);
    
    try {
      await deleteProject(projectId);
      
      setProjects(projects.filter(project => project.id !== projectId));
      
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setProjectToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary to-background">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mb-4 mx-auto"></div>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary to-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Projects Dashboard</h1>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            <LogoutButton variant="outline" />
          </div>
        </header>

        <div className="bg-card rounded-lg shadow-lg overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">All Projects</h2>
              <Button 
                variant="default" 
                onClick={() => setIsCreateDialogOpen(true)}
                className="flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
            {projects.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Project Name</th>
                      <th className="text-left py-3 px-4">Description</th>
                      <th className="text-left py-3 px-4">Owner</th>
                      <th className="text-left py-3 px-4">Members</th>
                      <th className="text-right py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((project) => (
                      <tr key={project.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{project.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {project.description || "No description"}
                        </td>
                        <td className="py-3 px-4">
                          {getUserName(project.user_id || '')}
                        </td>
                        <td className="py-3 px-4">
                          {project.members ? project.members.length : 0} members
                        </td>
                        <td className="py-3 px-4 text-right flex justify-end gap-2">
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => handleViewProject(project.id)}
                          >
                            View
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                disabled={isDeleting && projectToDelete === project.id}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Project</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{project.name}"? 
                                  This will permanently remove the project and all associated sprints and tasks.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteConfirm(project.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {isDeleting && projectToDelete === project.id ? 'Deleting...' : 'Delete'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed rounded-lg">
                <p className="text-muted-foreground mb-4">No projects found.</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Project
                </Button>
              </div>
            )}
          </div>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Create a new project and start collaborating with your team.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Project Name
                </label>
                <Input
                  id="name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="My Amazing Project"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description (Optional)
                </label>
                <Input
                  id="description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="A brief description of your project"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateProject}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Dashboard;
