export interface SupabaseFile {
  id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  created_at: string;
  owner_id?: string;
  is_public?: boolean;
  share_token?: string;
  url?: string;
  extension?: string;
}

export interface SharedUser {
  shared_with_email: string;
  created_at: string;
}
