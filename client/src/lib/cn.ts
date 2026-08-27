import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges class names, with later Tailwind utilities winning over earlier conflicts. */
export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
