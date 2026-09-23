// Public version: contribution history lives in the private database, and
// automatic PR creation needs Kagi's GitHub token, so the page runs in
// manual mode with no history.
import type { ContributionItem } from '$lib/types';

export const load = async ({ cookies }) => {
	const hasSeenOnboarding = cookies.get('kite-contribute-seen') === '1';
	const githubMode: 'auto' | 'manual' = 'manual';
	return { hasSeenOnboarding, githubMode, contributions: [] as ContributionItem[] };
};
