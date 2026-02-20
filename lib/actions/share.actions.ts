"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { parseStringify } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { cache } from "react";

export const shareFileWithEmail = async ({
  fileId,
  email,
}: {
  fileId: string;
  email: string;
}) => {
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser();

  if (!currentUser) throw new Error("Not authenticated");

  // Verify ownership
  const { data: file, error: fileError } = await supabase
    .from("files")
    .select("id")
    .eq("id", fileId)
    .eq("owner_id", currentUser.id)
    .single();

  if (fileError || !file) {
    throw new Error("Not authorized to share this file");
  }

  const { error } = await supabase.from("file_access").insert({
    file_id: fileId,
    shared_with_email: email,
    shared_by: currentUser.id,
  });

  if (error) throw error;

  revalidatePath("/");
  return parseStringify({ success: true });
};

export const removeFileAccess = async ({
  fileId,
  email,
}: {
  fileId: string;
  email: string;
}) => {
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser();

  if (!currentUser) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("file_access")
    .delete()
    .eq("file_id", fileId)
    .eq("shared_with_email", email)
    .eq("shared_by", currentUser.id);

  if (error) throw error;

  revalidatePath("/");
  return parseStringify({ success: true });
};

export const getFileSharedUsers = async (fileId: string) => {
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser();

  if (!currentUser) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("file_access")
    .select("shared_with_email, created_at")
    .eq("file_id", fileId)
    .eq("shared_by", currentUser.id);

  if (error) throw error;

  return parseStringify(data);
};

export const getFilesSharedWithMe = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser();

  if (!currentUser?.email) return [];

  const { data, error } = await supabase
    .from("file_access")
    .select(
      `
      file_id,
      files (*)
    `,
    )
    .eq("shared_with_email", currentUser.email);

  if (error) throw error;

  const sharedFiles = data.map((row: any) => row.files).filter(Boolean);

  const filesWithUrls = await Promise.all(
    sharedFiles.map(async (file: any) => {
      const { data: signedUrlData } = await supabase.storage
        .from("files")
        .createSignedUrl(file.path, 600);

      return {
        ...file,
        url: signedUrlData?.signedUrl ?? null,
      };
    }),
  );

  return parseStringify(filesWithUrls);
});

export const enablePublicLink = async ({ fileId }: { fileId: string }) => {
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser();

  if (!currentUser) throw new Error("Not authenticated");

  // Verify ownership
  const { data: file, error: fileError } = await supabase
    .from("files")
    .select("id")
    .eq("id", fileId)
    .eq("owner_id", currentUser.id)
    .single();

  if (fileError || !file) {
    throw new Error("Not authorized to manage this file");
  }

  const { error } = await supabase
    .from("files")
    .update({
      is_public: true,
      share_token: crypto.randomUUID(),
    })
    .eq("id", fileId);

  if (error) throw error;

  revalidatePath("/");
  return parseStringify({ success: true });
};

export const disablePublicLink = async ({ fileId }: { fileId: string }) => {
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser();

  if (!currentUser) throw new Error("Not authenticated");

  // Verify ownership
  const { data: file, error: fileError } = await supabase
    .from("files")
    .select("id")
    .eq("id", fileId)
    .eq("owner_id", currentUser.id)
    .single();

  if (fileError || !file) {
    throw new Error("Not authorized to manage this file");
  }

  const { error } = await supabase
    .from("files")
    .update({ is_public: false })
    .eq("id", fileId);

  if (error) throw error;

  revalidatePath("/");
  return parseStringify({ success: true });
};

export const rotatePublicLinkToken = async ({ fileId }: { fileId: string }) => {
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser();

  if (!currentUser) throw new Error("Not authenticated");

  // Verify ownership
  const { data: file, error: fileError } = await supabase
    .from("files")
    .select("id")
    .eq("id", fileId)
    .eq("owner_id", currentUser.id)
    .single();

  if (fileError || !file) {
    throw new Error("Not authorized to manage this file");
  }

  const { error } = await supabase
    .from("files")
    .update({ share_token: crypto.randomUUID() })
    .eq("id", fileId);

  if (error) throw error;

  revalidatePath("/");
  return parseStringify({ success: true });
};

export const getSignedUrlForFileId = async ({
  fileId,
  kind,
}: {
  fileId: string;
  kind: "preview" | "download";
}) => {
  const supabase = await createSupabaseServerClient();
  const currentUser = await getCurrentUser();

  // Authenticated flow: owner OR shared via email OR public
  let canAccess = false;
  let filePath: string | null = null;

  if (currentUser) {
    // Check owner
    const { data: ownerFile } = await supabase
      .from("files")
      .select("path, is_public")
      .eq("id", fileId)
      .eq("owner_id", currentUser.id)
      .single();

    if (ownerFile) {
      canAccess = true;
      filePath = ownerFile.path;
    } else {
      // Check email share
      const { data: sharedAccess } = await supabase
        .from("file_access")
        .select("files!inner(path)")
        .eq("file_id", fileId)
        .eq("shared_with_email", currentUser.email!)
        .single();

      if (sharedAccess) {
        canAccess = true;
        filePath = (sharedAccess as any).files.path;
      } else {
        // Check public flag
        const { data: publicFile } = await supabase
          .from("files")
          .select("path")
          .eq("id", fileId)
          .eq("is_public", true)
          .single();

        if (publicFile) {
          canAccess = true;
          filePath = publicFile.path;
        }
      }
    }
  }

  if (!canAccess || !filePath) {
    throw new Error("Access denied");
  }

  const expiresIn = kind === "download" ? 3600 : 600;
  const { data } = await supabase.storage
    .from("files")
    .createSignedUrl(filePath, expiresIn);

  if (!data?.signedUrl) {
    throw new Error("Failed to generate signed URL");
  }

  return parseStringify({ signedUrl: data.signedUrl });
};

export const getPublicSignedUrlByToken = async ({
  token,
  kind,
}: {
  token: string;
  kind: "preview" | "download";
}) => {
  const supabase = createSupabaseServiceRoleClient();

  const { data: file, error } = await supabase
    .from("files")
    .select("name, size, type, extension, path")
    .eq("share_token", token)
    .eq("is_public", true)
    .single();

  if (error || !file) {
    throw new Error("Invalid or expired public link");
  }

  const expiresIn = kind === "download" ? 3600 : 600;
  const signedUrlOptions =
    kind === "download" ? ({ download: true } as const) : undefined;
  const { data } = await supabase.storage
    .from("files")
    .createSignedUrl(file.path, expiresIn, signedUrlOptions);

  if (!data?.signedUrl) {
    throw new Error("Failed to generate signed URL");
  }

  return parseStringify({ signedUrl: data.signedUrl, file });
};


