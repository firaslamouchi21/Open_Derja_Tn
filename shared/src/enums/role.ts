import { z } from "zod";

export const USER_ROLES = [
  "contributor",
  "trusted_contributor",
  "reviewer",
  "admin",
  "superadmin",
] as const;

export const UserRoleSchema = z.enum(USER_ROLES);

export type UserRole = z.infer<typeof UserRoleSchema>;

export const TASK_ROLES = ["contributor", "reviewer", "admin"] as const;

export const TaskRoleSchema = z.enum(TASK_ROLES);

export type TaskRole = z.infer<typeof TaskRoleSchema>;

export const TRUST_LEVELS = [0, 1, 2, 3] as const;

export const TrustLevelSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export type TrustLevel = z.infer<typeof TrustLevelSchema>;
