import type { PlanSpec, ProviderConfig, WindowSpec } from '../types';
import { RESEARCH } from './research';

/**
 * Global provider configuration. Maintainer-owned: users cannot add, change, or delete providers
 * in the app; they only add accounts to the providers listed here.
 *
 * Provider attributes (id, name, alias, category, color, textIcon, website, hasFree) come from
 * OmniRoute's provider catalog (diegosouzapw/OmniRoute, src/shared/constants/providers/*), limited to
 * the providers OmniRoute can read usage for (USAGE_SUPPORTED_PROVIDERS), skipping ones it hides from
 * its dashboard. Quota windows follow what OmniRoute's usage fetchers report for each provider.
 * Providers whose windows are not mapped yet use one generic "Usage" window; refine them here.
 *
 * Window ids are stored with every account's usage, so keep them stable once published.
 */

type Kind = WindowSpec['type'];
const w = (id: string, name: string, type: Kind, hours = 5): WindowSpec => ({
  id, name, type, hours, total: 100, unit: '%', step: 1,
});

const SESSION = w('session', 'Session (5h)', 'rolling', 5);
const SESSION_WEEKLY: WindowSpec[] = [SESSION, w('weekly', 'Weekly (7d)', 'weekly')];
const ANTIGRAVITY: WindowSpec[] = [
  w('gemini_session', 'Gemini models (5h)', 'rolling', 5),
  w('gemini_weekly', 'Gemini models weekly', 'weekly'),
  w('claude_gpt_session', 'Claude & GPT models (5h)', 'rolling', 5),
  w('claude_gpt_weekly', 'Claude & GPT models weekly', 'weekly'),
];
const GLM: WindowSpec[] = [SESSION, w('weekly', 'Weekly', 'weekly'), w('mcp_monthly', 'MCP (monthly)', 'monthly')];
const TRIPLE: WindowSpec[] = [SESSION, w('weekly', 'Weekly', 'weekly'), w('monthly', 'Monthly', 'monthly')];
const GENERIC: WindowSpec[] = [w('usage', 'Usage', 'monthly')];

/** A window with a documented recurring allowance, in the provider's own unit. */
const wa = (id: string, name: string, type: Kind, hours: number, total: number, unit: string, step: number): WindowSpec => ({
  id, name, type, hours, total, unit, step,
});

/**
 * Manus is not in OmniRoute's catalog, so it is filled in from Manus's own help center and docs:
 * 300 daily refresh credits that reset at 00:00 UTC and never roll over, plus monthly plan credits that
 * refresh on the subscription date each month and never roll over. Credit counts per plan are the
 * pricing page's starting amounts (Customizable and Extended can be raised with a slider on the site).
 * Add-on credits never expire and are not tracked here because they have no reset.
 */
const MANUS: WindowSpec[] = [
  { id: 'daily_refresh', name: 'Daily refresh credits', type: 'daily', hours: 5, total: 300, unit: 'credits', step: 10, time: '00:00', utc: true },
  { id: 'monthly', name: 'Monthly credits', type: 'monthly', hours: 5, total: 4000, unit: 'credits', step: 100 },
];
const MANUS_PLANS: PlanSpec[] = [
  { name: 'Standard', detail: 'Standard · $20/mo · 4,000 credits', totals: { monthly: 4000 } },
  { name: 'Customizable', detail: 'Customizable · from $40/mo · 8,000 credits', totals: { monthly: 8000 } },
  { name: 'Extended', detail: 'Extended · from $200/mo · 40,000 credits', totals: { monthly: 40000 } },
  { name: 'Free', detail: 'Free · daily refresh credits only', windows: ['daily_refresh'] },
];

