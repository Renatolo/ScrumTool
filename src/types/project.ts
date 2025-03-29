
export interface Project {
    id: string;
    name: string;
    description: string;
    created_at: string;
    user_id: string;
    code: string;
    members: string[];
}

export interface Meeting {
    id: string;
    name: string;
    date: string;
    project_id: string;
    created_at: string;
    created_by: string;
    updated_at: string;
    description?: string;
}
