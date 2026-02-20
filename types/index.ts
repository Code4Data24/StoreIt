export type FileType = "document" | "image" | "video" | "audio" | "other";

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
  url: string | null; 
  extension: string;
}

export interface SharedUser {
  shared_with_email: string;
  created_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  avatar: string | null;
}


export interface ActionType {
  label: string;
  icon: string;
  value: string;
}

export interface SearchParamProps {
  params?: Promise<any>; 
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export interface GetFilesProps {
  types: FileType[];
  searchText?: string;
  sort?: string;
  limit?: number;
}

export interface RenameFileProps {
  fileId: string;
  name: string;
  extension: string;
  path: string;
}

export interface MobileNavigationProps {
  userId: string;
  fullName: string;
  avatar: string;
  email: string;
}

export interface FileUploaderProps {
  userId: string;
  className?: string;
}

export interface SidebarProps {
  fullName: string;
  avatar: string;
  email: string;
}

export interface ThumbnailProps {
  type: string;
  extension: string;
  url: string | null;
  className?: string;
  imageClassName?: string;
}