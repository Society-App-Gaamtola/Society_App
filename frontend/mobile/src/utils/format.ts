const inrFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Formats a rupee amount with Indian digit grouping, e.g. 125000 -> "₹1,25,000". */
export const formatINR = (amount: number) => `₹${inrFormatter.format(amount)}`;
