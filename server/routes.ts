import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { updateInvoiceHeaderSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // API Routes
  // All routes are prefixed with /api

  // Get paginated list of invoice headers with optional filters
  app.get("/api/invoices", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Process filter parameters
      const filters: any = {};
      
      if (req.query.vendor) filters.vendor = req.query.vendor as string;
      if (req.query.currency) filters.currency = req.query.currency as string;
      if (req.query.invoiceType) filters.invoiceType = req.query.invoiceType as string;
      if (req.query.search) filters.search = req.query.search as string;
      
      if (req.query.startDate && req.query.endDate) {
        filters.startDate = req.query.startDate as string;
        filters.endDate = req.query.endDate as string;
      }
      
      const result = await storage.getInvoices(page, limit, filters);
      
      res.json({
        invoices: result.invoices,
        pagination: {
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Get a single invoice with all details
  app.get("/api/invoices/:invoice_num", async (req, res) => {
    try {
      const invoiceNum = req.params.invoice_num;
      const invoice = await storage.getInvoiceByNumber(invoiceNum);
      
      if (!invoice) {
        return res.status(404).json({ message: `Invoice ${invoiceNum} not found` });
      }
      
      res.json(invoice);
    } catch (error) {
      console.error(`Error fetching invoice ${req.params.invoice_num}:`, error);
      res.status(500).json({ message: "Failed to fetch invoice details" });
    }
  });

  // Update invoice header info
  app.put("/api/invoices/:invoice_num", async (req, res) => {
    try {
      const invoiceNum = req.params.invoice_num;
      
      // Validate request body
      const validationResult = updateInvoiceHeaderSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid invoice data", errors: validationResult.error.errors });
      }
      
      const updatedInvoice = await storage.updateInvoiceHeader(invoiceNum, req.body);
      
      if (!updatedInvoice) {
        return res.status(404).json({ message: `Invoice ${invoiceNum} not found` });
      }
      
      res.json(updatedInvoice);
    } catch (error) {
      console.error(`Error updating invoice ${req.params.invoice_num}:`, error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // Get analytics summary
  app.get("/api/analytics/summary", async (req, res) => {
    try {
      // Process filter parameters
      const filters: any = {};
      
      if (req.query.vendor) filters.vendor = req.query.vendor as string;
      if (req.query.currency) filters.currency = req.query.currency as string;
      
      if (req.query.startDate && req.query.endDate) {
        filters.startDate = req.query.startDate as string;
        filters.endDate = req.query.endDate as string;
      }
      
      const summary = await storage.getAnalyticsSummary(filters);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching analytics summary:", error);
      res.status(500).json({ message: "Failed to fetch analytics summary" });
    }
  });

  // Get unique vendor list
  app.get("/api/vendors", async (req, res) => {
    try {
      const vendors = await storage.getVendorList();
      res.json(vendors);
    } catch (error) {
      console.error("Error fetching vendor list:", error);
      res.status(500).json({ message: "Failed to fetch vendor list" });
    }
  });

  return httpServer;
}
