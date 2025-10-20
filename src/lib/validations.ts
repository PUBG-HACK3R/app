import { z } from "zod";

// Auth validations
export const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// Deposit validation
export const depositSchema = z.object({
  amount: z.number().min(1, "Amount must be at least $1").max(100000, "Amount cannot exceed $100,000"),
  payCurrency: z.string().min(1, "Payment currency is required"),
  priceCurrency: z.string().min(1, "Price currency is required"),
  planId: z.string().optional(),
});

// Withdrawal validation
export const withdrawalSchema = z.object({
  amount: z.number().min(10, "Amount must be at least $10").max(100000, "Amount cannot exceed $100,000"),
  address: z.string().min(10, "Address must be at least 10 characters").max(100, "Address is too long"),
});

// Admin validation
export const approveWithdrawalSchema = z.object({
  id: z.string().uuid("Invalid withdrawal ID"),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type DepositInput = z.infer<typeof depositSchema>;
export type WithdrawalInput = z.infer<typeof withdrawalSchema>;
export type ApproveWithdrawalInput = z.infer<typeof approveWithdrawalSchema>;
