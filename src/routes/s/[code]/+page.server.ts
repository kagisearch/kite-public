import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// In public repo, redirect to the production API
const API_BASE = 'https://kite.kagi.com';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const code = params.code;
  
  try {
    // Call the production API to resolve the short URL
    const response = await fetch(`${API_BASE}/api/short/${code}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      // Short URL not found or error, redirect to home
      throw redirect(302, '/');
    }
    
    const data = await response.json();
    
    if (data.url) {
      // Redirect to the full URL
      throw redirect(301, data.url);
    }
    // No URL returned, redirect to home
    throw redirect(302, '/');
  } catch (error) {
    // If not a redirect error, log it and redirect to home
    if (!(error instanceof Error && 'status' in error)) {
      console.error('Error resolving short URL:', error);
      throw redirect(302, '/');
    }
    // Re-throw redirect errors
    throw error;
  }
};