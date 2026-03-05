import { describe, it, expect, vi } from "vitest";

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({
      leads: [
        { name: "Test Agency", email: "test@agency.com", phone: "0412345678", website: "https://test.com.au", address: "1 Test St", city: "Sydney", category: "Real Estate", rating: 4.5, reviewCount: 120 },
      ],
      summary: "Found 1 lead in Sydney for Real Estate Agents"
    }) } }],
  }),
}));

// Mock notification
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

describe("LeadOps Router", () => {
  it("should have the leadOps router exported", async () => {
    const { leadOpsRouter } = await import("./routers/leadOps");
    expect(leadOpsRouter).toBeDefined();
  });

  it("should have stats procedure", async () => {
    const { leadOpsRouter } = await import("./routers/leadOps");
    expect(leadOpsRouter._def.procedures.stats).toBeDefined();
  });

  it("should have listJobs procedure", async () => {
    const { leadOpsRouter } = await import("./routers/leadOps");
    expect(leadOpsRouter._def.procedures.listJobs).toBeDefined();
  });

  it("should have runScrape procedure", async () => {
    const { leadOpsRouter } = await import("./routers/leadOps");
    expect(leadOpsRouter._def.procedures.runScrape).toBeDefined();
  });

  it("should have listLeads procedure", async () => {
    const { leadOpsRouter } = await import("./routers/leadOps");
    expect(leadOpsRouter._def.procedures.listLeads).toBeDefined();
  });

  it("should have generateOutreach procedure", async () => {
    const { leadOpsRouter } = await import("./routers/leadOps");
    expect(leadOpsRouter._def.procedures.generateOutreach).toBeDefined();
  });

  it("should have listSequences procedure", async () => {
    const { leadOpsRouter } = await import("./routers/leadOps");
    expect(leadOpsRouter._def.procedures.listSequences).toBeDefined();
  });

  it("should have launchSequence procedure", async () => {
    const { leadOpsRouter } = await import("./routers/leadOps");
    expect(leadOpsRouter._def.procedures.launchSequence).toBeDefined();
  });

  it("should have runOptimization procedure", async () => {
    const { leadOpsRouter } = await import("./routers/leadOps");
    expect(leadOpsRouter._def.procedures.runOptimization).toBeDefined();
  });

  it("should have generateReport procedure", async () => {
    const { leadOpsRouter } = await import("./routers/leadOps");
    expect(leadOpsRouter._def.procedures.generateReport).toBeDefined();
  });

  it("should have exportLeadsCsv procedure", async () => {
    const { leadOpsRouter } = await import("./routers/leadOps");
    expect(leadOpsRouter._def.procedures.exportLeadsCsv).toBeDefined();
  });
});
