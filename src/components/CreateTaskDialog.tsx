
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Task } from "@/types/task";
import { Profile } from "@/types/user";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Check, UserIcon } from "lucide-react";
import { fetchProjectMembers } from "@/lib/supabase/tasks";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  projectId: string;
  onTaskCreated: (task: Task) => void;
}

const CreateTaskDialog = ({ open, onOpenChange, userId, projectId, onTaskCreated }: CreateTaskDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [points, setPoints] = useState("1");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Reset form when dialog opens
    if (open) {
      resetForm();
      loadProjectMembers();
    }
  }, [open, projectId]);

  const loadProjectMembers = async () => {
    if (!projectId) return;
    
    try {
      setIsLoading(true);
      
      // Fetch project members
      const members = await fetchProjectMembers(projectId);
      
      if (members.length > 0) {
        // Fetch member profiles
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', members);
          
        if (error) throw error;
        
        setMemberProfiles(profiles.map(profile => ({
          id: profile.id,
          name: profile.name || 'Unknown User',
          avatar_url: profile.avatar_url || '',
          created_at: '',
          updated_at: ''
        })));
      }
    } catch (error) {
      console.error("Failed to fetch project members:", error);
      toast({
        title: "Error",
        description: "Failed to load project members",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      description,
      priority,
      points: Number(points),
      status: "todo",
      assignees,
      userId,
      projectId,
    };
    
    onTaskCreated(newTask);
    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setPoints("1");
    setAssignees([]);
  };

  const toggleAssignee = (userId: string) => {
    setAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
            />
          </div>
          <div className="space-y-2">
            <Label>Assignees</Label>
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
              </div>
            ) : memberProfiles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {memberProfiles.map((user) => (
                  <Button
                    key={user.id}
                    type="button"
                    variant={assignees.includes(user.id) ? "default" : "outline"}
                    className="flex items-center gap-2"
                    onClick={() => toggleAssignee(user.id)}
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={user.avatar_url} alt={user.name} />
                      <AvatarFallback>
                        <UserIcon className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    {user.name}
                    {assignees.includes(user.id) && (
                      <Check className="w-4 h-4" />
                    )}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No project members available</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="points">Estimated Effort</Label>
            <Select value={points} onValueChange={setPoints}>
              <SelectTrigger>
                <SelectValue placeholder="Select effort" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 5, 8, 13].map((point) => (
                  <SelectItem key={point} value={point.toString()}>
                    {point}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Task</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;
