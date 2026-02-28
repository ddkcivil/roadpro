import { z } from 'zod';
import { UserRole } from '../../types';

// --- User Schemas ---
export const UserSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 characters"),
  role: z.nativeEnum(UserRole),
  avatar: z.string().url().optional().or(z.literal('')),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// --- Project Schemas ---
export const BOQItemSchema = z.object({
  id: z.string().uuid().optional(),
  itemNo: z.string(),
  description: z.string(),
  unit: z.string(),
  quantity: z.number().nonnegative(),
  rate: z.number().nonnegative(),
  amount: z.number().nonnegative(),
  category: z.string(),
  location: z.string(),
  completedQuantity: z.number().nonnegative(),
});

export const ProjectSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(3, "Project name must be at least 3 characters"),
  code: z.string().min(2, "Project code must be at least 2 characters"),
  location: z.string(),
  client: z.string(),
  contractor: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  boq: z.array(BOQItemSchema).default([]),
});

// --- Settings Schemas ---
export const AppSettingsSchema = z.object({
  companyName: z.string().min(1),
  currency: z.string().length(3),
  vatRate: z.number().min(0).max(100),
  fiscalYearStart: z.string(),
  googleSpreadsheetId: z.string().optional(),
  defaultLocation: z.string().optional(),
  notifications: z.object({
    enableEmail: z.boolean(),
    enableInApp: z.boolean(),
    notifyUpcoming: z.boolean(),
    daysBefore: z.number().int().positive(),
    notifyOverdue: z.boolean(),
    dailyDigest: z.boolean(),
  }),
});
