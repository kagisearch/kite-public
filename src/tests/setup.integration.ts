// Store the original fetch
const originalFetch = global.fetch;

// Create a fetch wrapper that handles relative URLs
global.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let url = input.toString();
  
  // Convert relative URLs to absolute URLs for the test environment
  if (url.startsWith('/')) {
    url = `http://localhost:5173${url}`;
  }
  
  // Use the native fetch (Node 18+)
  return originalFetch(url, init);
};