
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronRight, Trash2, Clock, ArrowUp, History } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Sprint } from '@/types/sprint';
import { deleteSprint } from '@/lib/supabase/sprints';
import { useToast } from '@/hooks/use-toast';
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

interface SprintListProps {
  sprints: Sprint[];
  projectId: string;
  title?: string;
  onSprintDeleted?: () => void;
}

interface GroupedSprints {
  current: Sprint[];
  future: Sprint[];
  past: Sprint[];
}

const SprintList = ({ sprints, projectId, title, onSprintDeleted }: SprintListProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});

  const groupedSprints = sprints.reduce((acc: GroupedSprints, sprint) => {
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

  const sortedSprints = {
    current: groupedSprints.current.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    future: groupedSprints.future.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    past: groupedSprints.past.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())
  };

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

  // Removed the first declaration of renderSprintCategory

  const SprintCard = ({ 
    sprint, 
    handleNavigateToSprint, 
    handleDeleteSprint, 
    isDeleting 
  }: { 
    sprint: Sprint, 
    handleNavigateToSprint: (id: string) => void, 
    handleDeleteSprint: (id: string) => void,
    isDeleting: Record<string, boolean>
  }) => (
    <Card key={sprint.id} className={`hover:shadow-md transition-shadow ${
      sortedSprints.current.includes(sprint) ? 'border-green-600/40 bg-green-50/10' : ''
    }`}>
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
  );

  const renderSprintCategory = (
    categoryTitle: string,
    categoryIcon: React.ReactNode,
    categoryItems: Sprint[],
    variant: string = 'default',
    emptyMessage: string = 'No sprints available'
  ) => {
    return (
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2 border-b pb-2">
          <h3 className="text-lg font-medium">{categoryTitle}</h3>
          {categoryIcon}
          <Badge variant={variant as any}>{categoryItems.length}</Badge>
        </div>
        {categoryItems.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categoryItems.map(sprint => (
              <SprintCard 
                key={sprint.id} 
                sprint={sprint} 
                handleNavigateToSprint={handleNavigateToSprint}
                handleDeleteSprint={handleDeleteSprint}
                isDeleting={isDeleting}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-muted/20 rounded-lg">
            <p className="text-muted-foreground">{emptyMessage}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {title && <h2 className="text-xl font-medium mb-6">{title}</h2>}
      
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-green-600" />
          <h2 className="text-xl font-semibold">Current Sprint</h2>
          <Badge className="bg-green-600">Active</Badge>
        </div>
        <Separator className="mb-4" />
        {sortedSprints.current.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedSprints.current.map(sprint => (
              <SprintCard 
                key={sprint.id} 
                sprint={sprint} 
                handleNavigateToSprint={handleNavigateToSprint}
                handleDeleteSprint={handleDeleteSprint}
                isDeleting={isDeleting}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-muted/20 rounded-lg">
            <p className="text-muted-foreground">No active sprints at the moment</p>
          </div>
        )}
      </div>
      
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-center gap-2 mb-4">
          <ArrowUp className="h-5 w-5 text-blue-500" />
          <h2 className="text-xl font-semibold">Upcoming Sprints</h2>
          <Badge variant="secondary">{sortedSprints.future.length}</Badge>
        </div>
        <Separator className="mb-4" />
        {sortedSprints.future.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedSprints.future.map(sprint => (
              <SprintCard 
                key={sprint.id} 
                sprint={sprint} 
                handleNavigateToSprint={handleNavigateToSprint}
                handleDeleteSprint={handleDeleteSprint}
                isDeleting={isDeleting}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-muted/20 rounded-lg">
            <p className="text-muted-foreground">No upcoming sprints scheduled</p>
          </div>
        )}
      </div>
      
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-5 w-5 text-gray-500" />
          <h2 className="text-xl font-semibold">Past Sprints</h2>
          <Badge variant="outline">{sortedSprints.past.length}</Badge>
        </div>
        <Separator className="mb-4" />
        {sortedSprints.past.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedSprints.past.map(sprint => (
              <SprintCard 
                key={sprint.id} 
                sprint={sprint} 
                handleNavigateToSprint={handleNavigateToSprint}
                handleDeleteSprint={handleDeleteSprint}
                isDeleting={isDeleting}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-muted/20 rounded-lg">
            <p className="text-muted-foreground">No past sprints</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SprintList;
