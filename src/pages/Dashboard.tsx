
// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProjects, createProject, joinProject } from "@/lib/supabase/projects";
import { Project } from "@/types/user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CopyCheck, ClipboardList, UserPlus, Home, LayoutDashboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
import { generateProjectCode } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import LogoutButton from "@/components/LogoutButton";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const loadProjects = async () => {
      if (user) {
        try {
          const userProjects = await fetchProjects(user.id);
          setProjects(userProjects);
        } catch (e: any) {
          console.error("Failed to load projects", e);
          toast({
            title: "Error",
            description: "Failed to load projects",
            variant: "destructive",
          });
        }
      }
    };

    loadProjects();
  }, [user, navigate, toast]);

  const handleCreateProject = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a project",
        variant: "destructive",
      });
      return;
    }

    if (!newProjectName.trim()) {
      setError("Project name cannot be empty");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const projectCode = generateProjectCode();
      const newProject = await createProject({
        name: newProjectName,
        user_id: user.id,
        description: newProjectDescription || "A new project",
        code: projectCode,
        members: [user.id],
        created_at: new Date().toISOString(),
      });

      setProjects((prevProjects) => [...prevProjects, newProject]);
      setNewProjectName("");
      setNewProjectDescription("");
      toast({
        title: "Success",
        description: "Project created successfully",
      });
    } catch (e: any) {
      console.error("Failed to create project", e);
      setError(e.message || "Failed to create project");
      toast({
        title: "Error",
        description: e.message || "Failed to create project",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinProject = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to join a project",
        variant: "destructive",
      });
      return;
    }

    if (!joinCode.trim()) {
      setError("Join code cannot be empty");
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const joinedProject = await joinProject(joinCode, user.id);
      setProjects((prevProjects) => [...prevProjects, joinedProject]);
      setJoinCode("");
      toast({
        title: "Success",
        description: "Project joined successfully",
      });
    } catch (e: any) {
      console.error("Failed to join project", e);
      setError(e.message || "Failed to join project");
      
      // Show a toast message if the error is about already being a member
      if (e.message && e.message.includes("already a member")) {
        toast({
          title: "Info",
          description: e.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Error",
          description: e.message || "Failed to join project",
          variant: "destructive",
        });
      }
    } finally {
      setIsJoining(false);
    }
  };

  const handleGoToProject = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const handleGoHome = () => {
    navigate("/");
  };

  if (!isMounted) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleGoHome}>
            <Home className="mr-2 h-4 w-4" />
            Home
          </Button>
          <LogoutButton />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Create Project Card */}
        <Card>
          <CardHeader>
            <CardTitle>Create Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="newProjectName">Project Name</Label>
                <Input
                  id="newProjectName"
                  placeholder="Enter project name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newProjectDescription">Project Description</Label>
                <Textarea
                  id="newProjectDescription"
                  placeholder="Enter project description"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <Button disabled={isCreating} onClick={handleCreateProject}>
                {isCreating ? (
                  <>
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Project
                  </>
                )}
              </Button>
              {error && <p className="text-red-500">{error}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Join Project Card */}
        <Card>
          <CardHeader>
            <CardTitle>Join Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="joinCode">Join Code</Label>
                <Input
                  id="joinCode"
                  placeholder="Enter join code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                />
              </div>
              <Button disabled={isJoining} onClick={handleJoinProject}>
                {isJoining ? (
                  <>
                    Joining...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Join Project
                  </>
                )}
              </Button>
              {error && <p className="text-red-500">{error}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-6" />

      {/* Projects List */}
      {projects.length > 0 ? (
        <>
          <h2 className="text-2xl font-semibold mb-4">My Projects</h2>
          <ScrollArea className="rounded-md border p-4">
            <div className="grid gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      {project.name}
                      <Button variant="link" onClick={() => handleGoToProject(project.id)}>
                        <ClipboardList className="mr-2 h-4 w-4" />
                        Open
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                    <div className="flex items-center mt-4">
                      <span className="mr-2">Project Code:</span>
                      <code className="font-mono text-sm px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">{project.code}</code>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </>
      ) : (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold">No projects yet</h2>
          <p className="text-muted-foreground">Create a new project or join an existing one to get started.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
