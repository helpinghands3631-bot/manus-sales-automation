/**
 * SMTP credential validation test.
 * Verifies that the configured SMTP settings can authenticate successfully.
 */
import { describe, it, expect } from "vitest";
import nodemailer from "nodemailer";
import "dotenv/config";

describe("SMTP Configuration", () => {
  it("should have all required SMTP env vars set", () => {
    expect(process.env.SMTP_HOST).toBeTruthy();
    expect(process.env.SMTP_USER).toBeTruthy();
    expect(process.env.SMTP_PASS).toBeTruthy();
    expect(process.env.SMTP_PORT).toBeTruthy();
  });

  it("should successfully verify SMTP credentials", async () => {
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: parseInt(process.env.SMTP_PORT ?? "587"),
      secure: parseInt(process.env.SMTP_PORT ?? "587") === 465,
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // verify() checks authentication without sending an email
    await expect(transport.verify()).resolves.toBe(true);
    transport.close();
  }, 15_000); // 15 second timeout for network call
});
