import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export const formatINR = (amount: number) => `${amount < 0 ? '-' : ''}₹${inr.format(Math.abs(amount))}`;
