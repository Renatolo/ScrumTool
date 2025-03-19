
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronRight, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Sprint } from '@/types/sprint';
import { deleteSprint } from '@/lib/supabase/sprints';
import { useToast } from '@/hooks/use-toast';
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
} from '@/components/ui/alert-dialog';

interface SprintListProps {
  sprints: Sprint[];
  projectId: string;
  title?: string;
  onSprintDeleted?: () => void;
}

const SprintList = ({ sprints, projectId, title, onSprintDeleted }: SprintListProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});

  const toggleExpand = (sprintId: string) => {
    setExpanded(prev => ({
      ...prev,
      [sprintId]: !prev[sprintId]
    }));
  };

  const handleNavigateToSprint = (sprintId: string) => {
    navigate(`/sprint/${sprintId}`);
  };

  const handleDeleteSprint = async (sprintId: string) => {
    try {
      setIsDeleting(prev => ({ ...prev, [sprintId]: true }));
      await deleteSprint(sprintId);
      toast({
        title: "Success",
        description: "Sprint deleted successfully",
      });
      if (onSprintDeleted) {
        onSprintDeleted();
      }
    } catch (error) {
      console.error('Error deleting sprint:', error);
      toast({
        title: "Error",
        description: "Failed to delete the sprint",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(prev => ({ ...prev, [sprintId]: false }));
    }
  };

  const getStatusBadge = (sprint: Sprint) => {
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);

    if (startDate > today) {
      return <Badge variant="outline">Future</Badge>;
    } else if (startDate.getTime() === today.getTime()) {
      return <Badge variant="default">Current</Badge>;
    } else if (today > endDate) {
      return <Badge variant="secondary">Completed</Badge>;
    } else {
      return <Badge variant="default">Active</Badge>;
    }
  };

  if (sprints.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium text-muted-foreground">No sprints yet</h3>
        <p className="mt-2">Create your first sprint to start tracking tasks.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {title && <h3 className="text-lg font-medium mb-3">{title}</h3>}
      {sprints.map(sprint => (
        <Card key={sprint.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">{sprint.name}</CardTitle>
              {getStatusBadge(sprint)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-muted-foreground mb-4">
              <Calendar className="h-4 w-4 mr-2" />
              <span>
                {format(new Date(sprint.startDate), "MMM d")} - {format(new Date(sprint.endDate), "MMM d, yyyy")}
              </span>
            </div>
            
            <div className="flex gap-2 mt-2">
              <Button 
                variant="default" 
                className="flex-1"
                onClick={() => handleNavigateToSprint(sprint.id)}
              >
                View Sprint Board <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Sprint</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete the sprint "{sprint.name}"? 
                      This will remove the sprint but keep all tasks in your product backlog.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteSprint(sprint.id)}
                      className="bg-red-600 hover:bg-red-700"
                      disabled={isDeleting[sprint.id]}
                    >
                      {isDeleting[sprint.id] ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SprintList;
