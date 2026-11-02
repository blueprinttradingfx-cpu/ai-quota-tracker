import type { LoginMethod } from './types';

export const LOGIN_LABEL: Record<LoginMethod, string> = {
  '': 'None',
  google: 'Google',
  x: 'X',
  microsoft: 'Microsoft',
  github: 'GitHub',
  email: 'Email',
  apikey: 'API key',
  other: 'Other',
};

export const LOGIN_KEYS = Object.keys(LOGIN_LABEL) as LoginMethod[];
