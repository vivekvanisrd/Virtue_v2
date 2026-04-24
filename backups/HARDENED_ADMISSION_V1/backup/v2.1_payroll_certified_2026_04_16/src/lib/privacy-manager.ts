/**
 * PRIVACY MANAGER SERVICE
 * Ported from Legacy concepts
 * Handles data masking and privacy controls
 */

export class PrivacyManager {
  /**
   * Masks a phone number (e.g., +91 9876543210 -> +91 ******3210)
   */
  static maskPhone(phone: string | null): string {
    if (!phone) return "N/A";
    const cleaned = phone.replace(/\s/g, "");
    if (cleaned.length < 5) return phone;
    
    const visibleLength = 4;
    const prefix = cleaned.length > 10 ? cleaned.substring(0, cleaned.length - 10) : "";
    const suffix = cleaned.substring(cleaned.length - visibleLength);
    const masked = "*".repeat(cleaned.length - visibleLength - prefix.length);
    
    return `${prefix} ${masked}${suffix}`.trim();
  }

  /**
   * Masks an email (e.g., user@example.com -> u***@example.com)
   */
  static maskEmail(email: string | null): string {
    if (!email) return "N/A";
    const [user, domain] = email.split("@");
    if (!domain) return email;
    if (user.length <= 1) return `*@${domain}`;
    
    return `${user[0]}${"*".repeat(user.length - 1)}@${domain}`;
  }

  /**
   * Masks a name for privacy in public audits
   */
  static maskName(name: string | null): string {
    if (!name) return "N/A";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0][0] + "*".repeat(parts[0].length - 1);
    }
    
    return parts.map(p => p[0] + "*").join(" ");
  }
}
