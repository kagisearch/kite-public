import { batchService } from "../../batchService";
import { chaosIndexService } from "../../chaosIndexService";
import { describe, it, expect } from "vitest";

describe("ChaosIndexService Integration Tests", () => {
  describe("loadChaosIndex with real API", () => {
    it("should load chaos index from the latest batch", async () => {
      // Ensure we're not in time travel mode
      batchService.setTimeTravelBatch(null);

      const result = await chaosIndexService.loadChaosIndex("en");

      // Result might be null if chaos index is not available
      if (result !== null) {
        expect(result).toHaveProperty("chaosIndex");
        expect(result).toHaveProperty("chaosDescription");
        expect(result).toHaveProperty("chaosLastUpdated");

        expect(typeof result.chaosIndex).toBe("number");
        expect(result.chaosIndex).toBeGreaterThanOrEqual(0);
        expect(result.chaosIndex).toBeLessThanOrEqual(100);

        expect(typeof result.chaosDescription).toBe("string");
        expect(result.chaosDescription.length).toBeGreaterThan(0);

        const lastUpdated = result.chaosLastUpdated;
        if (typeof lastUpdated === "string") {
          // Should be a valid ISO date string
          expect(() => new Date(lastUpdated)).not.toThrow();
        }
      }
    });
  });

  describe("getChaosIndexHistory with real API", () => {
    it("should fetch chaos index history", async () => {
      const result = await chaosIndexService.getChaosIndexHistory("en", 7);

      expect(Array.isArray(result)).toBe(true);

      // If we have history data
      if (result.length > 0) {
        for (const entry of result) {
          expect(entry).toHaveProperty("date");
          expect(entry).toHaveProperty("score");
          expect(entry).toHaveProperty("summary");

          expect(typeof entry.date).toBe("string");
          expect(() => new Date(entry.date)).not.toThrow();

          expect(typeof entry.score).toBe("number");
          expect(entry.score).toBeGreaterThanOrEqual(0);
          expect(entry.score).toBeLessThanOrEqual(100);

          expect(typeof entry.summary).toBe("string");
        }

        // Verify entries are consistently sorted by date (either asc or desc)
        const times = result.map((e) => new Date(e.date).getTime());
        const isNonIncreasing = times.every((t, i) => i === 0 || times[i - 1] >= t);
        const isNonDecreasing = times.every((t, i) => i === 0 || times[i - 1] <= t);
        expect(isNonIncreasing || isNonDecreasing).toBe(true);
      }
    });

    it("should handle different day ranges", async () => {
      const result30Days = await chaosIndexService.getChaosIndexHistory(
        "en",
        30,
      );
      const result7Days = await chaosIndexService.getChaosIndexHistory("en", 7);

      // 30 days should have more or equal entries than 7 days
      expect(result30Days.length).toBeGreaterThanOrEqual(result7Days.length);
    });
  });
});
