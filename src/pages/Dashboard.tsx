import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { fetchProjectSprints } from '@/lib/supabase/sprints';
import { fetchTasks } from '@/lib/supabase/tasks';
import { Sprint } from '@/types/sprint';
import { Task } from '@/types/task';
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import CreateSprintDialog from '@/components/CreateSprintDialog';
import TaskTable from '@/components/TaskTable';
import LogoutButton from '@/components/LogoutButton';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCreateSprintDialogOpen, setIsCreateSprintDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const projectId = router.query.projectId as string;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (projectId) {
      fetchData();
    }
  }, [user, router, projectId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const sprintsData = await fetchProjectSprints(projectId);
      setSprints(sprintsData);

      const tasksData = await fetchTasks(user!.id);
      setTasks(tasksData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSprint = (newSprint: Sprint) => {
    setSprints(prevSprints => [...prevSprints, newSprint]);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const openCreateSprintDialog = () => {
    setIsCreateSprintDialogOpen(true);
  };

  const closeCreateSprintDialog = () => {
    setIsCreateSprintDialogOpen(false);
  };

  if (!user) {
    return null;
  }

  const activeSprint = sprints.find(sprint => new Date(sprint.startDate) <= new Date() && new Date(sprint.endDate) >= new Date());

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Project Dashboard</h1>
        <LogoutButton variant="outline" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Sprint Management</CardTitle>
            <CardDescription>Create and manage your project sprints.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading sprints...</p>
            ) : (
              <>
                {activeSprint ? (
                  <p>Active Sprint: {activeSprint.name} (Ends: {new Date(activeSprint.endDate).toLocaleDateString()})</p>
                ) : (
                  <p>No active sprint.</p>
                )}
                <Button onClick={openCreateSprintDialog}>
                  Create New Sprint
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>Select a date to view tasks.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) =>
                    date > new Date()
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Tasks</h2>
        {isLoading ? (
          <p>Loading tasks...</p>
        ) : (
          <TaskTable tasks={tasks} />
        )}
      </div>

      <CreateSprintDialog
        open={isCreateSprintDialogOpen}
        onClose={closeCreateSprintDialog}
        onCreateSprint={handleCreateSprint}
        projectId={projectId}
        hasActiveSprint={!!activeSprint}
        activeSprintId={activeSprint?.id}
      />
    </div>
  );
};

import { CalendarIcon } from "@radix-ui/react-icons"

export default Dashboard;
