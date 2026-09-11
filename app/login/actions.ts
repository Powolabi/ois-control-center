"use server"

import { signIn } from "@/lib/auth"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"

export async function authenticate(formData: FormData) {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirect: false,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" }
    }
    throw error
  }
  redirect("/dashboard")
}
