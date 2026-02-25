export interface Article {
	title: string;
	link: string;
	domain: string;
	date: string;
	image?: string;
	image_caption?: string;
}

export interface Domain {
	name: string;
	favicon?: string;
	isPaywalled?: boolean;
}

export interface Perspective {
	text: string;
	sources: {
		name: string;
		url: string;
	}[];
}

export interface TimelineEvent {
	date: string;
	date_iso?: string;
	content: string;
}

export interface QnA {
	question: string;
	answer: string;
}

// OnThisDay specific types
export interface OnThisDayEvent {
	year: string;
	content: string;
	sort_year: number;
	type: 'event' | 'person' | 'people';
	image?: string;
}

export interface OnThisDayData {
	timestamp: number;
	events: OnThisDayEvent[];
}

export interface Story {
	id?: string;
	cluster_number: number;
	unique_domains?: number;
	number_of_titles?: number;
	sourceLanguage?: string;
	selectedLanguage?: string; // The language actually used for this story's content
	category: string;
	title: string;
	short_summary: string;
	did_you_know?: string | null;
	talking_points?: string[] | null;
	quote?: string | null;
	quote_author?: string | null;
	quote_attribution?: string | null;
	quote_source_url?: string | null;
	quote_source_domain?: string | null;
	location?: string | null;
	perspectives?: Perspective[] | null;
	emoji?: string | null;
	geopolitical_context?: string | null;
	historical_background?: string | null;
	international_reactions?: string[] | null;
	humanitarian_impact?: string | null;
	economic_implications?: string | null;
	timeline?: TimelineEvent[] | null;
	future_outlook?: string | null;
	key_players?: string[] | null;
	technical_details?: string[] | null;
	business_angle_text?: string | null;
	business_angle_points?: string[] | null;
	user_action_items?: string[] | null;
	scientific_significance?: string[] | null;
	travel_advisory?: string[] | null;
	destination_highlights?: string | null;
	culinary_significance?: string | null;
	performance_statistics?: string[] | null;
	league_standings?: string | null;
	diy_tips?: string | null;
	design_principles?: string | null;
	user_experience_impact?: string | null;
	gameplay_mechanics?: string[] | null;
	industry_impact?: string[] | null;
	gaming_industry_impact?: string[] | null;
	technical_specifications?: string[] | null;
	suggested_qna?: QnA[] | null;
	primary_image?: {
		url: string;
		caption: string;
		credit?: string;
	} | null;
	secondary_image?: {
		url: string;
		caption: string;
		credit?: string;
	} | null;
	articles: Article[];
	domains?: Domain[];
	expanded?: boolean;
}

export interface Category {
	name: string;
	id: string;
	display_name?: string;
	feeds?: string[];
}

// Localization function type with overloads
export interface LocalizerFunction {
	(key: string, view?: Record<string, string>, strict?: false): string;
	(key: string, view: Record<string, string> | undefined, strict: true): string | undefined;
}

export interface CategoryData {
	category: string;
	timestamp: number;
	read: number;
	clusters: Story[];
	// Legacy field names (for backward compatibility)
	stories?: Story[];
	read_count?: number;
}

// Internal interfaces (used by API endpoints only)
export interface InternalCategory {
	name: string;
	file: string;
	feeds?: string[];
}

export interface KiteData {
	timestamp: number;
	categories: InternalCategory[];
	chaos_index?: number;
	chaos_description?: string;
	chaos_updated_at?: number;
}

// OnThisDay events are now handled as regular stories

export interface MediaInfo {
	country: string;
	organization: string;
	domains: string[];
	description: string;
	owner: string;
	typology: string;
}

// Settings and UI state types
export interface SectionSettings {
	summary: boolean;
	primaryImage: boolean;
	highlights: boolean;
	quotes: boolean;
	secondaryImage: boolean;
	perspectives: boolean;
	historicalBackground: boolean;
	humanitarianImpact: boolean;
	technicalDetails: boolean;
	businessAngle: boolean;
	internationalReactions: boolean;
	otherDetails: boolean;
	timeline: boolean;
	suggestedQnA: boolean;
	sources: boolean;
	didYouKnow: boolean;
	actionItems: boolean;
}

export interface ChaosIndexData {
	score: number;
	summary: string;
}

export interface LanguageOption {
	code: string;
	name: string;
}

// API Response types
export interface ApiResponse<T> {
	data: T;
	success: boolean;
	error?: string;
}

export interface LoadCategoriesResponse {
	categories: Category[];
	timestamp: number;
}

export interface LoadStoriesResponse {
	stories: Story[];
	readCount: number;
	timestamp: number;
}

// OnThisDay responses are now handled as LoadStoriesResponse

export interface LoadMediaDataResponse {
	mediaData: MediaInfo[];
}

// OnThisDay API response
export interface LoadOnThisDayResponse {
	events: OnThisDayEvent[];
	timestamp: number;
	language: string; // The actual language used for this response
}

// Multi-language API types
export interface BatchLanguageInfo {
	languageCode: string;
	isComplete: boolean;
	totalCategories: number;
	totalClusters: number;
	totalArticles: number;
}

export interface BatchLanguagesResponse {
	batchId: string;
	languages: BatchLanguageInfo[];
}

export interface BatchInfo {
	id: string;
	createdAt: string;
	language: string;
	totalCategories: number;
	totalClusters: number;
	totalArticles: number;
	chaosIndex?: number;
	chaosDescription?: string;
	chaosLastUpdated?: string;
}

export interface BatchesResponse {
	batches: BatchInfo[];
}

export interface BatchCategoriesResponse {
	batchId: string;
	createdAt: string;
	hasOnThisDay: boolean;
	categories: Array<{
		id: string;
		categoryId: string;
		categoryName: string;
		timestamp: number;
		readCount: number;
		clusterCount: number;
	}>;
}

export interface BatchStoriesResponse {
	batchId: string;
	categoryId: string;
	categoryName: string;
	timestamp: number;
	stories: Story[];
	totalStories: number;
	domains: Domain[];
	readCount: number;
}

export interface ContributionItem {
	id: string;
	category: string;
	isNew: boolean;
	feedCount: number;
	prNumber: number;
	prUrl: string;
	createdAt: Date;
	pipelineStatus: 'submitted' | 'merged' | 'live' | 'declined';
	declineReason?: string | null;
}
