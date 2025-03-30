
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProjectMember {
  id: string;
  name: string;
  role?: string;
  avatar_url?: string;
}

export const useFetchProjectMembers = (projectId: string) => {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMembers = async () => {
    if (!projectId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get the project to get the member IDs and roles
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('members, member_roles')
        .eq('id', projectId)
        .single();

      if (projectError) {
        throw projectError;
      }

      if (!projectData?.members?.length) {
        setMembers([]);
        setLoading(false);
        return;
      }

      // Fetch all the profiles for these member IDs
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', projectData.members);

      if (profilesError) {
        throw profilesError;
      }

      // Combine the profiles with their roles from the project
      const memberRoles = projectData.member_roles || {};
      const membersWithRoles = (profilesData || []).map(profile => ({
        ...profile,
        role: memberRoles[profile.id] || 'developer'
      }));

      setMembers(membersWithRoles);
    } catch (error) {
      console.error('Error fetching project members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team members',
        variant: 'destructive',
      });
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [projectId]);

  return {
    members,
    loading,
    refreshMembers: fetchMembers
  };
};
