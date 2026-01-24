"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseStringify } from "@/lib/utils";
import { redirect } from "next/navigation";
import { avatarPlaceholderUrl } from "@/constants";

const handleError = (error: unknown, message: string) => {
  console.log(message, error);
  throw error;
};

export const createAccount = async ({
  fullName,
  email,
  password,
}: {
  fullName: string;
  email: string;
  password: string;
}) => {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          avatar: avatarPlaceholderUrl,
        },
      },
    });

    if (error) {
       console.error("SignUp error:", error);
       return parseStringify({ success: false, error: error.message });
    }

    return parseStringify({ success: true });
  } catch (error) {
    handleError(error, "Failed to create account");
    return parseStringify({ success: false, error: "Failed to create account" });
  }
};

export const signInUser = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  try {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("SignIn error:", error);
      return parseStringify({ success: false, error: error.message });
    }

    return parseStringify({ success: true });
  } catch (error) {
    handleError(error, "Invalid email or password");
    return parseStringify({ success: false, error: "Invalid email or password" });
  }
};

export const getCurrentUser = async () => {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    return parseStringify({
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name ?? null,
      avatar: user.user_metadata?.avatar ?? null,
    });
  } catch (error) {
    console.log(error);
    return null;
  }
};


export const signOutUser = async () => {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
};
