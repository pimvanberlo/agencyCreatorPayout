import {
  users,
  creators,
  paymentRequests,
  invoices,
  type User,
  type UpsertUser,
  type Creator,
  type InsertCreator,
  type PaymentRequest,
  type InsertPaymentRequest,
  type Invoice,
  type InsertInvoice,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like } from "drizzle-orm";

export interface IStorage {
  // User operations for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Creator operations
  getCreator(id: number): Promise<Creator | undefined>;
  getCreatorByEmail(email: string): Promise<Creator | undefined>;
  getCreatorByStripeAccount(stripeAccountId: string): Promise<Creator | undefined>;
  createCreator(creator: InsertCreator): Promise<Creator>;
  updateCreator(id: number, updates: Partial<Creator>): Promise<Creator>;
  listCreators(limit?: number, offset?: number): Promise<Creator[]>;
  
  // Payment request operations
  getPaymentRequest(id: number): Promise<PaymentRequest | undefined>;
  getPaymentRequestByToken(token: string): Promise<PaymentRequest | undefined>;
  createPaymentRequest(request: InsertPaymentRequest): Promise<PaymentRequest>;
  updatePaymentRequest(id: number, updates: Partial<PaymentRequest>): Promise<PaymentRequest>;
  listPaymentRequests(limit?: number, offset?: number, status?: string): Promise<PaymentRequest[]>;
  getPaymentRequestsWithCreators(): Promise<(PaymentRequest & { creator: Creator })[]>;
  
  // Invoice operations
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, updates: Partial<Invoice>): Promise<Invoice>;
  getInvoicesByPaymentRequest(paymentRequestId: number): Promise<Invoice[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Creator operations
  async getCreator(id: number): Promise<Creator | undefined> {
    const [creator] = await db.select().from(creators).where(eq(creators.id, id));
    return creator;
  }

  async getCreatorByEmail(email: string): Promise<Creator | undefined> {
    const [creator] = await db.select().from(creators).where(eq(creators.email, email));
    return creator;
  }

  async getCreatorByStripeAccount(stripeAccountId: string): Promise<Creator | undefined> {
    const [creator] = await db.select().from(creators).where(eq(creators.stripeAccountId, stripeAccountId));
    return creator;
  }

  async createCreator(creator: InsertCreator): Promise<Creator> {
    const [newCreator] = await db
      .insert(creators)
      .values(creator)
      .returning();
    return newCreator;
  }

  async updateCreator(id: number, updates: Partial<Creator>): Promise<Creator> {
    const [updatedCreator] = await db
      .update(creators)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(creators.id, id))
      .returning();
    return updatedCreator;
  }

  async listCreators(limit = 50, offset = 0): Promise<Creator[]> {
    return await db
      .select()
      .from(creators)
      .orderBy(desc(creators.createdAt))
      .limit(limit)
      .offset(offset);
  }

  // Payment request operations
  async getPaymentRequest(id: number): Promise<PaymentRequest | undefined> {
    const [request] = await db.select().from(paymentRequests).where(eq(paymentRequests.id, id));
    return request;
  }

  async getPaymentRequestByToken(token: string): Promise<PaymentRequest | undefined> {
    const [request] = await db.select().from(paymentRequests).where(eq(paymentRequests.claimToken, token));
    return request;
  }

  async createPaymentRequest(request: InsertPaymentRequest): Promise<PaymentRequest> {
    const [newRequest] = await db
      .insert(paymentRequests)
      .values(request)
      .returning();
    return newRequest;
  }

  async updatePaymentRequest(id: number, updates: Partial<PaymentRequest>): Promise<PaymentRequest> {
    const [updatedRequest] = await db
      .update(paymentRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(paymentRequests.id, id))
      .returning();
    return updatedRequest;
  }

  async listPaymentRequests(limit = 50, offset = 0, status?: string): Promise<PaymentRequest[]> {
    let query = db
      .select()
      .from(paymentRequests)
      .orderBy(desc(paymentRequests.createdAt))
      .limit(limit)
      .offset(offset);

    if (status) {
      query = query.where(eq(paymentRequests.status, status));
    }

    return await query;
  }

  async getPaymentRequestsWithCreators(): Promise<(PaymentRequest & { creator: Creator })[]> {
    const results = await db
      .select()
      .from(paymentRequests)
      .innerJoin(creators, eq(paymentRequests.creatorId, creators.id))
      .orderBy(desc(paymentRequests.createdAt));

    return results.map(result => ({
      ...result.payment_requests,
      creator: result.creators,
    }));
  }

  // Invoice operations
  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async createInvoice(invoice: InsertInvoice): Promise<Invoice> {
    const [newInvoice] = await db
      .insert(invoices)
      .values(invoice)
      .returning();
    return newInvoice;
  }

  async updateInvoice(id: number, updates: Partial<Invoice>): Promise<Invoice> {
    const [updatedInvoice] = await db
      .update(invoices)
      .set(updates)
      .where(eq(invoices.id, id))
      .returning();
    return updatedInvoice;
  }

  async getInvoicesByPaymentRequest(paymentRequestId: number): Promise<Invoice[]> {
    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.paymentRequestId, paymentRequestId))
      .orderBy(desc(invoices.createdAt));
  }
}

export const storage = new DatabaseStorage();
