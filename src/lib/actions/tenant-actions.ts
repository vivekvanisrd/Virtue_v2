"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

/**
 * setSchoolContext
 * 
 * Sets a cookie to scope the developer's session to a specific school.
 */
export async function setSchoolContext(schoolId: string) {
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
  const cookieStore = await cookies();
  cookieStore.delete('v-active-school');
  revalidatePath('/');
}
