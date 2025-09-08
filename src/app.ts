// Mock file for $app module in tests
export const browser = typeof window !== "undefined";
export const dev = process.env.NODE_ENV === "development";
export const building = false;
export const prerendering = false;

// no-op change to trigger CI workflows
