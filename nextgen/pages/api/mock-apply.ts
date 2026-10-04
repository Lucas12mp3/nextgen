import type { NextApiRequest, NextApiResponse } from 'next';
import { sendApplication } from '@/services/applications';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = JSON.parse(req.body);
    // This API is a simple proxy for demo purposes — in production call Firestore directly from client or use server SDK with auth
    // Here we just acknowledge receipt
    console.log('Mock apply', body);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
}
