import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { fetchProjects } from "@/lib/supabase/projects";
import { Project } from "@/types/user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import ProjectItem from "@/components/ProjectItem";
import CreateProjectDialog from "@/components/CreateProjectDialog";
import EditProjectDialog from "@/components/EditProjectDialog";
import DeleteProjectDialog from "@/components/DeleteProjectDialog";
import LogoutButton from "@/components/LogoutButton";

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadProjects = async () => {
      if (!user) {
        return;
      }

      try {
        setLoading(true);
        const projectsData = await fetchProjects(user.id);
        setProjects(projectsData);
      } catch (error) {
        console.error("Error fetching projects:", error);
        toast({
          title: "Error",
          description: "Failed to fetch projects. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [user, toast]);

  const handleProjectCreated = (newProject: Project) => {
    setProjects((prevProjects) => [...prevProjects, newProject]);
    toast({
      title: "Success",
      description: "Project created successfully",
    });
  };

  const handleProjectUpdated = (updatedProject: Project) => {
    setProjects((prevProjects) =>
      prevProjects.map((project) =>
        project.id === updatedProject.id ? updatedProject : project
      )
    );
    toast({
      title: "Success",
      description: "Project updated successfully",
    });
  };

  const handleProjectDeleted = (projectId: string) => {
    setProjects((prevProjects) =>
      prevProjects.filter((project) => project.id !== projectId)
    );
    toast({
      title: "Success",
      description: "Project deleted successfully",
    });
  };

  const handleOpenProject = (project: Project) => {
    navigate(`/project/${project.id}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">My Projects</h1>
        <Button onClick={() => setCreateProjectOpen(true)} className="bg-[#6B8C6B] hover:bg-[#5a7a5a]">
          <Plus className="mr-2 h-4 w-4" />
          Create Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="w-full">
          <CardHeader>
            <CardTitle>No Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Get started by creating your first project.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              onOpen={() => handleOpenProject(project)}
              onEdit={() => {
                setSelectedProject(project);
                setEditProjectOpen(true);
              }}
              onDelete={() => {
                setSelectedProject(project);
                setDeleteProjectOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <CreateProjectDialog
        open={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        onCreate={handleProjectCreated}
      />

      {selectedProject && (
        <>
          <EditProjectDialog
            open={editProjectOpen}
            onClose={() => {
              setEditProjectOpen(false);
              setSelectedProject(null);
            }}
            project={selectedProject}
            onUpdate={handleProjectUpdated}
          />
          <DeleteProjectDialog
            open={deleteProjectOpen}
            onClose={() => {
              setDeleteProjectOpen(false);
              setSelectedProject(null);
            }}
            project={selectedProject}
            onDelete={handleProjectDeleted}
          />
        </>
      )}
      <div className="flex items-center gap-2">
        <LogoutButton variant="outline" />
      </div>
    </div>
  );
};

export default Dashboard;
