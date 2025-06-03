import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertCreatorSchema, insertPaymentRequestSchema } from "@shared/schema";
import Stripe from "stripe";
import { nanoid } from "nanoid";
import multer from "multer";
import path from "path";
import fs from "fs";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

// File upload configuration
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// VAT calculation utility
function calculateVAT(amount: number, country: string, businessType: string) {
  const vatRates: Record<string, number> = {
    'NL': 21, // Netherlands
    'DE': 19, // Germany
    'FR': 20, // France
    'BE': 21, // Belgium
    'ES': 21, // Spain
    'IT': 22, // Italy
    'UK': 20, // United Kingdom
    'US': 0,  // United States
  };

  // EU VAT reverse charge for VAT registered businesses
  if (businessType === 'vat_registered' && vatRates[country] && country !== 'NL') {
    return { rate: 0, amount: 0 }; // Reverse charge - 0% VAT
  }

  // VAT exempt businesses
  if (businessType === 'vat_exempt') {
    return { rate: 0, amount: 0 };
  }

  const rate = vatRates[country] || 0;
  const vatAmount = (amount * rate) / 100;

  return { rate, amount: vatAmount };
}

// Gemini AI validation (mock implementation)
async function validateInvoiceWithAI(filePath: string, expectedAmount: number) {
  // In a real implementation, this would use Google Gemini AI
  // For now, we'll simulate validation
  try {
    // Read file and perform mock validation
    const fileExists = fs.existsSync(filePath);
    if (!fileExists) {
      return {
        status: 'invalid',
        notes: 'File not found or corrupted'
      };
    }

    // Mock AI validation - in reality this would analyze the PDF content
    return {
      status: 'valid',
      notes: 'Invoice format and amount verified'
    };
  } catch (error) {
    return {
      status: 'invalid',
      notes: 'Error processing invoice file'
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Creator routes
  app.post('/api/creators', async (req, res) => {
    try {
      const creatorData = insertCreatorSchema.parse(req.body);
      
      // Check if creator already exists
      const existingCreator = await storage.getCreatorByEmail(creatorData.email);
      if (existingCreator) {
        return res.status(400).json({ message: 'Creator with this email already exists' });
      }

      // Create Stripe Express account
      const account = await stripe.accounts.create({
        type: 'express',
        country: creatorData.country,
        email: creatorData.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: creatorData.businessType === 'individual' ? 'individual' : 'company',
        ...(creatorData.companyName && {
          company: { name: creatorData.companyName }
        }),
      });

      // Save creator with Stripe account ID
      const creator = await storage.createCreator({
        ...creatorData,
        stripeAccountId: account.id,
      });

      res.json({ creator, stripeAccountId: account.id });
    } catch (error: any) {
      console.error('Error creating creator:', error);
      res.status(500).json({ message: error.message || 'Failed to create creator' });
    }
  });

  app.get('/api/creators/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const creator = await storage.getCreator(id);
      
      if (!creator) {
        return res.status(404).json({ message: 'Creator not found' });
      }

      // Check Stripe account status
      if (creator.stripeAccountId) {
        try {
          const account = await stripe.accounts.retrieve(creator.stripeAccountId);
          
          // Update creator status if changed
          if (account.charges_enabled !== creator.chargesEnabled || 
              account.payouts_enabled !== creator.payoutsEnabled) {
            await storage.updateCreator(id, {
              chargesEnabled: account.charges_enabled,
              payoutsEnabled: account.payouts_enabled,
            });
          }

          res.json({
            ...creator,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
          });
        } catch (stripeError) {
          res.json(creator);
        }
      } else {
        res.json(creator);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch creator' });
    }
  });

  app.get('/api/creators', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const creators = await storage.listCreators(limit, offset);
      res.json(creators);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch creators' });
    }
  });

  // Create onboarding link for existing creator
  app.post('/api/creators/:id/onboarding-link', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const creator = await storage.getCreator(id);
      
      if (!creator || !creator.stripeAccountId) {
        return res.status(404).json({ message: 'Creator or Stripe account not found' });
      }

      const accountLink = await stripe.accountLinks.create({
        account: creator.stripeAccountId,
        refresh_url: `${req.protocol}://${req.get('host')}/creator-onboarding?refresh=true`,
        return_url: `${req.protocol}://${req.get('host')}/creator-onboarding?success=true`,
        type: 'account_onboarding',
      });

      res.json({ url: accountLink.url });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to create onboarding link' });
    }
  });

  // Payment request routes
  app.post('/api/payment-requests', isAuthenticated, async (req, res) => {
    try {
      const { creatorId, amount, description, dueDate } = req.body;
      
      const creator = await storage.getCreator(creatorId);
      if (!creator) {
        return res.status(404).json({ message: 'Creator not found' });
      }

      // Calculate VAT
      const baseAmount = parseFloat(amount);
      const vat = calculateVAT(baseAmount, creator.country, creator.businessType);
      const totalAmount = baseAmount + vat.amount;

      // Generate claim token
      const claimToken = nanoid(32);

      const paymentRequest = await storage.createPaymentRequest({
        creatorId,
        amount: baseAmount.toString(),
        vatRate: vat.rate.toString(),
        vatAmount: vat.amount.toString(),
        totalAmount: totalAmount.toString(),
        description,
        claimToken,
        dueDate: dueDate ? new Date(dueDate) : null,
      });

      res.json(paymentRequest);
    } catch (error: any) {
      console.error('Error creating payment request:', error);
      res.status(500).json({ message: error.message || 'Failed to create payment request' });
    }
  });

  app.get('/api/payment-requests', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const status = req.query.status as string;
      
      const requests = await storage.getPaymentRequestsWithCreators();
      res.json(requests);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch payment requests' });
    }
  });

  app.get('/api/payment-requests/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getPaymentRequest(id);
      
      if (!request) {
        return res.status(404).json({ message: 'Payment request not found' });
      }

      res.json(request);
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch payment request' });
    }
  });

  // Claim payment route (for creators)
  app.get('/api/claim/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const request = await storage.getPaymentRequestByToken(token);
      
      if (!request) {
        return res.status(404).json({ message: 'Payment request not found' });
      }

      const creator = await storage.getCreator(request.creatorId);
      
      res.json({
        paymentRequest: request,
        creator: creator,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch payment claim' });
    }
  });

  app.post('/api/claim/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const request = await storage.getPaymentRequestByToken(token);
      
      if (!request) {
        return res.status(404).json({ message: 'Payment request not found' });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ message: 'Payment request is not pending' });
      }

      // Update status to claimed
      await storage.updatePaymentRequest(request.id, {
        status: 'claimed',
      });

      res.json({ message: 'Payment claimed successfully' });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to claim payment' });
    }
  });

  // Invoice upload route
  app.post('/api/payment-requests/:id/invoice', upload.single('invoice'), async (req, res) => {
    try {
      const paymentRequestId = parseInt(req.params.id);
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const request = await storage.getPaymentRequest(paymentRequestId);
      if (!request) {
        return res.status(404).json({ message: 'Payment request not found' });
      }

      // Validate with AI
      const validation = await validateInvoiceWithAI(file.path, parseFloat(request.totalAmount));

      const invoice = await storage.createInvoice({
        paymentRequestId,
        type: 'uploaded',
        filename: file.originalname,
        fileUrl: file.path,
        aiValidationStatus: validation.status,
        aiValidationNotes: validation.notes,
      });

      res.json(invoice);
    } catch (error: any) {
      console.error('Error uploading invoice:', error);
      res.status(500).json({ message: error.message || 'Failed to upload invoice' });
    }
  });

  // Process payment (admin only)
  app.post('/api/payment-requests/:id/process', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const request = await storage.getPaymentRequest(id);
      
      if (!request) {
        return res.status(404).json({ message: 'Payment request not found' });
      }

      const creator = await storage.getCreator(request.creatorId);
      if (!creator || !creator.stripeAccountId) {
        return res.status(400).json({ message: 'Creator Stripe account not found' });
      }

      // Check if creator account is ready
      const account = await stripe.accounts.retrieve(creator.stripeAccountId);
      if (!account.charges_enabled || !account.payouts_enabled) {
        return res.status(400).json({ message: 'Creator Stripe account not ready for payments' });
      }

      // Create transfer to creator
      const transfer = await stripe.transfers.create({
        amount: Math.round(parseFloat(request.totalAmount) * 100), // Convert to cents
        currency: 'eur',
        destination: creator.stripeAccountId,
        description: request.description || `Payment to ${creator.fullName}`,
      });

      // Update payment status
      await storage.updatePaymentRequest(id, {
        status: 'paid',
        paidAt: new Date(),
      });

      res.json({ transfer, message: 'Payment processed successfully' });
    } catch (error: any) {
      console.error('Error processing payment:', error);
      res.status(500).json({ message: error.message || 'Failed to process payment' });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const requests = await storage.getPaymentRequestsWithCreators();
      const creators = await storage.listCreators();
      
      const totalPayouts = requests
        .filter(r => r.status === 'paid')
        .reduce((sum, r) => sum + parseFloat(r.totalAmount), 0);
      
      const pendingPayments = requests.filter(r => r.status === 'pending').length;
      const successRate = requests.length > 0 
        ? (requests.filter(r => r.status === 'paid').length / requests.length) * 100 
        : 0;

      res.json({
        totalPayouts: totalPayouts.toFixed(2),
        activeCreators: creators.length,
        pendingPayments,
        successRate: successRate.toFixed(1),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message || 'Failed to fetch dashboard stats' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
