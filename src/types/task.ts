
export interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  points: number;
  status: "todo" | "in-progress" | "in-review" | "done";
  assignees: string[]; // Array of user IDs
  userId?: string; // The ID of the user who created the task
  projectId?: string; // The ID of the project this task belongs to
  sprintId?: string; // The ID of the sprint this task belongs to
  completedAt?: string; // Timestamp when the task was completed
}
