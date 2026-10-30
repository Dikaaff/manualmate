import { NextResponse } from 'next/server';
import { APP_VERSION, configuredModel, hasModelKey, resolveMode } from '../../lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const configured = hasModelKey();
  return NextResponse.json(
    {
      ok: configured,
      configured,
      provider: resolveMode(),
      model: configured ? configuredModel() : 'none',
      version: APP_VERSION,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
