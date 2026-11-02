# Provider status check

Updated October 26, 2026. Combines your research file (availability and free-tier checks against official product, pricing,
documentation, changelog, and status pages) with my own cross-checks. Covers all 74 providers in
`src/config/providers.ts`: the original 57 plus 17 market-scan additions. Findings are stored in `src/config/research.ts`.

## Summary

| Availability | Providers |
| --- | --- |
| Active | 73 |
| Unclear | 1 (CrofAI) |

| Free tier | Providers |
| --- | --- |
| Yes (standing no-cost plan or allowance) | 37 |
| Limited (trial, one-time credits, conditional free access) | 16 |
| No | 20 |
| Unclear | 1 (AgentRouter) |

## What changed in this update

- **17 providers added:** Together AI, Fireworks AI, Groq, Cerebras, DeepInfra, Hugging Face, Baseten, Replicate, Vercel AI Gateway,
  Portkey, Mistral AI, SambaNova, Exa, Brave Search, SerpApi, Cohere, and NVIDIA NIM. All are marked Active in your research.
- **No changes** to the original 57 entries: availability, free-tier verdicts, notes, and sources match the previous file exactly.
- **Brand details** (id, short name, color, mark, website) for 14 of the 17 come from OmniRoute's catalog. Replicate, Portkey, and
  SerpApi are not in it, so they use the product's own domain and the default avatar color. SerpApi is not OmniRoute's
  "Serper Search", which is a different company.
- **Quota windows.** Where your research states a recurring allowance, it became a real window: Exa $10 per month, Brave $5 per
  month, Vercel AI Gateway $5 per month, SerpApi 250 searches per month, Cohere 1,000 trial calls per month, and Portkey
  10,000 logs per month. These are the free-plan sizes, so they will not match a paid plan. The other 11 use one generic
  "Usage" window (percent used), because their limits are rate limits or prepaid balances.

## Still open from the previous report

- **Cut-off notes.** The free-tier notes for Grok Build, PromptQL, and Moonshot still end mid-sentence in your file.
- **Conol's free tier.** Conol is live, but I could only find a sign-up grant of 4,000 credits, not the 100 per day in the notes.
- **The 17 new rows** are taken from your research as written. I did not independently verify them.
- **CrofAI** stays unclear until a real API response is confirmed.
- **Amazon Q** remains flagged as ending: AWS ends IDE plugin support on April 30, 2027.

## All providers

Availability "Unclear" is listed first. "Checked" means I also confirmed availability independently. "New" marks this update's additions.

