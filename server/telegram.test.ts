import { describe, expect, it } from "vitest";

describe("Telegram Bot Token", () => {
  it("validates the bot token by calling getMe", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    expect(token).toBeTruthy();

    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.ok).toBe(true);
    expect(data.result).toBeDefined();
    expect(data.result.is_bot).toBe(true);
  }, 15_000);

  it("validates the chat ID is set", () => {
    const chatId = process.env.TELEGRAM_CHAT_ID;
    expect(chatId).toBeTruthy();
    expect(chatId!.length).toBeGreaterThan(0);
  });
});