const BASE_PROVIDERS: ProviderConfig[] = [
  { id: "manus", name: "Manus", category: "web-app", color: "#1A1A1A", textIcon: "M", website: "https://manus.im", hasFree: true, windows: MANUS, plans: MANUS_PLANS },
  { id: "antigravity", name: "Antigravity", category: "oauth", color: "#F59E0B", website: "https://antigravity.google", windows: ANTIGRAVITY },
  { id: "agy", name: "Antigravity CLI", alias: "agy", category: "oauth", color: "#F59E0B", textIcon: "AGY", website: "https://antigravity.google", hasFree: true, windows: ANTIGRAVITY },
  { id: "kiro", name: "Kiro AI", alias: "kr", category: "oauth", color: "#FF6B35", hasFree: true, website: "https://kiro.dev", windows: [w('credits', 'Credits', 'monthly')] },
  { id: "amazon-q", name: "Amazon Q", alias: "aq", category: "oauth", color: "#FF9900", textIcon: "AQ", website: "https://aws.amazon.com/q/developer/", hasFree: true, deprecated: "AWS ends support for Amazon Q Developer IDE plugins on Apr 30, 2027 (paid subscriptions too, per third-party reports) and points users to Kiro. Q Developer in the AWS console and chat apps is not affected.", windows: GENERIC },
  { id: "github", name: "GitHub Copilot", alias: "gh", category: "oauth", color: "#333333", website: "https://github.com/features/copilot", windows: [w('premium_interactions', 'Premium interactions', 'monthly'), w('chat', 'Chat', 'monthly'), w('completions', 'Completions', 'monthly')] },
  { id: "codex", name: "OpenAI Codex", alias: "cx", category: "oauth", color: "#3B82F6", website: "https://openai.com/codex", windows: SESSION_WEEKLY },
  { id: "claude", name: "Claude Code", alias: "cc", category: "oauth", color: "#D97757", website: "https://claude.ai", windows: SESSION_WEEKLY },
  { id: "anthropic", name: "Anthropic", alias: "anthropic", category: "apikey", color: "#D97757", textIcon: "AN", website: "https://platform.claude.com", windows: GENERIC },
  { id: "cursor", name: "Cursor IDE", alias: "cu", category: "oauth", color: "#00D4AA", website: "https://cursor.com", windows: [w('total', 'Total usage', 'monthly'), w('auto_composer', 'Auto + Composer', 'monthly'), w('api', 'API usage', 'monthly')] },
  { id: "qoder", name: "Qoder", alias: "if", category: "oauth", color: "#6366F1", hasFree: true, website: "https://qoder.com", windows: GENERIC },
  { id: "kimi-coding", name: "Kimi Code CLI", alias: "kmc", category: "oauth", color: "#1E40AF", textIcon: "KC", website: "https://www.kimi.ai/code", windows: SESSION_WEEKLY },
  { id: "glm", name: "GLM Coding", alias: "glm", category: "apikey", color: "#2563EB", textIcon: "GL", website: "https://z.ai/subscribe", windows: GLM },
  { id: "glm-cn", name: "GLM Coding (China)", alias: "glmcn", category: "apikey", color: "#DC2626", textIcon: "GC", website: "https://open.bigmodel.cn", windows: GLM },
  { id: "zai", name: "Z.AI", alias: "zai", category: "apikey", color: "#2563EB", textIcon: "ZA", website: "https://z.ai/model-api", windows: GLM },
  { id: "glmt", name: "GLM Thinking", alias: "glmt", category: "apikey", color: "#1D4ED8", textIcon: "GT", website: "https://open.bigmodel.cn", windows: GLM },
  { id: "opencode-go", name: "OpenCode Go", alias: "opencode-go", category: "apikey", color: "#6366f1", website: "https://opencode.ai/go", windows: GENERIC },
  { id: "ollama-cloud", name: "Ollama Cloud", alias: "ollamacloud", category: "apikey", color: "#58A6FF", textIcon: "OC", website: "https://ollama.com", hasFree: true, windows: GENERIC },
  { id: "minimax", name: "Minimax Coding", alias: "minimax", category: "apikey", color: "#7C3AED", textIcon: "MM", website: "https://www.minimax.io", windows: SESSION_WEEKLY },
  { id: "minimax-cn", name: "Minimax (China)", alias: "minimax-cn", category: "apikey", color: "#DC2626", textIcon: "MC", website: "https://www.minimaxi.com", windows: SESSION_WEEKLY },
  { id: "crof", name: "CrofAI", alias: "crof", category: "apikey", color: "#0EA5E9", textIcon: "CR", website: "https://crof.ai", windows: [w('requests_today', 'Requests today', 'daily')] },
  { id: "clinepass", name: "ClinePass", alias: "cp", category: "oauth", color: "#9D4EDD", textIcon: "CP", website: "https://cline.bot/cline-pass", windows: GENERIC },
  { id: "nanogpt", name: "NanoGPT", alias: "nanogpt", category: "apikey", color: "#4F46E5", textIcon: "NG", website: "https://nano-gpt.com", windows: [w('daily_images', 'Daily images', 'daily')] },
  { id: "nan", name: "NaN.Builders", alias: "nan", category: "apikey", color: "#6D5EF3", textIcon: "NaN", website: "https://nan.builders", windows: GENERIC },
  { id: "apmix", name: "Apmix", alias: "apmix", category: "apikey", color: "#7C3AED", textIcon: "AP", website: "https://apmix.ai", windows: [w('monthly', 'Monthly allowance', 'monthly'), w('daily', 'Daily cap', 'daily'), w('weekly', 'Weekly cap', 'weekly')] },
  { id: "deepseek", name: "DeepSeek", alias: "ds", category: "apikey", color: "#4D6BFE", textIcon: "DS", website: "https://platform.deepseek.com", hasFree: true, windows: GENERIC },
  { id: "moonshot", name: "Kimi", alias: "moonshot", category: "apikey", color: "#1E40AF", textIcon: "MS", website: "https://platform.kimi.ai", windows: GENERIC },
  { id: "xiaomi-mimo", name: "Xiaomi MiMo", alias: "mimo", category: "apikey", color: "#EA580C", textIcon: "MM", website: "https://mimo.mi.com", windows: [w('monthly', 'Monthly', 'monthly')] },
  { id: "xiaomi-mimo-token-plan", name: "Xiaomi MiMo Token Plan", alias: "mimotp", category: "apikey", color: "#EA580C", textIcon: "MT", website: "https://mimo.mi.com", windows: [w('monthly', 'Monthly', 'monthly')] },
  { id: "vertex", name: "Vertex AI (now Gemini Enterprise Agent Platform)", alias: "vertex", category: "apikey", color: "#4285F4", textIcon: "VA", website: "https://cloud.google.com/vertex-ai", hasFree: true, windows: GENERIC },
  { id: "vertex-partner", name: "Vertex AI Partners", alias: "vp", category: "apikey", color: "#34A853", textIcon: "VP", website: "https://cloud.google.com/vertex-ai", windows: GENERIC },
  { id: "codebuddy-cn", name: "CodeBuddy CN", alias: "cbcn", category: "oauth", color: "#006EFF", textIcon: "CB", website: "https://copilot.tencent.com", windows: GENERIC },
  { id: "codebuddy-intl", name: "CodeBuddy Intl", alias: "cbai", category: "oauth", color: "#006EFF", textIcon: "CB", website: "https://www.codebuddy.ai", windows: GENERIC },
  { id: "promptql", name: "PromptQL (Unofficial/Experimental)", alias: "pql", category: "web-cookie", color: "#5B21B6", textIcon: "PQL", website: "https://promptql.io", windows: GENERIC },
  { id: "adobe-firefly", name: "Adobe Firefly (Image/Video)", alias: "firefly", category: "web-cookie", color: "#EB1000", textIcon: "FF", website: "https://firefly.adobe.com", windows: GENERIC },
  { id: "hyperagent", name: "HyperAgent (Unofficial/Experimental)", alias: "ha", category: "web-cookie", color: "#6C5CE7", textIcon: "HA", website: "https://hyperagent.com", windows: GENERIC },
  { id: "grok-cli", name: "Grok Build", alias: "gc", category: "oauth", color: "#000000", website: "https://x.ai", windows: [w('weekly', 'Weekly', 'weekly')] },
  { id: "firecrawl", name: "Firecrawl", alias: "fc", category: "search", color: "#FB923C", textIcon: "FC", website: "https://firecrawl.dev", hasFree: true, windows: GENERIC },
  { id: "context7", name: "Context7 (library docs)", alias: "context7", category: "search", color: "#6B4FBB", textIcon: "C7", website: "https://context7.com", hasFree: true, windows: GENERIC },
  { id: "tavily-search", name: "Tavily Search", alias: "tavily-search", category: "search", color: "#5B4FDB", textIcon: "TV", website: "https://tavily.com", hasFree: true, windows: GENERIC },
  { id: "jina-ai", name: "Jina AI (Foundation API)", alias: "jina", category: "apikey", color: "#2563EB", textIcon: "JA", website: "https://jina.ai", hasFree: true, windows: GENERIC },
  { id: "jina-reader", name: "Jina Reader (r.jina.ai)", alias: "jr", category: "apikey", color: "#0EA5E9", textIcon: "JR", website: "https://jina.ai/reader", hasFree: true, windows: GENERIC },
  { id: "volcengine-agent-plan", name: "Volcengine Ark Agent Plan", alias: "veap", category: "apikey", color: "#DC2626", textIcon: "VA", website: "https://www.volcengine.com/activity/agentplan", windows: GENERIC },
  { id: "volcengine-coding-plan", name: "Volcengine Ark Coding Plan", alias: "vecp", category: "apikey", color: "#FF6A00", textIcon: "VC", website: "https://www.volcengine.com/activity/codingplan", windows: GENERIC },
  { id: "command-code", name: "Command Code", alias: "cmd", category: "apikey", color: "#111827", textIcon: "CC", website: "https://commandcode.ai/", windows: SESSION_WEEKLY },
  { id: "conol-web", name: "Conol (Unofficial/Experimental)", alias: "cnl", category: "web-cookie", color: "#F6C945", textIcon: "CO", website: "https://conol.ai", windows: GENERIC },
  { id: "syntx", name: "SYNTX.ai (Unofficial/Experimental)", alias: "stx", category: "web-cookie", color: "#FF4D00", textIcon: "SX", website: "https://syntx.ai", windows: GENERIC },
  { id: "bailian-coding-plan", name: "Alibaba Token Plan", alias: "bcp", category: "apikey", color: "#FF6A00", textIcon: "BCP", website: "https://www.alibabacloud.com/help/en/model-studio/token-plan-overview", windows: TRIPLE },
  { id: "qwen-cloud-token-plan", name: "Qwen Cloud Token Plan", alias: "qct", category: "apikey", color: "#615CED", textIcon: "QCT", website: "https://www.qwencloud.com/pricing/token-plan", windows: TRIPLE },
  { id: "agentrouter", name: "AgentRouter", alias: "agentrouter", category: "apikey", color: "#10B981", textIcon: "AR", website: "https://agentrouter.org", hasFree: true, windows: GENERIC },
  { id: "kilocode", name: "Kilo Code", alias: "kc", category: "oauth", color: "#FF6B35", textIcon: "KC", website: "https://kilo.ai", windows: [wa('kilo_pass', 'Kilo Pass credits', 'monthly', 5, 100, '%', 1)] },
  { id: "openrouter", name: "OpenRouter", alias: "openrouter", category: "apikey", color: "#F97316", textIcon: "OR", website: "https://openrouter.ai", hasFree: true, windows: [w('free_daily', 'Free daily requests', 'daily')] },
  { id: "llmgateway", name: "LLM Gateway", alias: "llmgateway", category: "apikey", color: "#6366F1", textIcon: "LG", website: "https://llmgateway.io", hasFree: true, windows: GENERIC },
  { id: "lyceum", name: "Lyceum", alias: "lyceum", category: "apikey", color: "#4F46E5", textIcon: "LY", website: "https://lyceum.technology", hasFree: true, windows: GENERIC },
  { id: "devin-cli", name: "Devin CLI", alias: "dv", category: "oauth", color: "#6366F1", textIcon: "DV", website: "https://cli.devin.ai", windows: [w('daily', 'Daily', 'daily'), w('weekly', 'Weekly', 'weekly')] },
  { id: "chatplayground", name: "ChatPlayground", alias: "cpl", category: "web-cookie", color: "#7C3AED", textIcon: "CP", website: "https://web.chatplayground.ai", windows: [w('monthly', 'Monthly', 'monthly')] },
  { id: "cloudflare-ai", name: "Cloudflare Workers AI", alias: "cf", category: "apikey", color: "#F48120", textIcon: "CF", website: "https://developers.cloudflare.com/workers-ai", hasFree: true, windows: GENERIC },

  // Added from the market scan (not in OmniRoute's usage-supported list):
  { id: "together", name: "Together AI", alias: "together", category: "apikey", color: "#0F6FFF", textIcon: "TG", website: "https://www.together.ai", windows: GENERIC },
  { id: "fireworks", name: "Fireworks AI", alias: "fireworks", category: "apikey", color: "#7B2EF2", textIcon: "FW", website: "https://fireworks.ai", windows: GENERIC },
  { id: "groq", name: "Groq", alias: "groq", category: "apikey", color: "#F55036", textIcon: "GQ", website: "https://groq.com", windows: GENERIC },
  { id: "cerebras", name: "Cerebras", alias: "cerebras", category: "apikey", color: "#FF4F00", textIcon: "CB", website: "https://inference.cerebras.ai", windows: GENERIC },
  { id: "deepinfra", name: "DeepInfra", alias: "deepinfra", category: "apikey", color: "#2563EB", textIcon: "DI", website: "https://deepinfra.com", windows: GENERIC },
  { id: "huggingface", name: "Hugging Face", alias: "hf", category: "apikey", color: "#FFD21E", textIcon: "HF", website: "https://huggingface.co", windows: GENERIC },
  { id: "baseten", name: "Baseten", alias: "baseten", category: "apikey", color: "#111827", textIcon: "BT", website: "https://baseten.co", windows: GENERIC },
  { id: "replicate", name: "Replicate", category: "apikey", website: "https://replicate.com", windows: GENERIC },
  { id: "vercel-ai-gateway", name: "Vercel AI Gateway", alias: "vag", category: "apikey", color: "#111827", textIcon: "VAI", website: "https://vercel.com/ai-gateway", windows: [wa('gateway_credit', 'AI Gateway credit', 'monthly', 5, 5, '$', 1)] },
  { id: "portkey", name: "Portkey", category: "apikey", website: "https://portkey.ai", windows: [wa('logs', 'Recorded logs', 'monthly', 5, 10000, 'logs', 100)] },
  { id: "mistral", name: "Mistral AI", alias: "mistral", category: "apikey", color: "#FF7000", textIcon: "MI", website: "https://mistral.ai", windows: GENERIC },
  { id: "sambanova", name: "SambaNova", alias: "samba", category: "apikey", color: "#DC2626", textIcon: "SN", website: "https://sambanova.ai", windows: GENERIC },
  { id: "exa-search", name: "Exa Search", alias: "exa-search", category: "search", color: "#1E40AF", textIcon: "EX", website: "https://exa.ai", windows: [wa('free_credits', 'Free monthly credits', 'monthly', 5, 10, '$', 1)] },
  { id: "brave-search", name: "Brave Search", alias: "brave-search", category: "search", color: "#FB542B", textIcon: "BR", website: "https://brave.com/search/api", windows: [wa('monthly_credit', 'Monthly credit', 'monthly', 5, 5, '$', 1)] },
  { id: "serpapi", name: "SerpApi", category: "search", website: "https://serpapi.com", windows: [wa('searches', 'Searches', 'monthly', 5, 250, 'searches', 1)] },
  { id: "cohere", name: "Cohere", alias: "cohere", category: "apikey", color: "#39594D", textIcon: "CO", website: "https://cohere.com", windows: [wa('trial_calls', 'Trial API calls', 'monthly', 5, 1000, 'calls', 10)] },
  { id: "nvidia", name: "NVIDIA NIM", alias: "nvidia", category: "apikey", color: "#76B900", textIcon: "NV", website: "https://build.nvidia.com", windows: GENERIC },
];

export const PROVIDERS: ProviderConfig[] = BASE_PROVIDERS.map((p) => ({ ...p, research: RESEARCH[p.id] }));

export const PROVIDER_BY_ID = new Map(PROVIDERS.map((p) => [p.id, p]));

export const CATEGORY_LABEL: Record<ProviderConfig['category'], string> = {
  oauth: 'OAuth',
  apikey: 'API key',
  'web-app': 'Web app',
  'web-cookie': 'Web session',
  search: 'Search',
  noauth: 'No auth',
  local: 'Local',
  'cloud-agent': 'Cloud agent',
  'upstream-proxy': 'Proxy',
};
