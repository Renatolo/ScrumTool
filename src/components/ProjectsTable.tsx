
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { Project } from "@/types/user";
import { ClipboardList, Calendar, Users } from "lucide-react";
import { formatDistance } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const ProjectsTable = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchAllProjects = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all projects from the database
        const { data, error } = await supabase
          .from('projects')
          .select('*');
        
        if (error) throw error;
        
        setProjects(data as Project[]);
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast({
          title: 'Error',
          description: 'Failed to load projects',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllProjects();
  }, [toast]);

  const handleViewProject = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableCaption>A list of all projects in the system.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Project Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-center">Members</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No projects found.
              </TableCell>
            </TableRow>
          ) : (
            projects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell className="max-w-[300px] truncate">
                  {project.description || "No description"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono">
                    {project.code}
                  </Badge>
                </TableCell>
                <TableCell>
                  {project.created_at ? (
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDistance(new Date(project.created_at), new Date(), { addSuffix: true })}
                    </span>
                  ) : (
                    "Unknown"
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <span className="flex items-center justify-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {project.members?.length || 1}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleViewProject(project.id)}
                  >
                    <ClipboardList className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProjectsTable;
