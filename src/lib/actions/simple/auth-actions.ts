"use server";

import { redirect } from "next/navigation";
import { signOutAction } from "../auth-native";

/** Thin wrapper: the existing signOutAction returns a value (not void), which
 * doesn't match the <form action> signature, and doesn't redirect on its own. */
export async function signOutAndRedirect() {
  await signOutAction();
  redirect("/simple/login");
}
