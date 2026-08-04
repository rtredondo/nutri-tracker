import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  const appsScriptToken = process.env.APPS_SCRIPT_TOKEN;

  if (!appsScriptUrl || !appsScriptToken) {
    res.status(500).json({
      ok: false,
      error: 'Server configuration error: missing Apps Script credentials',
    });
    return;
  }

  try {
    if (req.method === 'GET') {
      // Forward GET request with query parameters
      const { action, from, to } = req.query;
      const url = new URL(appsScriptUrl);
      url.searchParams.append('token', appsScriptToken);
      if (action) url.searchParams.append('action', String(action));
      if (from) url.searchParams.append('from', String(from));
      if (to) url.searchParams.append('to', String(to));

      const response = await fetch(url.toString(), { redirect: 'follow' });
      const data = await response.json();
      res.status(response.status).json(data);
    } else if (req.method === 'POST') {
      // Forward POST request with text/plain content type
      const url = new URL(appsScriptUrl);
      url.searchParams.append('token', appsScriptToken);

      let body: string;
      if (typeof req.body === 'string') {
        // Body is already a string (raw request)
        body = req.body;
        console.log(`[POST] body is string, length: ${body.length}`);
      } else if (req.body && typeof req.body === 'object') {
        // Body is an object (pre-parsed by Vercel)
        body = JSON.stringify(req.body);
        console.log(`[POST] body is object, stringified length: ${body.length}`);
      } else {
        // Body is undefined or other — read raw stream
        console.log(`[POST] body is undefined/other (${typeof req.body}), reading raw stream`);
        const chunks: Buffer[] = [];
        await new Promise<void>((resolve, reject) => {
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', () => resolve());
          req.on('error', reject);
        });
        body = Buffer.concat(chunks).toString('utf-8');
        console.log(`[POST] raw stream read, length: ${body.length}`);
      }

      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body,
        redirect: 'follow',
      });

      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      res.status(405).json({ ok: false, error: 'Method not allowed' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(502).json({
      ok: false,
      error: errorMessage,
    });
  }
}
