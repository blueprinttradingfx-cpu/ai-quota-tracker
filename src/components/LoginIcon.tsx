import type { LoginMethod } from '../types';
import { LOGIN_LABEL } from '../logins';

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export default function LoginIcon({ method, size = 16 }: { method: LoginMethod; size?: number }) {
  if (!method) return null;
  const label = LOGIN_LABEL[method];
  const common = { width: size, height: size, role: 'img', 'aria-label': `Signed in with ${label}`, className: 'lg' } as const;
  switch (method) {
    case 'google':
      return (
        <svg {...common} viewBox="0 0 24 24">
          <title>{`Signed in with ${label}`}</title>
          <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3a7.2 7.2 0 0 1-4.06 1.14c-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24z" />
          <path fill="#FBBC05" d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.27a12 12 0 0 0 0 10.74l4-3.1z" />
          <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.43-3.43A11.93 11.93 0 0 0 12 0 12 12 0 0 0 1.27 6.63l4 3.1C6.22 6.88 8.87 4.77 12 4.77z" />
        </svg>
      );
    case 'microsoft':
      return (
        <svg {...common} viewBox="0 0 22 22">
          <title>{`Signed in with ${label}`}</title>
          <rect width="10.5" height="10.5" fill="#F25022" />
          <rect x="11.5" width="10.5" height="10.5" fill="#7FBA00" />
          <rect y="11.5" width="10.5" height="10.5" fill="#00A4EF" />
          <rect x="11.5" y="11.5" width="10.5" height="10.5" fill="#FFB900" />
        </svg>
      );
    case 'x':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="currentColor">
          <title>{`Signed in with ${label}`}</title>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case 'github':
      return (
        <svg {...common} viewBox="0 0 24 24" fill="currentColor">
          <title>{`Signed in with ${label}`}</title>
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
        </svg>
      );
    case 'email':
      return (
        <svg {...common} viewBox="0 0 24 24" {...line}>
          <title>{`Signed in with ${label}`}</title>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );
    case 'apikey':
      return (
        <svg {...common} viewBox="0 0 24 24" {...line}>
          <title>{`Signed in with ${label}`}</title>
          <circle cx="8" cy="12" r="4" />
          <path d="M12 12h9M18 12v3M21 12v2" />
        </svg>
      );
    case 'other':
      return (
        <svg {...common} viewBox="0 0 24 24" {...line}>
          <title>{`Signed in with ${label}`}</title>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      );
  }
}
