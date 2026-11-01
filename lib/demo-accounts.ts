/**
 * Ready-made accounts for demo mode, shown on the login page so visitors can
 * try both roles. They exist only while NEXT_PUBLIC_DEMO_MODE is on and are
 * never written to the Sheet.
 */
export const demoAccounts = {
  // Same phone as the admission form's "Fill sample data" guardian.
  parent: { userId: "UDEMOPARENT", login: "01700000002", password: "parent1234", name: "Karim Ahmed" },
  staff: { userId: "UDEMOSTAFF", login: "office@aloacademy.example", password: "office1234", name: "Office staff" },
} as const;
