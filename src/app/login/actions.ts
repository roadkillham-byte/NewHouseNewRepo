"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export async function loginAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: (formData.get("callbackUrl") as string) || "/",
    });
  } catch (error) {
    // signIn() throws a special NEXT_REDIRECT error on success — that must
    // propagate, not be swallowed here. Only report AuthError as a form
    // message; anything else re-throws.
    if (error instanceof AuthError) {
      return "Incorrect email or password.";
    }
    throw error;
  }
}
