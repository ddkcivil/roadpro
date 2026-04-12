import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function (req: VercelRequest, res: VercelResponse) {
  const envKeys = Object.keys(process.env);
  res.status(200).json({
    keys: envKeys,
    count: envKeys.length,
    nodeVersion: process.version,
    platform: process.platform
  });
}