| Provider | Id | Availability | Free tier | Checked | New | Free-tier note |
| --- | --- | --- | --- | --- | --- | --- |
| CrofAI | `crof` | Unclear | No |  |  | Free account creation is not free inference; listed hosted models use per-token pricing. |
| Adobe Firefly (Image/Video) | `adobe-firefly` | Active | Yes |  |  | Adobe’s official Firefly information describes a free plan with limited daily generations. |
| AgentRouter | `agentrouter` | Active | Unclear | Yes |  | Official pricing and terms do not confirm a standing free hosted allowance. |
| Alibaba Token Plan | `bailian-coding-plan` | Active | No |  |  | Token Plan is paid; separate new-user inference quota expires after 90 days and does not apply to Token Plan keys. |
| Amazon Q | `amazon-q` | Active | Yes | Yes |  | Amazon states Amazon Q Developer has a perpetual Free tier with monthly limits. |
| Anthropic | `anthropic` | Active | No |  |  | No standalone free API tier; API credits are available only with eligible paid Claude plans. |
| Antigravity | `antigravity` | Active | Yes |  |  | As of October 26, 2026, Google's official pricing page lists a standing Individual plan at $0/month, usable without a subscription. |
| Antigravity CLI | `agy` | Active | Yes | Yes |  | The official pricing page lists an ongoing Individual plan at $0/month and says it is available without a subscription. |
| Apmix | `apmix` | Active | Limited |  |  | One-time new-account offer of 3 million free tokens; no recurring monthly allowance is stated. |
| Baseten | `baseten` | Active | Limited |  | Yes | New accounts receive experimentation credits; no recurring free Model API allowance is documented. |
| Brave Search | `brave-search` | Active | Limited |  | Yes | $5 monthly credit is applied to the prepaid Search plan; usage beyond that amount is paid. |
| Cerebras | `cerebras` | Active | Limited |  | Yes | One-time $5 trial credit after adding a verified payment method; it expires after 30 days. |
| ChatPlayground | `chatplayground` | Active | Limited |  |  | Three-day free trial, followed by a paid subscription. |
| Claude Code | `claude` | Active | No |  |  | As of October 26, 2026, Anthropic’s pricing page explicitly lists Claude Code as unavailable on the Free plan and available on Pro, Max, Team, and Enterprise plans. |
| ClinePass | `clinepass` | Active | No | Yes |  | ClinePass is a paid subscription, listed at $9.99/month; its official FAQ calls it the paid plan and says additional processing fees may apply. |
| Cloudflare Workers AI | `cloudflare-ai` | Active | Yes |  |  | Cloudflare’s current official pricing documentation says Workers AI is included in the Free and Paid Workers plans. |
| CodeBuddy CN | `codebuddy-cn` | Active | Limited |  |  | The ¥0 Experience plan is labeled limited-time free; its stated allowance is 500 points/month. |
| CodeBuddy Intl | `codebuddy-intl` | Active | Yes |  |  | Tencent’s official international pricing page lists a continuing Free edition at $0 with 100 credits per month, 5,000 real-time code completions per month, and 3 automated tasks. |
| Cohere | `cohere` | Active | Limited |  | Yes | Trial keys allow up to 1,000 API calls/month, but are not permitted for production or commercial use. |
| Command Code | `command-code` | Active | No |  |  | No standing free plan; certain models have conditional free access while capacity lasts or during a preview. |
| Conol (Unofficial/Experimental) | `conol-web` | Active | Yes | Yes |  | Conol offers an ongoing free hosted allowance: its official Terms say free daily credits refresh daily, and its official blog/release notes specify 100 credits per day, refreshed daily. |
| Context7 (library docs) | `context7` | Active | Yes |  |  | As of October 26, 2026, Context7's official plan pages show a recurring $0 Free plan. |
| Cursor IDE | `cursor` | Active | Yes | Yes |  | Cursor’s official pricing page lists a recurring Free plan at $0/month, with limited AI usage: limited agent requests and limited Chat requests. |
| DeepInfra | `deepinfra` | Active | No |  | Yes | Official pricing requires a card or prepaid balance for hosted inference; no recurring free allowance is listed. |
| DeepSeek | `deepseek` | Active | Limited |  |  | Temporary free Search/Fetch tools through selected integrations end November 1, 2026; model API use is paid. |
| Devin CLI | `devin-cli` | Active | Yes | Yes |  | Devin’s official pricing page lists a recurring Free plan at $0, with a light quota for coding with agents, limited model availability, unlimited inline edits, and unlimited Tab completions. |
| Exa Search | `exa-search` | Active | Yes |  | Yes | $10 in API credits refreshes monthly, with no payment method required; separate signup bonus is one-time. |
| Firecrawl | `firecrawl` | Active | Yes |  |  | Firecrawl offers an ongoing hosted Free Plan at $0/month, not just introductory credits. |
| Fireworks AI | `fireworks` | Active | Limited |  | Yes | New accounts may receive a one-time $1 credit; standard inference is prepaid and metered. |
| GitHub Copilot | `github` | Active | Yes | Yes |  | GitHub offers a standing Copilot Free plan at $0 for individual developers (no credit card required). |
| GLM Coding | `glm` | Active | No |  |  | As of October 26, 2026, Z.AI’s official subscription page lists paid Individual plans only: Lite, Pro, and Max. |
| GLM Coding (China) | `glm-cn` | Active | Yes |  |  | The official pricing page says BigModel offers free API models, specifically GLM-4.7-Flash (text; 200K context) and GLM-4.6V-Flash (vision), with input, output, and cache listed as free. |
| GLM Thinking | `glmt` | Active | Yes |  |  | As of October 26, 2026, BigModel’s official pricing page lists hosted API models GLM-4.7-Flash (text) and GLM-4.6V-Flash (vision) as free, including input, output, and cache usage. |
| Grok Build | `grok-cli` | Active | Yes | Yes |  | Official xAI documentation explicitly refers to a Grok Build free tier and states that Grok 4.7 Fast is not included. xAI’s current pricing page lists a $0 Free plan with limited AI usage (limited chat and… |
| Groq | `groq` | Active | Yes |  | Yes | Ongoing Free tier with rate limits and restrictions; occasional promotional credits are separate. |
| Hugging Face | `huggingface` | Active | No |  | Yes | Free users receive no monthly routed-inference credits; hosted Inference Providers require purchased credits or a paid plan. |
| HyperAgent (Unofficial/Experimental) | `hyperagent` | Active | Yes | Yes |  | HyperAgent’s official pricing page lists Free at $0/month, and its free-plan guide says no paid subscription is required—evidence of an ongoing hosted free tier, not a trial. |
| Jina AI (Foundation API) | `jina-ai` | Active | Yes |  |  | Official Jina materials describe the hosted Reader API as available for free: the published limit is 20 requests per minute without an API key and 500 RPM with a free API key. |
| Jina Reader (r.jina.ai) | `jina-reader` | Active | Yes |  |  | Official Reader materials describe the hosted Reader API as free for basic usage. |
| Kilo Code | `kilocode` | Active | Yes |  |  | The official pricing page lists the Individual platform plan at $0 and says users can use free models. |
| Kimi | `moonshot` | Active | Limited |  |  | As of October 26, 2026, official Kimi materials describe a new-user trial voucher, not a standing recurring free tier: eligible new users registering with a mainland China mobile number receive RMB 15 in… |
| Kimi Code CLI | `kimi-coding` | Active | No | Yes |  | CLI install is free, but hosted Kimi Code access requires Plus or higher membership. |
| Kiro AI | `kiro` | Active | Yes | Yes |  | Kiro’s official pricing page describes a “perpetual Kiro Free tier” with 50 credits, access to open-weight models and Claude Sonnet 4.5, subject to limits/rate limits. |
| LLM Gateway | `llmgateway` | Active | Yes |  |  | Official pricing lists a Free plan at $0 forever, with access to the API and Lounge and one zero-cost model subject to rate limits. |
| Lyceum | `lyceum` | Active | Limited | Yes |  | Lyceum's official product FAQ says CLI signup includes a small starter credit and invites larger evaluation-budget requests to sales; it does not state an amount or duration. |
| Manus | `manus` | Active | Yes | Yes |  | Ongoing Free plan: 300 daily refresh credits, one concurrent task, and two scheduled automations. |
| Minimax (China) | `minimax-cn` | Active | Limited |  |  | New API users may receive trial quota; the official page does not state its amount or duration. |
| Minimax Coding | `minimax` | Active | No |  |  | As of October 26, 2026, MiniMax's official documentation describes MiniMax Code as included with an M Plan subscription. |
| Mistral AI | `mistral` | Active | Yes |  | Yes | Ongoing Free mode includes monthly API usage within account-specific limits; the public pricing page does not state a universal quota. |
| NaN.Builders | `nan` | Active | No | Yes |  | Official terms say the account is free to create, but the community, inference, workspaces, and other products require a paid plan. |
| NanoGPT | `nanogpt` | Active | Yes |  |  | NanoGPT’s current pricing page lists a $0/month pay-as-you-go plan and says it includes one free model, available on the web only; its get-started guide says that free model needs no account or balance. |
| NVIDIA NIM | `nvidia` | Active | Yes |  | Yes | Hosted Build endpoints allow free, rate-limited prototyping; NVIDIA says most models permit up to 40 requests/minute. |
| Ollama Cloud | `ollama-cloud` | Active | Yes |  |  | As of October 26, 2026, Ollama's official pricing page lists a Free plan with starter usage credits for a smaller set of hosted starter models. |
| OpenAI Codex | `codex` | Active | Yes | Yes |  | OpenAI’s current ChatGPT pricing page lists a Free plan with “Limited Codex access,” and the Codex pricing page lists Free as a $0/month option for exploring Codex on quick coding tasks. |
| OpenCode Go | `opencode-go` | Active | No |  |  | Go is a paid subscription; some model offers are temporary and are not a standing free Go tier. |
| OpenRouter | `openrouter` | Active | Yes |  |  | OpenRouter’s current pricing page lists a Free plan with Chat and API access and 25+ free models. |
| Portkey | `portkey` | Active | Yes |  | Yes | Free Developer plan includes 10,000 recorded logs/month; this covers gateway/observability features, not free model-inference tokens. |
| PromptQL (Unofficial/Experimental) | `promptql` | Active | Yes | Yes |  | PromptQL's official Plans documentation lists a free Playground workspace for building and sharing multiplayer bots, subject to basic usage limits; inviting collaborators who actively use or build bots can… |
| Qoder | `qoder` | Active | Yes | Yes |  | Qoder’s current official pricing page lists a recurring Free plan at no charge. |
| Qwen Cloud Token Plan | `qwen-cloud-token-plan` | Active | No |  |  | Token Plan is paid; separate new-user inference quota is temporary and not a Token Plan allowance. |
| Replicate | `replicate` | Active | No |  | Yes | Hosted model runs are paid; official billing requires prepaid credits or pay-as-you-go usage. |
| SambaNova | `sambanova` | Active | Limited |  | Yes | No recurring no-cost inference quota was confirmed; any community or launch credits are conditional/promotional, and current requests require purchased credits. |
| SerpApi | `serpapi` | Active | Yes |  | Yes | Recurring Free Plan includes 250 searches/month. |
| SYNTX.ai (Unofficial/Experimental) | `syntx` | Active | Limited | Yes |  | Official FAQ says new users get 5 free tokens and 5 language-model requests to try the platform. |
| Tavily Search | `tavily-search` | Active | Yes |  |  | Tavily's official pricing lists a standing Researcher free plan with 1,000 API credits per month and no credit card required. |
| Together AI | `together` | Active | No |  | Yes | No ongoing free hosted tier; API access requires at least $5 in purchased prepaid credit. |
| Vercel AI Gateway | `vercel-ai-gateway` | Active | Limited |  | Yes | Conditional $5/month AI Gateway credit for eligible models; requires a payment method and has model-specific limits. |
| Vertex AI (now Gemini Enterprise Agent Platform) | `vertex` | Active | Yes | Yes |  | Ongoing free quotas apply to specific features; this is not a blanket free allowance for every Vertex service. |
| Vertex AI Partners | `vertex-partner` | Active | No | Yes |  | No recurring free partner-model quota; Google Cloud trial credits exclude managed partner models. |
| Volcengine Ark Agent Plan | `volcengine-agent-plan` | Active | No |  |  | Agent Plan is paid; separate new-user inference quota does not make the subscription free. |
| Volcengine Ark Coding Plan | `volcengine-coding-plan` | Active | No |  |  | Coding Plan is paid; separate inference quota is not included with this plan. |
| Xiaomi MiMo | `xiaomi-mimo` | Active | Limited |  |  | New-account credits and limited-time offers are available; no recurring free API allowance is listed. |
| Xiaomi MiMo Token Plan | `xiaomi-mimo-token-plan` | Active | No |  |  | Token Plan tiers are paid; temporary model-specific offers do not create a free subscription. |
| Z.AI | `zai` | Active | Yes |  |  | Z.AI’s current official API pricing table lists hosted API usage as Free for GLM-4.7-Flash, GLM-4.5-Flash, and GLM-4.6V-Flash (including input and output pricing). |

## Suggested next steps

1. Confirm a successful CrofAI API response before treating it as working.
2. Plan the removal of Amazon Q's IDE-based quota tracking before April 30, 2027.
3. Finish the three cut-off notes and check Conol's terms page.
4. Spot-check a few of the 17 new rows; they are the least reviewed.
5. Re-run this check every few months; small gateways and unofficial services come and go.
