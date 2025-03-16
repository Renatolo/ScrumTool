
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Task } from "@/types/task";
import { Sprint } from "@/types/sprint";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Grip, Trash, Edit, MoveRight, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import EditTaskDialog from "./EditTaskDialog";
import { User } from "@/types/user";
import { Avatar, AvatarImage, AvatarFallback, AvatarGroup } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const MOCK_USERS: User[] = [
  { id: "1", name: "John Doe", email: "john.doe@example.com", avatarUrl: "https://github.com/shadcn.png" },
  { id: "2", name: "Jane Smith", email: "jane.smith@example.com", avatarUrl: "https://github.com/shadcn.png" },
  { id: "3", name: "Bob Johnson", email: "bob.johnson@example.com", avatarUrl: "https://github.com/shadcn.png" },
];

interface SprintTaskProps {
  task: Task;
  sprints: Sprint[];
  onDelete: (id: string) => void;
  onUpdate: (task: Task) => void;
  onMove: (taskId: string, sprintId: string) => void;
  onMoveToBacklog?: (taskId: string) => void;
}

const SprintTask = ({ task, sprints, onDelete, onUpdate, onMove, onMoveToBacklog }: SprintTaskProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo":
        return "bg-blue-100 text-blue-800";
      case "in-progress":
        return "bg-purple-100 text-purple-800";
      case "done":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "todo":
        return "To Do";
      case "in-progress":
        return "In Progress";
      case "done":
        return "Done";
      default:
        return status;
    }
  };

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className="p-4 backdrop-blur-sm bg-card/80 border shadow-sm hover:shadow-md transition-shadow animate-fade-up"
      >
        <div className="flex items-start gap-4">
          <button
            {...attributes}
            {...listeners}
            className="mt-1 touch-none"
            aria-label="Drag to reorder"
          >
            <Grip className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h3 className="font-medium text-foreground truncate max-w-[16rem]">{task.title}</h3>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{task.title}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-sm text-muted-foreground truncate max-w-[16rem]">{task.description}</p>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{task.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-2">
                {sprints.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoveRight className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {onMoveToBacklog && (
                        <DropdownMenuItem
                          onClick={() => onMoveToBacklog(task.id)}
                        >
                          Move to Product Backlog
                        </DropdownMenuItem>
                      )}
                      {sprints.map((sprint) => (
                        <DropdownMenuItem
                          key={sprint.id}
                          onClick={() => onMove(task.id, sprint.id)}
                        >
                          Move to {sprint.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(task.id)}
                >
                  <Trash className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-1 rounded-md text-xs font-medium ${getPriorityColor(
                  task.priority
                )}`}
              >
                {task.priority}
              </span>
              <span
                className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(
                  task.status
                )}`}
              >
                {getStatusLabel(task.status)}
              </span>
              <span className="text-xs text-muted-foreground">
                {task.points} points
              </span>
              {task.assignees?.length > 0 && (
                <AvatarGroup>
                  {task.assignees.map((userId) => {
                    const user = MOCK_USERS.find((u) => u.id === userId);
                    if (!user) return null;
                    return (
                      <Avatar key={user.id} className="w-6 h-6">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback>
                          <UserIcon className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                    );
                  })}
                </AvatarGroup>
              )}
            </div>
          </div>
        </div>
      </Card>

      <EditTaskDialog
        task={task}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        userId={task.userId || ""}
        onTaskUpdated={onUpdate}
      />
    </>
  );
};

export default SprintTask;
