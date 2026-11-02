import type { AccountView, ProviderConfig, Account, Store } from './types';
import { materialize } from './schedule';
import { PROVIDER_BY_ID } from './config/providers';

/** The plan an account is on, falling back to the provider's first (default) plan. */
export function planOf(provider: ProviderConfig, account: Account) {
  return provider.plans?.find((p) => p.name === account.plan) ?? provider.plans?.[0];
}

export function buildViews(store: Store): AccountView[] {
  return store.accounts.flatMap((account) => {
    const provider = PROVIDER_BY_ID.get(account.providerId);
    if (!provider) return [];
    const plan = planOf(provider, account);
    const windows = provider.windows
      .filter((spec) => !plan?.windows || plan.windows.includes(spec.id))
      .map((spec) => materialize({ ...spec, total: plan?.totals?.[spec.id] ?? spec.total }, account.usage[spec.id]));
    return [{ account, provider, planName: plan?.name ?? account.plan, windows }];
  });
}
