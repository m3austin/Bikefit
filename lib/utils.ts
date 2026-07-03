import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class lists, resolving conflicts. Used by all ui/* components. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
