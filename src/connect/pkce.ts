const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export function randomString(bytes = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** RFC 7636 S256 challenge for a verifier. */
export async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return b64url(new Uint8Array(digest));
}

/** The fields needed to start a PKCE sign-in. */
export async function newPkce(): Promise<{ verifier: string; challenge: string; state: string }> {
  const verifier = randomString(48);
  return { verifier, challenge: await challengeFor(verifier), state: randomString(24) };
}
