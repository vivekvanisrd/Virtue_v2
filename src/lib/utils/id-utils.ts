/**
 * toDisplayId
 * 
 * Enforces the "Friendship Rule" (Rule 6) by stripping school prefixes from database IDs for UI rendering.
 * Example: DURGA-SRD-STU-0000001 -> SRD-STU-0000001
 */
export function toDisplayId(id: string | null | undefined): string {
  if (!id) return "N/A";
  const parts = id.split("-");
  if (parts.length <= 1) return id;
  // Strip the first part (school code prefix)
  return parts.slice(1).join("-");
}
