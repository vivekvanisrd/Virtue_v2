"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSovereignIdentity } from "../auth/backbone";

/**
 * setSchoolContext
 * 
 * Sets a cookie to scope the developer's session to a specific school.
 */
export async function setSchoolContext(schoolId: string) {
  const identity = await getSovereignIdentity();
  if (!identity || !['DEVELOPER', 'OWNER'].includes(identity.role)) {
    throw new Error("SECURE_AUTH_REQUIRED: Developer Scoping restricted to high-clearance personnel.");
  }
  
  const cookieStore = await cookies();
  
  // Set cookie for 24 hours
  cookieStore.set('v-active-school', schoolId, {
    maxAge: 60 * 60 * 24,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  revalidatePath('/');
}

/**
 * clearSchoolContext
 * 
 * Removes the school scoping cookie, returning to global view.
 */
export async function clearSchoolContext() {
  const identity = await getSovereignIdentity();
  if (!identity) throw new Error("SECURE_AUTH_REQUIRED");
  const cookieStore = await cookies();
  cookieStore.delete('v-active-school');
  revalidatePath('/');
}
