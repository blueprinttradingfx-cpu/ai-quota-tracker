import { handle, resolveServerEnv } from '../src/connect/server';

/** POST /api/connect: sign-in and quota proxy. Same-origin only, and it stores nothing. */
export async function POST(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return Response.json({ ok: false, error: 'Cross-origin requests are not allowed.' }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Bad request.' }, { status: 400 });
  }
  const reply = await handle(body, undefined, undefined, resolveServerEnv(process.env));
  return Response.json(reply.body, { status: reply.status, headers: { 'Cache-Control': 'no-store' } });
}
