import { 
  pgTable, 
  text, 
  serial, 
  integer, 
  boolean, 
  decimal, 
  timestamp, 
  jsonb,
  varchar,
  index
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table for admin authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Creators table for payout recipients
export const creators = pgTable("creators", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  country: text("country").notNull(),
  businessType: text("business_type").notNull(), // individual, vat_registered, vat_exempt
  vatId: text("vat_id"),
  companyName: text("company_name"),
  stripeAccountId: text("stripe_account_id").unique(),
  invoiceMethod: text("invoice_method").notNull().default("auto"), // auto, manual
  chargesEnabled: boolean("charges_enabled").default(false),
  payoutsEnabled: boolean("payouts_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment requests table
export const paymentRequests = pgTable("payment_requests", {
  id: serial("id").primaryKey(),
  creatorId: integer("creator_id").notNull().references(() => creators.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).notNull(),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, claimed, paid, failed
  claimToken: text("claim_token").unique(),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Invoices table for tracking uploaded/generated invoices
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  paymentRequestId: integer("payment_request_id").notNull().references(() => paymentRequests.id),
  type: text("type").notNull(), // uploaded, generated
  filename: text("filename"),
  fileUrl: text("file_url"),
  aiValidationStatus: text("ai_validation_status"), // pending, valid, invalid
  aiValidationNotes: text("ai_validation_notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const creatorsRelations = relations(creators, ({ many }) => ({
  paymentRequests: many(paymentRequests),
}));

export const paymentRequestsRelations = relations(paymentRequests, ({ one, many }) => ({
  creator: one(creators, {
    fields: [paymentRequests.creatorId],
    references: [creators.id],
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  paymentRequest: one(paymentRequests, {
    fields: [invoices.paymentRequestId],
    references: [paymentRequests.id],
  }),
}));

// Insert schemas
export const insertCreatorSchema = createInsertSchema(creators).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPaymentRequestSchema = createInsertSchema(paymentRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Creator = typeof creators.$inferSelect;
export type InsertCreator = z.infer<typeof insertCreatorSchema>;
export type PaymentRequest = typeof paymentRequests.$inferSelect;
export type InsertPaymentRequest = z.infer<typeof insertPaymentRequestSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
