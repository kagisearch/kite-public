// Model costs per million tokens in USD
// Based on publicly available pricing information from providers

interface ModelCost {
	inputCost: number | undefined; // Cost per million tokens for input
	outputCost: number | undefined; // Cost per million tokens for output
	reasoningCost?: number | undefined; // Cost per million tokens for reasoning/thinking (optional)
}

interface ModelCostsMap {
	[key: string]: ModelCost;
}

// OpenAI Models
const openAICosts: ModelCostsMap = {
	'gpt-4o': { inputCost: 2.5, outputCost: 10.0 },
	'gpt-4o-mini': { inputCost: 0.15, outputCost: 0.6 },
	'gpt-4.1': { inputCost: 2.0, outputCost: 8.0 },
	'gpt-4.1-mini': { inputCost: 0.4, outputCost: 1.6 },
	'gpt-4.1-nano': { inputCost: 0.1, outputCost: 0.4 },
	'gpt-5': { inputCost: 1.25, outputCost: 10.0 },
	'gpt-5-chat-latest': { inputCost: 1.25, outputCost: 10.0 }, // Same as gpt-5
	'gpt-5-reasoning-minimal': { inputCost: 1.25, outputCost: 10.0 }, // Same base model
	'gpt-5-reasoning-low': { inputCost: 1.25, outputCost: 10.0 }, // Same base model
	'gpt-5-reasoning-medium': { inputCost: 1.25, outputCost: 10.0 }, // Same base model
	'gpt-5-reasoning-high': { inputCost: 1.25, outputCost: 10.0 }, // Same base model
	'gpt-5-mini': { inputCost: 0.25, outputCost: 2.0 },
	'gpt-5-nano': { inputCost: 0.05, outputCost: 0.4 },
	// O-series models: reasoning tokens are charged at the same rate as output tokens
	'o4-mini': { inputCost: 1.1, outputCost: 4.4 },
	'o3-mini': { inputCost: 1.1, outputCost: 4.4 },
	'o3': { inputCost: 10.0, outputCost: 40.0 },
	'o1-mini': { inputCost: 1.1, outputCost: 4.4 },
	'o1': { inputCost: 3.0, outputCost: 15.0 },
	'chatgpt-4o-latest': { inputCost: 5.0, outputCost: 15.0 },
	'gpt-4o-audio-preview': { inputCost: 2.5, outputCost: 10.0 },
	'gpt-4o-mini-audio-preview': { inputCost: 0.15, outputCost: 0.6 },
	'gpt-4o-realtime-preview': { inputCost: 5.0, outputCost: 20.0 },
	'gpt-4o-mini-realtime-preview': { inputCost: 0.6, outputCost: 2.4 },
	// External models (actual pricing from providers)
	'xai-grok3': { inputCost: 3.0, outputCost: 15.0 },
	'xai-grok4': { inputCost: 3.0, outputCost: 15.0 },
	'glm-4.5': { inputCost: 0.55, outputCost: 2.19 }, // Fireworks pricing
	'glm-4.5-air': { inputCost: 0.22, outputCost: 0.88 }, // Fireworks pricing
	'gpt-oss-20b': { inputCost: 0.04, outputCost: 0.16 }, // DeepInfra pricing
	'gpt-oss-120b': { inputCost: 0.09, outputCost: 0.45 }, // DeepInfra pricing  
	'llama-4-scout': { inputCost: 0.08, outputCost: 0.30 }, // DeepInfra pricing
	'moonshotai-kimi-k2': { inputCost: 1.0, outputCost: 3.0 }, // Together.ai pricing
	'qwen-235b-a22b-instruct-2507': { inputCost: 0.13, outputCost: 0.60 }, // DeepInfra pricing
	'qwen-235b-a22b-instruct-2507-thinking': { inputCost: 0.13, outputCost: 0.60 }, // Same as base model
	// TTS models (note: Kokoro is priced per million characters, not tokens)
	// Using approximate 1 char ≈ 1 token for TTS input cost calculation
	'hexgrad/kokoro-82m': { inputCost: 0.62, outputCost: 0 }, // $0.62 per M characters (DeepInfra pricing)
	'deepseek-chat': { inputCost: 0.50, outputCost: 1.50 }, // DeepSeek V3 pricing
	'deepseek-reasoner': { inputCost: 0.50, outputCost: 1.50 }, // DeepSeek R1 pricing
	'deepseek-v31': { inputCost: 0.56, outputCost: 1.68 } // Fireworks pricing for DeepSeek v3.1
};


// Anthropic Models
const anthropicCosts: ModelCostsMap = {
	'claude-3-5-sonnet-latest': { inputCost: 3.0, outputCost: 15.0 },
	'claude-3-7-sonnet-latest': { inputCost: 3.0, outputCost: 15.0 },
	'claude-4-sonnet-latest': { inputCost: 3.0, outputCost: 15.0 },
	'claude-3-haiku': { inputCost: 0.80, outputCost: 4.0 },
	'claude-3-opus': { inputCost: 15.0, outputCost: 75.0 },
	'claude-4-opus': { inputCost: 15.0, outputCost: 75.0 }
};

// Google Gemini Models
const geminiCosts: ModelCostsMap = {
	'gemini-1.5-flash': { inputCost: 0.075, outputCost: 0.15 },
	'gemini-1.5-pro': { inputCost: 1.25, outputCost: 5 },
	'gemini-2.0-flash': { inputCost: 0.10, outputCost: 0.40 },
	'gemini-2.0-flash-lite': { inputCost: 0.075, outputCost: 0.075 },
	'gemini-2.5-flash-preview': { inputCost: 0.15, outputCost: 0.60, reasoningCost: 3.50 },
	'gemini-2.5-flash': { inputCost: 0.15, outputCost: 0.60, reasoningCost: 3.50 },
	'gemini-2.5-flash-thinking': { inputCost: 0.15, outputCost: 0.60, reasoningCost: 3.50 },
	'gemini-2.5-pro': { inputCost: 1.25, outputCost: 10 }
};

// Cerebras Models
const cerebrasCosts: ModelCostsMap = {
	'llama3.1-8b': { inputCost: 0.1, outputCost: 0.1 },
	'llama-3.3-70b': { inputCost: 0.85, outputCost: 1.20 }
};

const otherModels: ModelCostsMap = {
	'deepseek-ai/DeepSeek-V3-0324': { inputCost: 0.50, outputCost: 1.50 }
};

// Merge all costs into a single map
export const modelCosts: ModelCostsMap = {
	...openAICosts,
	...anthropicCosts,
	...geminiCosts,
	...cerebrasCosts,
	...otherModels
};

/**
 * Get cost information for a model
 * @param modelName The name of the model, can include provider prefix
 * @returns Object with input and output costs per million tokens
 */
export function getModelCost(modelName: string): ModelCost {
	// Clean up model name to match keys in our costs map
	// Remove provider prefix if present (e.g., "OpenAI GPT-4" -> "gpt-4")
	const cleanModelName = modelName
		.toLowerCase()
		.replace(/^(openai|anthropic|google|cerebras|fireworks|vertexai|azure|glama)\s+/i, '')
		.trim();

	// Try to find an exact match
	if (modelCosts[cleanModelName]) {
		return modelCosts[cleanModelName];
	}

	// Try to find a fuzzy match for similar model names
	const similarModel = Object.keys(modelCosts).find(
		(key) => cleanModelName.includes(key) || key.includes(cleanModelName)
	);

	if (similarModel) {
		return modelCosts[similarModel];
	}

	// Return undefined if no match found
	return { inputCost: undefined, outputCost: undefined };
}
