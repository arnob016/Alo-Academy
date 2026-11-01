/** Values shared by the office's server code and its browser components. */

export const studentStatuses = ["Active", "Left"] as const;
export type StudentStatus = (typeof studentStatuses)[number];

export const feeMethods = ["cash", "bkash", "nagad", "bank"] as const;
export type FeeMethod = (typeof feeMethods)[number];

/** Present, absent, late. */
export const attendanceMarks = ["P", "A", "L"] as const;
export type Mark = (typeof attendanceMarks)[number];
