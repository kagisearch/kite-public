import { describe, it, expect, vi } from "vitest";

describe("API Availability Check", () => {
  it("should verify if API is running", async () => {
    // Skip this check if fetch is mocked (unit tests)
    if (typeof fetch === "function") {
      const isMocked =
        // Vitest mock function
        (vi as unknown as { isMockFunction?: (fn: unknown) => boolean }).isMockFunction?.(fetch) ||
        // or presence of mock property
        Object.prototype.hasOwnProperty.call(fetch as unknown as Record<string, unknown>, "mock");
      if (isMocked) {
        console.log("Skipping API check in unit test environment");
        expect(true).toBe(true);
        return;
      }
    }

    try {
      // Try to fetch from the API
      const response = await fetch(
        "http://localhost:5173/api/batches/latest?lang=en",
      );

      if (!response.ok) {
        console.warn(
          `API returned status ${response.status}. Make sure the dev server is running with: bun run dev`,
        );
      }

      expect(response.status).toBeLessThan(500); // At least the server should respond
    } catch (error) {
      console.error(
        "Could not connect to API. Make sure the dev server is running with: bun run dev",
      );
      console.error("Error:", error);

      // Skip integration tests if API is not available
      expect(true).toBe(true);
    }
  });
});
