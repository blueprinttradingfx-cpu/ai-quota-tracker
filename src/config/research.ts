import type { ProviderResearch } from '../types';

/**
 * Availability and free-tier research per provider, checked October 26, 2026 against official product,
 * pricing, documentation, changelog, and status pages. Maintainer-owned, like the rest of the provider config.
 *
 * - `availability`: whether the underlying product is still offered. This does not verify every API transaction.
 * - `freeTier.verdict`: yes = standing no-cost plan or allowance; limited = trial, one-time credits, or conditional
 *   free access; no = no standing free tier documented; unclear = official information did not settle it.
 * - `crossChecked`: availability was also confirmed by an independent search, not only taken from the research.
 * - A few free-tier notes end in an ellipsis because the source research was cut off there; finish them when
 *   the notes are next reviewed (grok-cli, promptql, moonshot).
 */
export const RESEARCH: Record<string, ProviderResearch> = {
  "amazon-q": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "AWS currently offers Amazon Q Developer with a free tier and IDE, CLI, console, and other integrations. AWS has scheduled end of support for its IDE plugins for April 30, 2027; this is not discontinuation of Amazon Q Developer itself.",
    "sources": [
      "https://aws.amazon.com/q/developer/",
      "https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/q-developer-ide-end-of-support.html"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Amazon states Amazon Q Developer has a perpetual Free tier with monthly limits.",
      "infoUrl": "https://aws.amazon.com/q/developer/pricing/",
      "detailsUrl": "https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/q-tiers.html"
    },
    "crossChecked": true
  },
  "agentrouter": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Active in recent tutorials; relays Claude and GPT models for credits.",
    "sources": [],
    "freeTier": {
      "verdict": "unclear",
      "note": "Official pricing and terms do not confirm a standing free hosted allowance.",
      "infoUrl": "https://agentrouter.org/pricing",
      "detailsUrl": "https://co.agentrouter.org/portal/terms"
    },
    "crossChecked": true
  },
  "agy": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Google announced Antigravity CLI availability and its official changelog continues to list recent product updates, including updates in October 2026.",
    "sources": [
      "https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/",
      "https://antigravity.google/docs/changelog/"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "The official pricing page lists an ongoing Individual plan at $0/month and says it is available without a subscription.",
      "infoUrl": "https://antigravity.google/pricing/",
      "detailsUrl": "https://antigravity.google/docs/plans/"
    },
    "crossChecked": true
  },
  "clinepass": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Cline’s official page currently offers ClinePass and its docs describe active subscriptions, quotas, and API access. A reported pause on new subscriptions was temporary, not a product shutdown.",
    "sources": [
      "https://cline.bot/cline-pass",
      "https://docs.cline.bot/getting-started/clinepass"
    ],
    "freeTier": {
      "verdict": "no",
      "note": "ClinePass is a paid subscription, listed at $9.99/month; its official FAQ calls it the paid plan and says additional processing fees may apply.",
      "infoUrl": "https://cline.bot/cline-pass",
      "detailsUrl": "https://docs.cline.bot/getting-started/clinepass"
    },
    "crossChecked": true
  },
  "cursor": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Cursor’s official site and IDE release notes show the coding product remains available and maintained. OpenAI’s announced model-access change for Cursor does not indicate Cursor is closing.",
    "sources": [
      "https://cursor.com/",
      "https://cursor.com/docs/release-notes/ide"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Cursor’s official pricing page lists a recurring Free plan at $0/month, with limited AI usage: limited agent requests and limited Chat requests.",
      "infoUrl": "https://cursor.com/pricing",
      "detailsUrl": "https://cursor.com/docs/models-and-pricing"
    },
    "crossChecked": true
  },
  "devin-cli": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Devin’s official CLI page and changelog list current installation guidance and a release dated October 22, 2026.",
    "sources": [
      "https://devin.ai/cli",
      "https://docs.devin.ai/cli/changelog/stable"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Devin’s official pricing page lists a recurring Free plan at $0, with a light quota for coding with agents, limited model availability, unlimited inline edits, and unlimited Tab completions.",
      "infoUrl": "https://devin.ai/pricing",
      "detailsUrl": "https://docs.devin.ai/admin/billing/self-serve"
    },
    "crossChecked": true
  },
  "github": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "GitHub currently offers Copilot plans and documents its active features and access options.",
    "sources": [
      "https://github.com/features/copilot",
      "https://docs.github.com/copilot/about-github-copilot/what-is-github-copilot"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "GitHub offers a standing Copilot Free plan at $0 for individual developers (no credit card required).",
      "infoUrl": "https://github.com/features/copilot/plans",
      "detailsUrl": "https://docs.github.com/en/copilot/get-started/plans"
    },
    "crossChecked": true
  },
  "grok-cli": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "xAI’s current product page offers Grok Build, and its official documentation provides CLI install and sign-in instructions. The changelog shows current maintenance.",
    "sources": [
      "https://x.ai/build",
      "https://docs.x.ai/build/overview",
      "https://x.ai/changelog/build"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Official xAI documentation explicitly refers to a Grok Build free tier and states that Grok 4.7 Fast is not included. xAI’s current pricing page lists a $0 Free plan with limited AI usage (limited chat and…",
      "infoUrl": "https://docs.x.ai/developers/pricing",
      "detailsUrl": "https://docs.x.ai/developers/grok-4-7"
    },
    "crossChecked": true
  },
  "hyperagent": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Airtable agent platform; invite-based as of Jun 2026.",
    "sources": [],
    "freeTier": {
      "verdict": "yes",
      "note": "HyperAgent’s official pricing page lists Free at $0/month, and its free-plan guide says no paid subscription is required—evidence of an ongoing hosted free tier, not a trial.",
      "infoUrl": "https://www.hyperagent.com/pricing/",
      "detailsUrl": "https://www.hyperagent.com/docs/billing/plans/free-plan"
    },
    "crossChecked": true
  },
  "kimi-coding": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Kimi Code CLI’s official changelog lists release 2.3.0 dated October 21, 2026, and current getting-started docs include install, sign-in, and upgrade instructions.",
    "sources": [
      "https://www.kimi.com/code/docs/en/kimi-code-cli/changelog.html",
      "https://www.kimi.com/code/docs/en/kimi-code-cli/guides/getting-started.html"
    ],
    "freeTier": {
      "verdict": "no",
      "note": "CLI install is free, but hosted Kimi Code access requires Plus or higher membership.",
      "infoUrl": "https://www.kimi.com/code/docs/en/kimi-code/membership.html",
      "detailsUrl": "https://www.kimi.com/en/help/membership/membership-pricing"
    },
    "crossChecked": true
  },
  "kiro": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "AWS continues to offer Kiro IDE and CLI; the official changelog lists releases as recent as October 23, 2026.",
    "sources": [
      "https://kiro.dev/",
      "https://kiro.dev/changelog/cli/"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Kiro’s official pricing page describes a “perpetual Kiro Free tier” with 50 credits, access to open-weight models and Claude Sonnet 4.5, subject to limits/rate limits.",
      "infoUrl": "https://kiro.dev/pricing/",
      "detailsUrl": "https://kiro.dev/docs/billing/"
    },
    "crossChecked": true
  },
  "lyceum": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Berlin GPU cloud; serverless inference newsletter Jun 2026.",
    "sources": [],
    "freeTier": {
      "verdict": "limited",
      "note": "Lyceum's official product FAQ says CLI signup includes a small starter credit and invites larger evaluation-budget requests to sales; it does not state an amount or duration.",
      "infoUrl": "https://lyceum.technology/products/training/a100-l40s/",
      "detailsUrl": "https://lyceum.technology/resources/pricing/"
    },
    "crossChecked": true
  },
  "manus": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Official help center and docs; plans live.",
    "sources": [],
    "freeTier": {
      "verdict": "yes",
      "note": "Ongoing Free plan: 300 daily refresh credits, one concurrent task, and two scheduled automations.",
      "infoUrl": "https://manus.im/desktop",
      "detailsUrl": "https://help.manus.im/en/articles/11711111-what-is-the-current-membership-pricing-for-manus"
    },
    "crossChecked": true
  },
  "nan": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "api.nan.builders live; listed in Mastra model router.",
    "sources": [],
    "freeTier": {
      "verdict": "no",
      "note": "Official terms say the account is free to create, but the community, inference, workspaces, and other products require a paid plan.",
      "infoUrl": "https://nan.builders/",
      "detailsUrl": "https://nan.builders/terms"
    },
    "crossChecked": true
  },
  "codex": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "OpenAI currently offers Codex across ChatGPT, cloud, IDE-extension, and CLI surfaces, with published current plan details.",
    "sources": [
      "https://openai.com/codex/",
      "https://developers.openai.com/codex/pricing"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "OpenAI’s current ChatGPT pricing page lists a Free plan with “Limited Codex access,” and the Codex pricing page lists Free as a $0/month option for exploring Codex on quick coding tasks.",
      "infoUrl": "https://openai.com/chatgpt/pricing/",
      "detailsUrl": "https://developers.openai.com/codex/pricing"
    },
    "crossChecked": true
  },
  "promptql": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Hasura product; docs and 2026 coverage live.",
    "sources": [],
    "freeTier": {
      "verdict": "yes",
      "note": "PromptQL's official Plans documentation lists a free Playground workspace for building and sharing multiplayer bots, subject to basic usage limits; inviting collaborators who actively use or build bots can…",
      "infoUrl": "https://promptql.io/en/docs/plans"
    },
    "crossChecked": true
  },
  "qoder": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Qoder’s official release notes list version 0.4.11 dated October 23, 2026, and its download page offers current desktop, plugin, and CLI products.",
    "sources": [
      "https://docs.qoder.com/release-notes/qoder",
      "https://qoder.com/en/download"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Qoder’s current official pricing page lists a recurring Free plan at no charge.",
      "infoUrl": "https://docs.qoder.com/account/pricing",
      "detailsUrl": "https://qoder.com/blog/qoder-community"
    },
    "crossChecked": true
  },
  "syntx": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Live product in 2026 listings; web and Telegram.",
    "sources": [],
    "freeTier": {
      "verdict": "limited",
      "note": "Official FAQ says new users get 5 free tokens and 5 language-model requests to try the platform.",
      "infoUrl": "https://syntx.ai/faq",
      "detailsUrl": "https://syntx.ai/public-offer"
    },
    "crossChecked": true
  },
  "apmix": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Official Apmix pages currently describe the service as offered: the homepage lists subscription plans and API endpoints; its docs provide live setup instructions and API verification steps; and its Terms of Service, last updated October 16, 2026, describe ongoing accounts, subscriptions, billing, and API access. These current first-party sources support Active; no discontinuation notice was found in the reviewed official pages.",
    "sources": [
      "https://apmix.ai",
      "https://apmix.ai/docs",
      "https://apmix.ai/terms"
    ],
    "freeTier": {
      "verdict": "limited",
      "note": "One-time new-account offer of 3 million free tokens; no recurring monthly allowance is stated.",
      "infoUrl": "https://apmix.ai/pricing",
      "detailsUrl": "https://apmix.ai/terms"
    }
  },
  "chatplayground": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "As of October 26, 2026, ChatPlayground’s official marketing site describes its current multi-model comparison and collaboration product and directs users to “Compare Now.” Its official app URL loads a login/create-account page that advertises access to 30+ AI models, and its official checkout page offers current Pro and Unlimited subscription plans with monthly pricing. These live first-party product and paid-plan pages are affirmative evidence that the service is still offered; I found no shutdown or retirement indication in the checked official sources.",
    "sources": [
      "https://www.chatplayground.ai/",
      "https://web.chatplayground.ai/",
      "https://www.chatplayground.ai/checkout"
    ],
    "freeTier": {
      "verdict": "limited",
      "note": "Three-day free trial, followed by a paid subscription.",
      "infoUrl": "https://www.chatplayground.ai/pricing",
      "detailsUrl": "https://www.chatplayground.ai/checkout"
    }
  },
  "command-code": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "As of October 26, 2026, Command Code’s official homepage describes the coding-agent product and directs users to get started with paid plans; its official pricing page lists current subscription options and a direct Subscribe action. The official Quickstart provides current installation and login instructions for the CLI. These are affirmative signs that it is offered, not merely accessible; no retirement evidence was needed to support the status.",
    "sources": [
      "https://commandcode.ai/",
      "https://commandcode.ai/pricing",
      "https://commandcode.ai/docs/quickstart"
    ],
    "freeTier": {
      "verdict": "no",
      "note": "No standing free plan; certain models have conditional free access while capacity lasts or during a preview.",
      "infoUrl": "https://commandcode.ai/pricing",
      "detailsUrl": "https://commandcode.ai/docs/resources/pricing-limits"
    }
  },
  "conol-web": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Conol’s official homepage currently presents the product as an available knowledge-base and agent workspace. Its official blog lists Conol 1.2.3 as the latest release, describing it as a maintenance release with bug fixes; the directly opened release note confirms that maintenance work. This is positive evidence of continued offering and maintenance, not merely absence of a shutdown notice.",
    "sources": [
      "https://conol.ai/",
      "https://conol.ai/blog",
      "https://conol.ai/blog/release-1.2.3"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Conol offers an ongoing free hosted allowance: its official Terms say free daily credits refresh daily, and its official blog/release notes specify 100 credits per day, refreshed daily.",
      "infoUrl": "https://conol.ai/terms",
      "detailsUrl": "https://conol.ai/blog/the-week-the-bots-came"
    },
    "crossChecked": true
  },
  "crof": {
    "availability": "unclear",
    "checkedAt": "2026-10-26",
    "evidence": "CrofAI’s current official homepage and docs advertise hosted inference, API pricing, and OpenAI-compatible endpoints. However, an unauthenticated request to `/v1/models` redirected to `nahcrof.com/` instead of returning a model list. September shutdown reports conflict with the now-live official site, so runtime API availability remains unverified; retained, not deleted.",
    "sources": [
      "https://crof.ai/",
      "https://crof.ai/docs",
      "https://crof.ai/pricing",
      "https://nahcrof.com/",
      "https://www.reddit.com/r/opencodeCLI/comments/1wgdkjr/crofai_cheapest_inference_provider_in_the_world/"
    ],
    "freeTier": {
      "verdict": "no",
      "note": "Free account creation is not free inference; listed hosted models use per-token pricing.",
      "infoUrl": "https://crof.ai/pricing",
      "detailsUrl": "https://crof.ai"
    }
  },
  "glmt": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "BigModel’s current official pricing page lists API prices and currently offered models, including GLM-5.3, GLM-5.3-Flash, and GLM-5.2, and describes the platform’s API as pay-as-you-go. Its official developer documentation describes calling text and multimodal models through APIs and says the platform has dozens of models, with a quick-start path for API setup and calls. This is affirmative evidence the BigModel GLM API offering remains active; no shutdown or discontinuation notice was found.",
    "sources": [
      "https://open.bigmodel.cn/pricing",
      "https://open.bigmodel.cn/dev/api/normal-model/glm-4"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "As of October 26, 2026, BigModel’s official pricing page lists hosted API models GLM-4.7-Flash (text) and GLM-4.6V-Flash (vision) as free, including input, output, and cache usage.",
      "infoUrl": "https://open.bigmodel.cn/pricing",
      "detailsUrl": "https://open.bigmodel.cn/dev/api"
    }
  },
  "llmgateway": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Official sources show ongoing maintenance and service activity. The Q3 2026 roundup covers features shipped July–September and reports 50,036,094 platform requests and 1.805 trillion tokens in the quarter. The official changelog lists ongoing feature releases, and the CLI documentation gives current installation and account-management instructions. No discontinuation evidence found.",
    "sources": [
      "https://llmgateway.io/blog/q3-2026-roundup",
      "https://llmgateway.io/changelog",
      "https://docs.llmgateway.io/developers/cli"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Official pricing lists a Free plan at $0 forever, with access to the API and Lounge and one zero-cost model subject to rate limits.",
      "infoUrl": "https://llmgateway.io/pricing",
      "detailsUrl": "https://docs.llmgateway.io/resources/rate-limits"
    }
  },
  "opencode-go": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "As of October 26, 2026, OpenCode’s official Go product page offers Go for $10/month and Go Plus for $40/month, describes their features and model limits, and directs users to create an account and subscribe. Official Console documentation likewise explains how to subscribe, obtain an API key, and use the currently listed models. This is direct current first-party evidence that the product remains offered; no discontinuation conclusion is warranted.",
    "sources": [
      "https://opencode.ai/go",
      "https://opencode.ai/v2/docs/console/go/"
    ],
    "freeTier": {
      "verdict": "no",
      "note": "Go is a paid subscription; some model offers are temporary and are not a standing free Go tier.",
      "infoUrl": "https://opencode.ai/go",
      "detailsUrl": "https://opencode.ai/v2/docs/console/go/"
    }
  },
  "adobe-firefly": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Adobe’s official Firefly product page currently offers Firefly with a “Create now” link to firefly.adobe.com and describes image, video, audio, and design generation. Adobe’s Firefly “What’s new” page lists September 2026 updates, and its official promotion page specifies Firefly plan offers as of October 13, 2026, including image and video models. These current first-party pages show that the product is being offered and maintained; no discontinuation evidence was found.",
    "sources": [
      "https://www.adobe.com/products/firefly.html",
      "https://helpx.adobe.com/firefly/web/whats-new/new-features/whats-new.html",
      "https://helpx.adobe.com/firefly/web/get-started/learn-the-basics/current-firefly-promotions.html"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Adobe’s official Firefly information describes a free plan with limited daily generations.",
      "infoUrl": "https://www.adobe.com/products/firefly/plans.html",
      "detailsUrl": "https://helpx.adobe.com/firefly/web/firefly-ai-assistant/ai-assistant-faq.html"
    }
  },
  "bailian-coding-plan": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Alibaba Cloud’s current official Token Plan overview describes it as a subscription service offered by Model Studio, lists active Personal and Team editions and their plan tiers, and directs users to switch to Singapore to purchase and use it. The official feature-update page, last updated October 11, 2026, lists a May 2026 Token Plan upgrade and an August 2026 Personal Token Plan benefits upgrade. The overview separately says Coding Plan and Token Plan are independent products; its notices about Coding Plan Lite discontinuation therefore do not indicate Token Plan has ended.",
    "sources": [
      "https://www.alibabacloud.com/help/en/model-studio/token-plan-overview",
      "https://www.alibabacloud.com/help/en/model-studio/model-release-notes"
    ],
    "freeTier": {
      "verdict": "no",
      "note": "Token Plan is paid; separate new-user inference quota expires after 90 days and does not apply to Token Plan keys.",
      "infoUrl": "https://www.alibabacloud.com/help/en/model-studio/token-plan-overview",
      "detailsUrl": "https://www.alibabacloud.com/help/en/model-studio/new-free-quota"
    }
  },
  "anthropic": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Anthropic’s official API overview currently describes the Claude API as a REST API at api.anthropic.com, lists available API endpoints, explains how to obtain API keys through the Claude Console, and directs developers to current integration documentation. Anthropic’s status page also tracks Claude API (api.anthropic.com) as a service component; its displayed degraded-performance notice concerns an incident, not discontinuation. These official sources show it remains offered and maintained.",
    "sources": [
      "https://platform.claude.com/docs/en/api/overview",
      "https://platform.claude.com/docs/en/api/messages",
      "https://status.claude.com/"
    ],
    "freeTier": {
      "verdict": "no",
      "note": "No standalone free API tier; API credits are available only with eligible paid Claude plans.",
      "infoUrl": "https://platform.claude.com/docs/en/about-claude/pricing",
      "detailsUrl": "https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers"
    }
  },
  "antigravity": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Google’s official Antigravity site and current getting-started material describe the product and provide installation guidance for its app and related surfaces.",
    "sources": [
      "https://antigravity.google/",
      "https://codelabs.developers.google.com/getting-started-google-antigravity"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "As of October 26, 2026, Google's official pricing page lists a standing Individual plan at $0/month, usable without a subscription.",
      "infoUrl": "https://antigravity.google/pricing/",
      "detailsUrl": "https://antigravity.google/docs/plans/"
    }
  },
  "claude": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Anthropic’s official Claude Code product page and documentation provide current availability, installation, and usage guidance; Anthropic also announced ongoing Cloud session availability in September 2026.",
    "sources": [
      "https://claude.com/product/claude-code",
      "https://docs.anthropic.com/en/docs/claude-code"
    ],
    "freeTier": {
      "verdict": "no",
      "note": "As of October 26, 2026, Anthropic’s pricing page explicitly lists Claude Code as unavailable on the Free plan and available on Pro, Max, Team, and Enterprise plans.",
      "infoUrl": "https://claude.com/pricing",
      "detailsUrl": "https://docs.anthropic.com/en/docs/claude-code/costs"
    }
  },
  "cloudflare-ai": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Cloudflare’s official Workers AI documentation describes the service as available to run models on its serverless GPU network. Its official product changelog contains current 2026 model and feature releases, showing continued maintenance, and the current pricing page lists Workers AI in Free and Paid plans with usage pricing. These sources support that the product remains offered; announced retirements concern individual models, not Workers AI itself.",
    "sources": [
      "https://developers.cloudflare.com/workers-ai/",
      "https://developers.cloudflare.com/changelog/product/workers-ai/",
      "https://developers.cloudflare.com/workers-ai/platform/pricing/"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Cloudflare’s current official pricing documentation says Workers AI is included in the Free and Paid Workers plans.",
      "infoUrl": "https://developers.cloudflare.com/workers-ai/platform/pricing/",
      "detailsUrl": "https://developers.cloudflare.com/workers-ai/"
    }
  },
  "codebuddy-cn": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Tencent’s official CodeBuddy site offers the IDE, plugin, and CLI; its CLI documentation was updated in September 2026.",
    "sources": [
      "https://copilot.tencent.com/",
      "https://copilot.tencent.com/docs/cli/skills"
    ],
    "freeTier": {
      "verdict": "limited",
      "note": "The ¥0 Experience plan is labeled limited-time free; its stated allowance is 500 points/month.",
      "infoUrl": "https://copilot.tencent.com/pricing/",
      "detailsUrl": "https://copilot.tencent.com/"
    }
  },
  "codebuddy-intl": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Tencent’s official documentation currently lists CodeBuddy IDE, editor plugin, and CodeBuddy Code CLI with installation instructions.",
    "sources": [
      "https://www.tencentcloud.com/document/product/1256/77266",
      "https://www.tencentcloud.com/products/acc"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Tencent’s official international pricing page lists a continuing Free edition at $0 with 100 credits per month, 5,000 real-time code completions per month, and 3 automated tasks.",
      "infoUrl": "https://intl.cloud.tencent.com/document/product/1256/77270"
    }
  },
  "context7": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Context7’s official homepage currently presents the product as a live documentation service and lists libraries with freshness indicators showing updates within the preceding day. Its official installation guide provides current setup instructions, including `npx ctx7 setup`, CLI and MCP modes, an API-key flow, and the live MCP endpoint. These official current product and setup pages support that Context7 remains offered; no retirement indication was found.",
    "sources": [
      "https://context7.com/",
      "https://context7.com/docs/installation"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "As of October 26, 2026, Context7's official plan pages show a recurring $0 Free plan.",
      "infoUrl": "https://context7.com/plans",
      "detailsUrl": "https://context7.com/docs/plans-pricing"
    }
  },
  "deepseek": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "DeepSeek’s official changelog records an October 17, 2026 update upgrading the API’s DeepSeek-V4.1-Flash model and explicitly says the API calling method and pricing remain unchanged; it also announces new Search API functionality. The current official docs provide API endpoints, model names, a live pricing table, and request examples. The retirement notices apply to specific legacy model names, not the DeepSeek API product; a separate notice says V4 Pro API service continued after September 14, 2026.",
    "sources": [
      "https://api-docs.deepseek.com/updates/",
      "https://api-docs.deepseek.com/",
      "https://api-docs.deepseek.com/quick_start/pricing/"
    ],
    "freeTier": {
      "verdict": "limited",
      "note": "Temporary free Search/Fetch tools through selected integrations end November 1, 2026; model API use is paid.",
      "infoUrl": "https://api-docs.deepseek.com/quick_start/pricing",
      "detailsUrl": "https://api-docs.deepseek.com/guides/search/"
    }
  },
  "firecrawl": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Official Firecrawl docs currently describe its hosted API, account/API-key access, and active endpoints for Search, Scrape, Monitor, and Interact. Its official changelog lists recent product updates, including releases dated October 22 and October 21, 2026. The official status page reported all services online, including api.firecrawl.dev and firecrawl.dev, last updated October 25, 2026. This supports that Firecrawl is still offered and maintained, not discontinued.",
    "sources": [
      "https://docs.firecrawl.dev/introduction",
      "https://www.firecrawl.dev/changelog",
      "https://status.firecrawl.dev/"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Firecrawl offers an ongoing hosted Free Plan at $0/month, not just introductory credits.",
      "infoUrl": "https://www.firecrawl.dev/pricing",
      "detailsUrl": "https://docs.firecrawl.dev/billing"
    }
  },
  "glm": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Z.AI's current official developer documentation describes the GLM Coding Plan as a subscription, lists supported models and active Lite/Pro/Max credit allowances, and says plans start at $18/month. Its July 30, 2026 official plan-update notice states the new credits-based plan is available and directs users to the subscription page for current tiers and prices. The live official subscription page is titled “GLM Coding Plan” and identifies currently offered GLM models. This is positive current-offering evidence, not an inference from access failures.",
    "sources": [
      "https://z.ai/subscribe",
      "https://docs.z.ai/devpack/overview",
      "https://docs.z.ai/devpack/notice/usage-revision"
    ],
    "freeTier": {
      "verdict": "no",
      "note": "As of October 26, 2026, Z.AI’s official subscription page lists paid Individual plans only: Lite, Pro, and Max.",
      "infoUrl": "https://z.ai/subscribe",
      "detailsUrl": "https://docs.z.ai/devpack/overview"
    }
  },
  "glm-cn": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "截至 2026-10-26，BigModel 官方 API 文档仍将通过 API 调用模型列为平台能力，说明平台提供快速开始、API Key、SDK 与 HTTP API 接入；官方定价页仍列出多款 GLM 模型的 API 按量价格，并明确说明 API 计费方式。这足以确认 BigModel GLM API 仍在提供。官方页面未将 `glm-cn` 作为产品或模型 ID 展示，因此该字符串应视为目录中的提供方标识，而非官方产品标识；未发现官方停服或退役公告。",
    "sources": [
      "https://open.bigmodel.cn/dev/api",
      "https://open.bigmodel.cn/pricing",
      "https://open.bigmodel.cn/"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "The official pricing page says BigModel offers free API models, specifically GLM-4.7-Flash (text; 200K context) and GLM-4.6V-Flash (vision), with input, output, and cache listed as free.",
      "infoUrl": "https://open.bigmodel.cn/pricing",
      "detailsUrl": "https://open.bigmodel.cn/dev/api"
    }
  },
  "jina-ai": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Jina AI's official API reference is labeled Jina Search Foundation API and displays version v2026.10.13.1624, with documented live API routes for listing models, embeddings, reranking, chat completions, and batch embeddings. It also provides authentication instructions and links to obtain an API key. Jina's official Embedding API page describes access through the Jina Search Foundation API, offers a free trial, and lists recent 2026 publications. These current official product and documentation pages support that the API remains offered and maintained; no retirement evidence was found.",
    "sources": [
      "https://api.jina.ai/scalar",
      "https://jina.ai/embeddings/"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Official Jina materials describe the hosted Reader API as available for free: the published limit is 20 requests per minute without an API key and 500 RPM with a free API key.",
      "infoUrl": "https://jina.ai/reader/",
      "detailsUrl": "https://jina.ai/embeddings/"
    }
  },
  "jina-reader": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Jina’s official Reader page currently describes the Reader API, gives the r.jina.ai URL-prefix usage and a curl example, and provides controls for using the service. Jina’s official status page lists both Reader and r.jina.ai as Operational. These current official sources support that Reader remains offered and maintained; no shutdown notice was found in the sources checked.",
    "sources": [
      "https://jina.ai/reader/",
      "https://status.jina.ai/"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Official Reader materials describe the hosted Reader API as free for basic usage.",
      "infoUrl": "https://jina.ai/reader/",
      "detailsUrl": "https://docs.jina.ai/reader/"
    }
  },
  "kilocode": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Kilo’s official site offers current products across desktop, IDE, CLI, cloud, Slack, and mobile. The end-of-life notice applies to a legacy IDE codebase and directs users to current Kilo products.",
    "sources": [
      "https://kilocode.ai/",
      "https://github.com/Kilo-Org/kilocode"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "The official pricing page lists the Individual platform plan at $0 and says users can use free models.",
      "infoUrl": "https://kilo.ai/pricing",
      "detailsUrl": "https://kilo.ai/docs/getting-started/using-kilo-for-free"
    }
  },
  "moonshot": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "The official Kimi API documentation currently presents the platform as available: its overview gives steps to create an API key and make API calls, while official pricing lists current K3-series API models and pay-as-you-go rates. The model catalog also gives forward-looking K2 access/retirement timing for October and December 2026, consistent with an actively maintained platform. Note: the catalog says the legacy moonshot-v1 model series was discontinued on August 31, 2026; that is a model retirement, not evidence that Kimi API itself shut down.",
    "sources": [
      "https://platform.kimi.ai/docs/overview",
      "https://platform.kimi.ai/docs/pricing/chat",
      "https://platform.kimi.ai/docs/models"
    ],
    "freeTier": {
      "verdict": "limited",
      "note": "As of October 26, 2026, official Kimi materials describe a new-user trial voucher, not a standing recurring free tier: eligible new users registering with a mainland China mobile number receive RMB 15 in…",
      "infoUrl": "https://www.kimi.com/en/help/kimi-api/api-free-trial",
      "detailsUrl": "https://platform.kimi.ai/docs/pricing/limits"
    }
  },
  "minimax-cn": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "MiniMax’s official China-platform quickstart currently says API users must register and obtain an API key, gives active API base URLs (api.minimax.cn/anthropic and api.minimax.cn/v1), and explains how to add paid resources. Its official model release-notes page lists a latest release dated October 19, 2026 (MiniMax M3.1 Flash), demonstrating current maintenance. These official current sources support Active, not removal.",
    "sources": [
      "https://platform.minimax.cn/docs/guides/quickstart-preparation",
      "https://platform.minimax.cn/docs/release-notes/models"
    ],
    "freeTier": {
      "verdict": "limited",
      "note": "New API users may receive trial quota; the official page does not state its amount or duration.",
      "infoUrl": "https://platform.minimaxi.com/docs/solutions/eigent",
      "detailsUrl": "https://platform.minimaxi.com/docs/pricing/overview"
    }
  },
  "minimax": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Official MiniMax pages show the Coding Plan is still being offered and maintained: the current subscription URL (/subscribe/coding-plan) serves a live M Plan subscription page with purchasable Go, Explore, and Build tiers and coding-tool/API-key benefits; current M Plan FAQ documents tier management and subscription cancellation; and the official M2.7 release page links to the Coding Plan as an access option. The product is now presented under the M Plan branding, but these current pages do not indicate shutdown or discontinuation.",
    "sources": [
      "https://platform.minimax.io/subscribe/coding-plan",
      "https://platform.minimax.io/docs/m-plan/faq",
      "https://www.minimax.io/news/minimax-m27-en"
    ],
    "freeTier": {
      "verdict": "no",
      "note": "As of October 26, 2026, MiniMax's official documentation describes MiniMax Code as included with an M Plan subscription.",
      "infoUrl": "https://www.minimax.io/m-plan",
      "detailsUrl": "https://platform.minimax.io/docs/m-plan/intro"
    }
  },
  "nanogpt": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "NanoGPT's official model catalog is currently live and presents 1,214 models across categories, including a notice that 113 models were added in the last 30 days. Its official API page documents an available OpenAI-compatible API, API-key creation, and supported endpoints. These current official sources show the product is offered and maintained, not discontinued.",
    "sources": [
      "https://nano-gpt.com/models",
      "https://nano-gpt.com/api"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "NanoGPT’s current pricing page lists a $0/month pay-as-you-go plan and says it includes one free model, available on the web only; its get-started guide says that free model needs no account or balance.",
      "infoUrl": "https://nano-gpt.com/pricing",
      "detailsUrl": "https://nano-gpt.com/get-started"
    }
  },
  "ollama-cloud": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Ollama’s official cloud documentation currently describes using hosted cloud models through its API and app/CLI, and its API authentication docs state that direct cloud inference at ollama.com/api and /v1 requires an API key. A dated official pricing announcement (August 31, 2026) says Ollama’s cloud plans are available for signup and describes paid and free cloud usage. The requested key-management URL loads an official sign-in page, which is consistent with an account-gated settings page, not evidence of discontinuation. Together these current official sources indicate the product is still offered and maintained as of October 26, 2026.",
    "sources": [
      "https://docs.ollama.com/cloud",
      "https://docs.ollama.com/api/authentication",
      "https://ollama.com/blog/transparent-pricing"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "As of October 26, 2026, Ollama's official pricing page lists a Free plan with starter usage credits for a smaller set of hosted starter models.",
      "infoUrl": "https://ollama.com/pricing",
      "detailsUrl": "https://ollama.com/blog/transparent-pricing"
    }
  },
  "openrouter": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "OpenRouter’s official API changelog records a new API response code on October 23, 2026, and endpoint changes on October 22, 2026, clear evidence of current maintenance. Its live official model catalog lists available models, including entries dated October 23, 2026, confirming the product remains offered. No discontinuation evidence was found in these current official sources.",
    "sources": [
      "https://openrouter.ai/docs/changelog",
      "https://openrouter.ai/models"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "OpenRouter’s current pricing page lists a Free plan with Chat and API access and 25+ free models.",
      "infoUrl": "https://openrouter.ai/pricing",
      "detailsUrl": "https://openrouter.ai/docs/api_reference/limits"
    }
  },
  "qwen-cloud-token-plan": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "The listed product page is live and currently advertises the Token Plan with a “Subscribe Now” call to action, Individual and Team plans, plan tiers, and supported AI tools. QwenCloud’s current documentation independently describes Token Plan as an available subscription service, details Personal and Team editions, and lists pricing and quotas. No retirement or discontinuation notice was found in the reviewed official sources.",
    "sources": [
      "https://www.qwencloud.com/pricing/token-plan",
      "https://docs.qwencloud.com/token-plan/overview"
    ],
    "freeTier": {
      "verdict": "no",
      "note": "Token Plan is paid; separate new-user inference quota is temporary and not a Token Plan allowance.",
      "infoUrl": "https://www.qwencloud.com/pricing/token-plan",
      "detailsUrl": "https://docs.qwencloud.com/token-plan/personal/token-plan-personal-overview"
    }
  },
  "tavily-search": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Tavily’s official API reference currently documents the Search endpoint and its request/response parameters. The official changelog lists Search API changes in August 2026 and July 2026, indicating ongoing maintenance as of October 26, 2026. Tavily’s official pricing page continues to offer API plans, account signup, API keys, and monthly free credits. No retirement notice was found in these official sources.",
    "sources": [
      "https://docs.tavily.com/documentation/api-reference/endpoint/search",
      "https://docs.tavily.com/changelog",
      "https://www.tavily.com/pricing"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Tavily's official pricing lists a standing Researcher free plan with 1,000 API credits per month and no credit card required.",
      "infoUrl": "https://www.tavily.com/pricing",
      "detailsUrl": "https://docs.tavily.com/documentation/api-credits"
    }
  },
  "vertex": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Google’s official April 2026 announcement calls Gemini Enterprise Agent Platform the “evolution of Vertex AI.” Google’s name-change documentation maps Vertex AI Platform and numerous Vertex AI services to current Gemini Enterprise Agent Platform names, indicating a transition/rebrand rather than discontinuation. The successor platform’s official release notes show ongoing releases in September 2026. The old Vertex AI brand is not the current product-page branding, but the platform and its capabilities remain offered and maintained.",
    "sources": [
      "https://cloud.google.com/blog/products/ai-machine-learning/the-new-gemini-enterprise-one-platform-for-agent-development",
      "https://docs.cloud.google.com/gemini-enterprise-agent-platform/vertex-ai-name-changes",
      "https://docs.cloud.google.com/gemini-enterprise-agent-platform/release-notes"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Ongoing free quotas apply to specific features; this is not a blanket free allowance for every Vertex service.",
      "infoUrl": "https://cloud.google.com/vertex-ai/generative-ai/pricing",
      "detailsUrl": "https://docs.cloud.google.com/free/docs/free-cloud-features"
    },
    "crossChecked": true
  },
  "vertex-partner": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Google’s current official documentation, now under the Gemini Enterprise Agent Platform branding, explicitly says partner models are offered as managed APIs in Model Garden and lists currently available partner models, including Anthropic and Mistral models. Google’s overview describes partner models as an active platform model type, and the listed Vertex AI site continues to describe third-party models in Model Garden. This supports continued availability; it is not evidence of discontinuation.",
    "sources": [
      "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/partner-models/use-partner-models",
      "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models",
      "https://cloud.google.com/vertex-ai"
    ],
    "freeTier": {
      "verdict": "no",
      "note": "No recurring free partner-model quota; Google Cloud trial credits exclude managed partner models.",
      "infoUrl": "https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing",
      "detailsUrl": "https://docs.cloud.google.com/free/docs/free-cloud-features"
    },
    "crossChecked": true
  },
  "volcengine-agent-plan": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "As of 2026-10-26, Volcengine’s official Agent Plan product page presents Small, Medium, Large, and Max subscription tiers, each with an ‘立即订阅’ (Subscribe) action, and advertises current model support and a limited-time offer. The exact listed console route resolves to the Ark console’s Agent Plan section. An official model deprecation notice schedules retirement of specific models, not the Agent Plan product, and lists replacement models; it does not announce product discontinuation.",
    "sources": [
      "https://www.volcengine.com/activity/agentplan",
      "https://console.volcengine.com/ark/region:cn-beijing/subscription/agent-plan",
      "https://ark.volcengine.com/region:cn-beijing/docs/agent-plan-personal-model-deprecation-announcement"
    ],
    "freeTier": {
      "verdict": "no",
      "note": "Agent Plan is paid; separate new-user inference quota does not make the subscription free.",
      "infoUrl": "https://www.volcengine.com/docs/ark/agent-plan-personal-plan-overview",
      "detailsUrl": "https://www.volcengine.com/docs/ark/model-pricing"
    }
  },
  "volcengine-coding-plan": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Official Volcengine evidence supports that the plan remained offered and maintained on 2026-10-26: the specified console route identifies Agent/Coding Plan subscriptions and prompts users to log in to subscribe; the official Coding Plan getting-started guide documents current supported models and configuration, with a last-updated timestamp of 2026-09-23; and Volcengine's official Lite/Pro promotion page states an offer period through 2026-11-08. The console's login gate is not treated as evidence of unavailability.",
    "sources": [
      "https://console.volcengine.com/ark/region:cn-beijing/subscription/coding-plan",
      "https://www.volcengine.com/docs/ark/coding-plan-personal-get-started",
      "https://www.volcengine.com/docs/ark/coding-plan-personal-universal-promotion"
    ],
    "freeTier": {
      "verdict": "no",
      "note": "Coding Plan is paid; separate inference quota is not included with this plan.",
      "infoUrl": "https://www.volcengine.com/docs/ark/coding-plan-personal-plan-overview",
      "detailsUrl": "https://www.volcengine.com/activity/codingplan"
    }
  },
  "xiaomi-mimo": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Official Xiaomi MiMo sources show the API platform remains maintained and offered as of October 26, 2026: its release log lists the MiMo-V2.6 series as released on September 22, 2026, and its current model catalog lists V2.6 API models with capabilities and quotas. The retirement notice is specifically for the older MiMo-V2.5-Pro and MiMo-V2.5 model IDs on October 21, 2026; it directs users to switch to V2.6 rather than announcing shutdown of the API platform.",
    "sources": [
      "https://mimo.mi.com/docs/en-US/updates/model",
      "https://mimo.mi.com/docs/en-US/quick-start/summary/model",
      "https://mimo.mi.com/docs/en-US/updates/deprecate"
    ],
    "freeTier": {
      "verdict": "limited",
      "note": "New-account credits and limited-time offers are available; no recurring free API allowance is listed.",
      "infoUrl": "https://mimo.mi.com/docs/price/pay-as-you-go",
      "detailsUrl": "https://mimo.mi.com/docs/en-US/price/token-plan"
    }
  },
  "xiaomi-mimo-token-plan": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Xiaomi’s official current Token Plan pricing page lists individual and team monthly and annual subscriptions with prices and quotas, describes access to the latest MiMo-V2.6 models, and explains how to continue service after quota exhaustion. Its official subscription documentation likewise instructs users to subscribe and obtain a Token Plan API key. The notice that MiMo-V2.5 models were taken offline on October 21, 2026 applies to those models, not to the Token Plan product; the pricing page still presents the plan as offered.",
    "sources": [
      "https://mimo.mi.com/docs/en-US/price/token-plan",
      "https://mimo.mi.com/docs/en-US/tokenplan/Token%20Plan/subscription"
    ],
    "freeTier": {
      "verdict": "no",
      "note": "Token Plan tiers are paid; temporary model-specific offers do not create a free subscription.",
      "infoUrl": "https://mimo.mi.com/docs/en-US/price/token-plan",
      "detailsUrl": "https://mimo.mi.com/docs/en-US/tokenplan/Token%20Plan/subscription"
    }
  },
  "zai": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Z.AI’s official product page currently offers access to all Z.AI models, pay-as-you-go pricing, prepaid usage bundles, and self-serve deployment. Its official API reference describes platform REST APIs, Standard API Key authentication, interactive API testing, and billing rules stating API access continues after bundle quota is exhausted. The official release-notes page lists GLM-5.3-Flash and other GLM models, consistent with an actively maintained API offering. No shutdown or retirement notice was found in the reviewed official sources.",
    "sources": [
      "https://z.ai/model-api",
      "https://docs.z.ai/api-reference/introduction",
      "https://docs.z.ai/release-notes/new-released"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Z.AI’s current official API pricing table lists hosted API usage as Free for GLM-4.7-Flash, GLM-4.5-Flash, and GLM-4.6V-Flash (including input and output pricing).",
      "infoUrl": "https://docs.z.ai/guides/overview/pricing.md",
      "detailsUrl": "https://z.ai/model-api"
    }
  },
  "together": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Market-scan candidate; service currently offered. The official product page describes a managed serverless inference API for hosted models. Together's developer quickstart documents official Python and TypeScript SDKs, direct REST calls, and use of the OpenAI SDK with Together's API base URL (https://api.together.ai/v1), making it a straightforward provider-style inference integration.",
    "sources": [
      "https://www.together.ai/inference",
      "https://docs.together.ai/docs/quickstart",
      "https://www.together.ai/pricing"
    ],
    "freeTier": {
      "verdict": "no",
      "note": "No ongoing free hosted tier; API access requires at least $5 in purchased prepaid credit.",
      "detailsUrl": "https://docs.together.ai/docs/billing-credits"
    }
  },
  "fireworks": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Market-scan candidate; service currently offered. Fireworks currently offers serverless inference and describes a single API across serverless, reserved-throughput, and BYOC options. Its official quickstart gives a direct serverless integration using an API key and the OpenAI-compatible endpoint https://api.fireworks.ai/inference/v1, with examples for Fireworks, OpenAI, and Anthropic SDKs; the product page also confirms OpenAI Chat Completions and Responses API and Anthropic Messages API support.",
    "sources": [
      "https://fireworks.ai/platform/inference",
      "https://docs.fireworks.ai/getting-started/quickstart",
      "https://fireworks.ai/pricing"
    ],
    "freeTier": {
      "verdict": "limited",
      "note": "New accounts may receive a one-time $1 credit; standard inference is prepaid and metered.",
      "detailsUrl": "https://fireworks.ai/blog/best-llm-api-providers"
    }
  },
  "groq": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Market-scan candidate; service currently offered. Groq's current docs describe a hosted Groq API and provide working REST examples at https://api.groq.com/openai/v1. The API is directly usable with Groq's Python/TypeScript SDKs or OpenAI client libraries by configuring the Groq API key and base URL; the supported-models catalog describes models as hosted and directly accessible through its Models API endpoint.",
    "sources": [
      "https://console.groq.com/docs/overview",
      "https://console.groq.com/docs/openai",
      "https://console.groq.com/docs/models"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Ongoing Free tier with rate limits and restrictions; occasional promotional credits are separate.",
      "detailsUrl": "https://console.groq.com/docs/models"
    }
  },
  "cerebras": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Market-scan candidate; service currently offered. Cerebras currently offers its inference cloud/API. Its official quickstart instructs developers to create an API key, install the Cerebras SDK or call the API directly with cURL, and send chat-completion requests. The docs also direct developers to the API reference for endpoints and parameters, establishing a straightforward provider-style developer integration.",
    "sources": [
      "https://www.cerebras.ai/inference",
      "https://inference-docs.cerebras.ai/quickstart",
      "https://www.cerebras.ai/pricing"
    ],
    "freeTier": {
      "verdict": "limited",
      "note": "One-time $5 trial credit after adding a verified payment method; it expires after 30 days.",
      "detailsUrl": "https://inference-docs.cerebras.ai/support/rate-limits"
    }
  },
  "deepinfra": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Market-scan candidate; service currently offered. DeepInfra's official documentation describes an OpenAI-compatible inference API for 100+ LLMs and instructs developers to point an existing OpenAI SDK at https://api.deepinfra.com/v1/openai. The docs provide a quickstart for making an API call, confirming direct developer-facing provider integration.",
    "sources": [
      "https://deepinfra.com/docs",
      "https://docs.deepinfra.com/",
      "https://deepinfra.com/pricing"
    ],
    "freeTier": {
      "verdict": "no",
      "note": "Official pricing requires a card or prepaid balance for hosted inference; no recurring free allowance is listed.",
      "detailsUrl": "https://deepinfra.com/docs"
    }
  },
  "huggingface": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Market-scan candidate; service currently offered. The official documentation describes a unified proxy API for hundreds of models from multiple providers, with a single Hugging Face token, native Python and JavaScript clients, raw HTTP access, and an OpenAI-compatible chat-completions endpoint. The first-call guide provides a working Python InferenceClient example and provider selection options, establishing a straightforward developer-facing integration.",
    "sources": [
      "https://huggingface.co/docs/inference-providers/en/index",
      "https://huggingface.co/docs/inference-providers/en/pricing",
      "https://huggingface.co/docs/inference-providers/en/guides/first-api-call"
    ],
    "freeTier": {
      "verdict": "no",
      "note": "Free users receive no monthly routed-inference credits; hosted Inference Providers require purchased credits or a paid plan.",
      "detailsUrl": "https://huggingface.co/pricing"
    }
  },
  "baseten": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Market-scan candidate; service currently offered. Baseten’s live product page markets Model APIs as managed hosted model endpoints. The official docs specify a direct inference endpoint at https://inference.baseten.co/v1/chat/completions and show integration through the OpenAI SDK by supplying a Baseten API key and model slug. The service implements the OpenAI Chat Completions format; Anthropic Messages API support is also documented but identified as beta.",
    "sources": [
      "https://www.baseten.co/products/model-apis/",
      "https://docs.baseten.co/inference/model-apis/overview",
      "https://www.baseten.co/pricing/"
    ],
    "freeTier": {
      "verdict": "limited",
      "note": "New accounts receive experimentation credits; no recurring free Model API allowance is documented.",
      "detailsUrl": "https://docs.baseten.co/inference/model-apis/overview"
    }
  },
  "replicate": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Market-scan candidate; service currently offered. Replicate's current docs describe running models through its cloud API. Its HTTP API documents token-based Bearer authentication and a direct POST https://api.replicate.com/v1/predictions endpoint for creating inference requests.",
    "sources": [
      "https://replicate.com/docs",
      "https://replicate.com/docs/reference/http",
      "https://replicate.com/pricing"
    ],
    "freeTier": {
      "verdict": "no",
      "note": "Hosted model runs are paid; official billing requires prepaid credits or pay-as-you-go usage.",
      "detailsUrl": "https://replicate.com/docs/topics/billing/prepaid-credit"
    }
  },
  "vercel-ai-gateway": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Market-scan candidate; service currently offered. Vercel currently offers AI Gateway as a hosted unified gateway. Its official getting-started documentation shows direct authenticated requests to the gateway’s Chat Completions endpoint with cURL, integration using Vercel’s AI SDK in TypeScript and Python, and migration of existing supported SDK/API clients. The docs also describe access to models from multiple providers through the unified API.",
    "sources": [
      "https://vercel.com/ai-gateway",
      "https://vercel.com/docs/ai-gateway/getting-started",
      "https://vercel.com/docs/ai-gateway/pricing"
    ],
    "freeTier": {
      "verdict": "limited",
      "note": "Conditional $5/month AI Gateway credit for eligible models; requires a payment method and has model-specific limits.",
      "detailsUrl": "https://vercel.com/docs/ai-gateway/getting-started"
    }
  },
  "portkey": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Market-scan candidate; service currently offered. The official product page currently presents the gateway as generally available (rebranded there as PRISMA AIRS AI Gateway) and describes a unified API for connecting to LLM providers. Its official quickstart documents Python and JavaScript Portkey SDKs, direct REST requests to api.portkey.ai, and use of the OpenAI SDK with Portkey's gateway URL; it also documents Anthropic's native /messages endpoint. These are straightforward developer-facing gateway integrations.",
    "sources": [
      "https://portkey.ai/features/ai-gateway",
      "https://portkey.ai/pricing",
      "https://docs.portkey.ai/docs/guides/getting-started/getting-started-with-ai-gateway"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Free Developer plan includes 10,000 recorded logs/month; this covers gateway/observability features, not free model-inference tokens.",
      "detailsUrl": "https://docs.portkey.ai/docs/introduction/what-is-portkey"
    }
  },
  "mistral": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Market-scan candidate; service currently offered. The official API reference documents hosted chat inference at POST /v1/chat/completions and provides working cURL, Python SDK, and TypeScript SDK examples authenticated with a Mistral API key. The official API pricing page lists currently served models with token-based prices.",
    "sources": [
      "https://docs.mistral.ai/api/",
      "https://docs.mistral.ai/admin/billing-usage/usage-limits",
      "https://docs.mistral.ai/inference/pricing"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Ongoing Free mode includes monthly API usage within account-specific limits; the public pricing page does not state a universal quota.",
      "detailsUrl": "https://docs.mistral.ai/inference/pricing"
    }
  },
  "sambanova": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Market-scan candidate; service currently offered. The current official Cloud landing page provides a working developer quickstart with an OpenAI-compatible chat-completions endpoint at https://api.sambanova.ai/v1/chat/completions, bearer API-key authentication, and a Python SambaNova client example using base_url https://api.sambanova.ai/v1. Official developer documentation explicitly covers SambaCloud. These are straightforward provider-style API and SDK integrations.",
    "sources": [
      "https://cloud.sambanova.ai/",
      "https://docs.sambanova.ai/docs/en/get-started/overview",
      "https://cloud.sambanova.ai/plans"
    ],
    "freeTier": {
      "verdict": "limited",
      "note": "No recurring no-cost inference quota was confirmed; any community or launch credits are conditional/promotional, and current requests require purchased credits.",
      "detailsUrl": "https://cloud.sambanova.ai/plans/pricing"
    }
  },
  "exa-search": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Market-scan candidate; service currently offered. Exa’s current official reference documents a hosted Search endpoint that searches the web and extracts result contents. It authenticates with an Exa API key via the x-api-key header (or Bearer authorization), and the official quickstart describes making API requests and configuring search/result content options. This is a direct developer-facing search/retrieval API integration.",
    "sources": [
      "https://exa.ai/docs/reference/search",
      "https://exa.ai/docs/search/quickstart",
      "https://exa.ai/docs/admin/pricing"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "$10 in API credits refreshes monthly, with no payment method required; separate signup bonus is one-time.",
      "detailsUrl": "https://exa.ai/pricing"
    }
  },
  "brave-search": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Market-scan candidate; service currently offered. Official developer docs describe LLM Context as search for AI agents and RAG, returning extracted web content and source metadata. It exposes GET and POST REST endpoints at https://api.search.brave.com/res/v1/llm/context and authenticates requests using the X-Subscription-Token API-key header, supporting straightforward provider-style integration.",
    "sources": [
      "https://brave.com/search/api/",
      "https://api-dashboard.search.brave.com/documentation/services/llm-context",
      "https://api-dashboard.search.brave.com/documentation/guides/authentication"
    ],
    "freeTier": {
      "verdict": "limited",
      "note": "$5 monthly credit is applied to the prepaid Search plan; usage beyond that amount is paid.",
      "detailsUrl": "https://api-dashboard.search.brave.com/documentation/guides/authentication"
    }
  },
  "serpapi": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Market-scan candidate; service currently offered. The official product page documents a direct HTTP search endpoint (https://serpapi.com/search?engine=google), accepts search parameters such as q, and returns structured JSON results. SerpApi also documents an official Python package with API-key authentication and a client.search example for Google Search.",
    "sources": [
      "https://serpapi.com/search-api",
      "https://serpapi.com/pricing",
      "https://serpapi.com/integrations/python"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Recurring Free Plan includes 250 searches/month.",
      "detailsUrl": "https://serpapi.com/search-api"
    }
  },
  "cohere": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Market-scan candidate; service currently offered. The official API overview describes making authenticated POST requests with a bearer API key and JSON bodies, and identifies official Python, TypeScript, Java, and Go SDKs. It presents Cohere models and endpoints for generation, embeddings, reranking, parsing, and related use cases, fitting a direct provider-style developer integration.",
    "sources": [
      "https://docs.cohere.com/reference/about",
      "https://cohere.com/pricing",
      "https://docs.cohere.com/docs/rate-limits"
    ],
    "freeTier": {
      "verdict": "limited",
      "note": "Trial keys allow up to 1,000 API calls/month, but are not permitted for production or commercial use.",
      "detailsUrl": "https://docs.cohere.com/docs/rate-limits"
    }
  },
  "nvidia": {
    "availability": "active",
    "checkedAt": "2026-10-26",
    "evidence": "Market-scan candidate; service currently offered. NVIDIA's current Build site offers inference endpoints, while NVIDIA's developer page describes NVIDIA-hosted NIM API endpoints for building applications. The official NIM API reference documents OpenAI-compatible inference endpoints, including chat completions, completions, and Responses, making this a direct developer-facing inference integration. The API reference primarily documents NIM container endpoints; the developer and Build pages establish the hosted offering.",
    "sources": [
      "https://docs.nvidia.com/nim/large-language-models/latest/api-reference.html",
      "https://developer.nvidia.com/nim",
      "https://build.nvidia.com/"
    ],
    "freeTier": {
      "verdict": "yes",
      "note": "Hosted Build endpoints allow free, rate-limited prototyping; NVIDIA says most models permit up to 40 requests/minute.",
      "detailsUrl": "https://developer.nvidia.com/nim"
    }
  },
};
