
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a random project code with format XXX-XXX-XXX
 */
export function generateProjectCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  // Generate three sections of three characters each
  for (let section = 0; section < 3; section++) {
    for (let i = 0; i < 3; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Add hyphen between sections, but not after the last section
    if (section < 2) {
      result += '-';
    }
  }
  
  return result;
}
