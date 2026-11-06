const inrFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Formats a rupee amount with Indian digit grouping, e.g. 125000 -> "₹1,25,000". */
export const formatINR = (amount: number) => `₹${inrFormatter.format(amount)}`;

/** A unique id for a record created on this device, e.g. "d-1762233000000-a1b2c". */
export const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
