
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Sprint } from '@/types/sprint';
import { deleteSprint } from '@/lib/supabase/sprints';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { 
  Calendar, 
  ChevronRight, 
  Trash2,
  ArrowUp, 
  History,
  Clock
} from 'lucide-react';

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

  // Group sprints into categories
  const groupedSprints = sprints.reduce((acc: { 
      current: Sprint[]; 
      future: Sprint[]; 
      past: Sprint[]; 
    }, sprint) => {
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    
    if (today >= startDate && today <= endDate) {
      acc.current.push(sprint);
    } else if (startDate > today) {
      acc.future.push(sprint);
    } else {
      acc.past.push(sprint);
    }
    
    return acc;
  }, { current: [], future: [], past: [] });

  // Sort sprints within each category
  const sortedSprints = {
    current: groupedSprints.current.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    future: groupedSprints.future.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    past: groupedSprints.past.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
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

  // Sprint Card Component
  const SprintCard = ({ sprint }: { sprint: Sprint }) => (
    <Card 
      key={sprint.id} 
      className={`hover:shadow-md transition-shadow ${
        sortedSprints.current.includes(sprint) ? 'border-green-600/40 bg-green-50/10' : ''
      }`}
    >
      <div className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">{sprint.name}</h3>
          {getStatusBadge(sprint)}
        </div>
        
        <div className="flex items-center text-sm text-muted-foreground mb-3">
          <Calendar className="h-4 w-4 mr-2" />
          <span>
            {format(new Date(sprint.startDate), "MMM d")} - {format(new Date(sprint.endDate), "MMM d, yyyy")}
          </span>
        </div>
        
        <div className="flex gap-2">
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
      </div>
    </Card>
  );

  // Category Section Component
  const SprintCategorySection = ({ 
    title, 
    icon, 
    sprints, 
    emptyMessage, 
    badgeColor = "bg-blue-600"
  }: { 
    title: string; 
    icon: JSX.Element; 
    sprints: Sprint[];
    emptyMessage: string;
    badgeColor?: string;
  }) => (
    <div className="border rounded-lg p-6 bg-card mb-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="text-xl font-semibold">{title}</h2>
        <Badge className={badgeColor}>{sprints.length}</Badge>
      </div>
      
      <Separator className="mb-4" />
      
      {sprints.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sprints.map(sprint => (
            <SprintCard key={sprint.id} sprint={sprint} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-muted/20 rounded-lg">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {title && <h2 className="text-xl font-medium mb-6">{title}</h2>}
      
      <SprintCategorySection
        title="Current Sprint"
        icon={<Clock className="h-5 w-5 text-green-600" />}
        sprints={sortedSprints.current}
        emptyMessage="No active sprints at the moment"
        badgeColor="bg-green-600"
      />
      
      <SprintCategorySection
        title="Upcoming Sprints"
        icon={<ArrowUp className="h-5 w-5 text-blue-500" />}
        sprints={sortedSprints.future}
        emptyMessage="No upcoming sprints scheduled"
        badgeColor="bg-blue-500"
      />
      
      <SprintCategorySection
        title="Past Sprints"
        icon={<History className="h-5 w-5 text-gray-500" />}
        sprints={sortedSprints.past}
        emptyMessage="No past sprints"
        badgeColor="bg-gray-500"
      />
    </div>
  );
};

export default SprintList;
