
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProjectsTable from "@/components/ProjectsTable";

const AllProjects = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">All Projects</h1>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => navigate("/")}>
            <Home className="mr-2 h-4 w-4" />
            Home
          </Button>
          <Button onClick={() => navigate("/dashboard")}>
            Dashboard
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-muted-foreground">
          Below is a complete list of all projects in the system. Click on any project to view its details.
        </p>
      </div>

      <ProjectsTable />
    </div>
  );
};

export default AllProjects;
