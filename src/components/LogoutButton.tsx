
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LogoutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

const LogoutButton = ({ 
  variant = "outline", 
  size = "default", 
  className = ""
}: LogoutButtonProps) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      // First try using the context's logout function
      await logout();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
      navigate('/');
    } catch (error) {
      console.error("Logout failed:", error);
      
      // As a fallback, try direct Supabase logout
      try {
        const { error: supabaseError } = await supabase.auth.signOut();
        if (supabaseError) throw supabaseError;
        
        toast({
          title: "Logged out successfully",
          description: "You have been logged out of your account",
        });
        navigate('/');
      } catch (fallbackError) {
        console.error("Fallback logout failed:", fallbackError);
        toast({
          title: "Logout failed",
          description: "There was an error logging out. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size}
      onClick={handleLogout}
      className={className}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Logout
    </Button>
  );
};

export default LogoutButton;
