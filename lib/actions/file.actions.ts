"use server";


import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { parseStringify, getFileType } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { cache } from "react";


const handleError = (error: unknown, message: string) => {
 console.error(message, error);
 throw error;
};



export const uploadFile = async (formData: FormData) => {
 try {
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error("Not authenticated");


  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");


  const filePath = `${currentUser.id}/${Date.now()}-${file.name}`;


  const { error: uploadError } = await supabase.storage
   .from("files")
   .upload(filePath, file);


  if (uploadError) throw uploadError;


  const fileTypeData = getFileType(file.name);
  const { data, error } = await supabase
   .from("files")
   .insert({
    name: file.name,
    size: file.size,
    type: fileTypeData.type,
    extension: fileTypeData.extension,
    path: filePath,
    owner_id: currentUser.id,
   })
   .select()
   .single();


  if (error) throw error;


  revalidatePath("/");
  return parseStringify({ ...data });
 } catch (error) {
  handleError(error, "Failed to upload file");
 }
};



export const getFiles = cache(
 async ({
  type,
  search,
  limit,
 }: {
  type?: string;
  search?: string;
  limit?: number;
 }) => {
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser();


  if (!currentUser) return [];


  let query = supabase
   .from("files")
   .select("id, name, path, type, size, created_at, owner_id, is_public, share_token")
   .eq("owner_id", currentUser.id)
   .order("created_at", { ascending: false });


  if (type) query = query.eq("type", type);
  if (search) query = query.ilike("name", `%${search}%`);
  if (limit) query = query.limit(limit);


  const { data, error } = await query;
  if (error) throw error;


  const filesWithUrls = await Promise.all(
   data.map(async (file) => {
    try {
     const { data: signedUrlData } = await supabase.storage
      .from("files")
      .createSignedUrl(file.path, 600); // 10 min


     return {
      ...file,
      url: signedUrlData?.signedUrl ?? null,
     };
    } catch (err) {
     console.warn("Missing storage object:", file.path);
     return {
      ...file,
      url: null,
     };
    }
   }),
  );


  return parseStringify(filesWithUrls);
 },
);



export const renameFile = async ({
 fileId,
 name,
}: {
 fileId: string;
 name: string;
}) => {
 const supabase = await createSupabaseServerClient();
 const currentUser = await getCurrentUser();


 if (!currentUser) throw new Error("Not authenticated");


 const { error } = await supabase
  .from("files")
  .update({ name })
  .eq("id", fileId);


 if (error) throw error;


 revalidatePath("/");
};



export const deleteFile = async ({
 fileId,
 path,
}: {
 fileId: string;
 path: string;
}) => {
 const supabase = await createSupabaseServerClient();
 const currentUser = await getCurrentUser();


 if (!currentUser) throw new Error("Not authenticated");


 const { error: storageError } = await supabase.storage
  .from("files")
  .remove([path]);


 if (storageError) throw storageError;


 const { error } = await supabase.from("files").delete().eq("id", fileId);


 if (error) throw error;


 revalidatePath("/");
};



export const createFileRecord = async ({
 name,
 size,
 type,
 extension,
 path,
 userId,
}: {
 name: string;
 size: number;
 type: string;
 extension: string;
 path: string;
 userId: string;
}) => {
 try {
  const supabase = await createSupabaseServerClient();


    const { data: existing } = await supabase
   .from("files")
   .select("id")
   .eq("path", path)
   .maybeSingle();


  if (existing) {
   return parseStringify({ success: true, data: existing });
  }


  const { data, error } = await supabase
   .from("files")
   .insert({
    name,
    size,
    type,
    extension,
    path,
    owner_id: userId,
   })
   .select()
   .single();


  if (error) throw error;


  revalidatePath("/");
  return parseStringify({ success: true, data });
 } catch (error: any) {
  console.error("Failed to create file record", error);
  return parseStringify({ success: false, error: error.message });
 }
};

export const getFilePreviewUrl = async ({ path }: { path: string }) => {
 const supabase = await createSupabaseServerClient();
 const currentUser = await getCurrentUser();
 if (!currentUser) throw new Error("Not authenticated");


 const { data, error } = await supabase.storage
  .from("files")
  .createSignedUrl(path, 600);


 if (error) throw error;


 return parseStringify({ success: true, url: data.signedUrl });
};



export const getFileDownloadUrl = async ({ path }: { path: string }) => {
 try {
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser();


  if (!currentUser) throw new Error("Not authenticated");


  const { data, error } = await supabase.storage
   .from("files")
   .createSignedUrl(path, 3600); // 1 hour expiry


  if (error) throw error;


  return parseStringify({ success: true, url: data.signedUrl });
 } catch (error: any) {
  console.error("Failed to get signed URL", error);
  return parseStringify({ success: false, error: error.message });
 }
};



export const getFileDownloadUrlSecure = async ({ path }: { path: string }) => {
 try {
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser();


  if (!currentUser) throw new Error("Not authenticated");


  const { data, error } = await supabase.storage
   .from("files")
   .createSignedUrl(path, 300); // Short 5 min expiry for immediate download


  if (error) throw error;


  return parseStringify({ success: true, url: data.signedUrl });
 } catch (error: any) {
  console.error("Failed to get secure download URL", error);
  return parseStringify({ success: false, error: error.message });
 }
};



export const getTotalSpaceUsed = cache(async () => {
 const supabase = await createSupabaseServerClient();
 const currentUser = await getCurrentUser();


 if (!currentUser) return null;


 const { data, error } = await supabase
  .from("files")
  .select("size")
  .eq("owner_id", currentUser.id);


 if (error) throw error;


 const used = (data ?? []).reduce((sum, f) => sum + (f.size || 0), 0);


 return {
  used,
  all: 2 * 1024 * 1024 * 1024,
 };
});
