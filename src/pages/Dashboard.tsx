import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Project } from "@/types/user";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { createProject, deleteProject, fetchProjects } from "@/lib/supabase/projects";
import { AlertCircle, Plus, Users, Home, LogOut } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import LogoutButton from "@/components/LogoutButton";
import { supabase } from "@/lib/supabase/client";

const Dashboard = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("select");
  const { user } = useAuth();
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProjects = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const userProjects = await fetchProjects(user.id);
        setProjects(userProjects);
      } catch (error) {
        console.error('Error loading projects:', error);
        toast({
          title: 'Error',
          description: 'Failed to load your projects',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserProjects();
  }, [user, toast]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      // Generate a unique project code
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
      });
      
      // Navigate to the project
      navigate(`/project/${newProject.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      });
    }
  };

  const handleJoinProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");
    
    if (!user) return;
    
    if (!joinCode.trim()) {
      setJoinError("Project code cannot be empty");
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('code', joinCode.trim())
        .single();
      
      if (error || !data) {
        throw new Error('Project not found');
      }
      
      // Update the project's members array to include the current user
      const updatedMembers = [...(data.members || [])];
      if (!updatedMembers.includes(user.id)) {
        updatedMembers.push(user.id);
      }
      
      const { error: updateError } = await supabase
        .from('projects')
        .update({ members: updatedMembers })
        .eq('id', data.id);
      
      if (updateError) {
        throw updateError;
      }
      
      toast({
        title: 'Success',
        description: `You've joined ${data.name}`,
      });
      
      // Navigate to the project
      navigate(`/project/${data.id}`);
    } catch (error) {
      console.error('Error joining project:', error);
      setJoinError("Invalid project code or project not found");
    }
  };

  const handleSelectProject = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mb-4 mx-auto"></div>
          <p className="text-muted-foreground">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold">Your Projects</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/')}>
            <Home className="h-4 w-4 mr-2" />
            Home
          </Button>
          <LogoutButton variant="outline">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </LogoutButton>
        </div>
      </div>
      
      {projects.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-semibold mb-6">Select a Project</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {projects.map((project) => (
              <Card key={project.id} className="p-6 hover:shadow-md transition-shadow cursor-pointer" 
                onClick={() => handleSelectProject(project.id)}>
                <h3 className="text-xl font-semibold mb-1">{project.name}</h3>
                <div className="flex items-center text-muted-foreground mb-3 text-sm">
                  <Users className="h-4 w-4 mr-1" />
                  <span>{project.members?.length || 1} member{project.members?.length !== 1 ? 's' : ''}</span>
                </div>
                <p className="text-muted-foreground mb-4 text-sm">
                  {project.description || "No description provided"}
                </p>
                <Button variant="outline" className="w-full">Select Project</Button>
              </Card>
            ))}
          </div>
        </div>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList className="w-full grid grid-cols-2 mb-6">
          <TabsTrigger value="create">Create Project</TabsTrigger>
          <TabsTrigger value="join">Join Project</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-2">Create a New Project</h2>
            <p className="text-muted-foreground mb-6">Start a new project and invite team members to collaborate</p>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="block font-medium">
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
                <label htmlFor="description" className="block font-medium">
                  Description (Optional)
                </label>
                <Input
                  id="description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="A brief description of your project"
                />
              </div>
              <Button type="submit" className="w-full mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </form>
          </Card>
        </TabsContent>
        
        <TabsContent value="join">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-2">Join an Existing Project</h2>
            <p className="text-muted-foreground mb-6">
              Enter the project code provided by the project owner
            </p>
            
            <form onSubmit={handleJoinProject} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="code" className="block font-medium">
                  Project Code
                </label>
                <Input
                  id="code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  className="uppercase"
                  maxLength={6}
                  required
                />
              </div>
              
              {joinError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{joinError}</AlertDescription>
                </Alert>
              )}
              
              <Button type="submit" className="w-full">
                Join Project
              </Button>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
