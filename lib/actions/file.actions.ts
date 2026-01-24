"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { parseStringify, getFileType } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { cache } from "react";

const handleError = (error: unknown, message: string) => {
  console.error(message, error);
  throw error;
};

// ================= UPLOAD FILE =================
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

    const { data: { publicUrl } } = supabase.storage
      .from("files")
      .getPublicUrl(data.path);

    revalidatePath("/");
    return parseStringify({ ...data, url: publicUrl });
  } catch (error) {
    handleError(error, "Failed to upload file");
  }
};

// ================= GET FILES =================
export const getFiles = cache(async ({
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
    .select("*")
    .eq("owner_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (type) query = query.eq("type", type);
  if (search) query = query.ilike("name", `%${search}%`);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;

  const filesWithUrls = data.map((file) => {
    const { data: { publicUrl } } = supabase.storage
      .from("files")
      .getPublicUrl(file.path);
    
    return {
      ...file,
      url: publicUrl,
    };
  });

  return parseStringify(filesWithUrls);
});

// ================= RENAME FILE =================
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

// ================= DELETE FILE =================
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

  const { error } = await supabase
    .from("files")
    .delete()
    .eq("id", fileId);

  if (error) throw error;

  revalidatePath("/");
};

// ================= CREATE FILE RECORD =================
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
    
    // Check if record already exists to prevent duplicates during concurrent uploads
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

// ================= TOTAL SPACE =================
export const getTotalSpaceUsed = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser();

  if (!currentUser) return null;

  const { data, error } = await supabase
    .from("files")
    .select("size")
    .eq("owner_id", currentUser.id);

  if (error) throw error;

  const used = (data ?? []).reduce(
    (sum, f) => sum + (f.size || 0),
    0
  );

  return {
    used,
    all: 2 * 1024 * 1024 * 1024,
  };
});
