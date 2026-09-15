import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@neondatabase/serverless';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    res.status(500).json({
      ok: false,
      error: 'Server configuration error: DATABASE_URL not set',
    });
    return;
  }

  try {
    const result = await sql`SELECT NOW()`;
    res.status(200).json({
      ok: true,
      timestamp: result[0],
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      ok: false,
      error: errorMessage,
    });
  }
}
