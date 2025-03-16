
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ArrowRight } from "lucide-react";
import { Task } from "@/types/task";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onMove?: (task: Task) => void;
  showMoveButton?: boolean;
  isDraggable?: boolean;
}

const priorityColors = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-red-100 text-red-800",
};

const statusColors = {
  todo: "bg-gray-100 text-gray-800",
  "in-progress": "bg-blue-100 text-blue-800",
  "in-review": "bg-purple-100 text-purple-800",
  done: "bg-green-100 text-green-800",
};

const TaskCard = ({ task, onEdit, onDelete, onMove, showMoveButton = false, isDraggable = false }: TaskCardProps) => {
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent drag when clicking edit button
    e.preventDefault(); // Prevent drag when clicking edit button
    onEdit(task);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent drag when clicking delete button
    e.preventDefault(); // Prevent drag when clicking delete button
    onDelete(task.id);
  };

  const handleMoveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent drag when clicking move button
    e.preventDefault(); // Prevent drag when clicking move button
    if (onMove) {
      onMove(task);
    }
  };

  return (
    <Card className={`mb-4 ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''} hover:shadow-md transition-shadow`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <CardTitle className="text-lg truncate">{task.title}</CardTitle>
              </TooltipTrigger>
              <TooltipContent>
                <p>{task.title}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex gap-1">
            <Badge variant="outline" className={priorityColors[task.priority as keyof typeof priorityColors] || "bg-gray-100"}>
              {task.priority}
            </Badge>
            <Badge variant="outline" className={statusColors[task.status as keyof typeof statusColors] || "bg-gray-100"}>
              {task.status.replace("-", " ")}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-sm text-gray-500">
          Points: {task.points}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-sm text-gray-700 truncate">{task.description}</p>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs">{task.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardContent>
      <CardFooter className="flex justify-end pt-2 gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={handleEditClick}
          className="z-10"
          type="button"
        >
          <Edit size={16} />
        </Button>
        {showMoveButton && onMove && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleMoveClick}
            className="text-blue-500 hover:text-blue-700 z-10"
            type="button"
          >
            <ArrowRight size={16} />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDeleteClick}
          className="text-red-500 hover:text-red-700 z-10"
          type="button"
        >
          <Trash2 size={16} />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TaskCard;
