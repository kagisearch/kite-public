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
	category: string;
	title: string;
	short_summary: string;
	did_you_know?: string;
	talking_points?: string[];
	quote?: string;
	quote_author?: string;
	quote_attribution?: string;
	quote_source_url?: string;
	quote_source_domain?: string;
	location?: string;
	perspectives?: Perspective[];
	emoji?: string;
	geopolitical_context?: string;
	historical_background?: string;
	international_reactions?: string[];
	humanitarian_impact?: string;
	economic_implications?: string;
	timeline?: TimelineEvent[];
	future_outlook?: string;
	key_players?: string[];
	technical_details?: string[];
	business_angle_text?: string;
	business_angle_points?: string[];
	user_action_items?: string[];
	scientific_significance?: string[];
	travel_advisory?: string[];
	destination_highlights?: string;
	culinary_significance?: string;
	performance_statistics?: string[];
	league_standings?: string;
	diy_tips?: string;
	design_principles?: string;
	user_experience_impact?: string;
	gameplay_mechanics?: string[];
	industry_impact?: string[];
	gaming_industry_impact?: string[];
	technical_specifications?: string[];
	suggested_qna?: QnA[];
	primary_image?: {
		url: string;
		caption: string;
		credit?: string;
	};
	secondary_image?: {
		url: string;
		caption: string;
		credit?: string;
	};
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
