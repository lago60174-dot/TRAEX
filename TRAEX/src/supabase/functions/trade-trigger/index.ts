// Trigger appelé lors de l'insertion d'un nouveau trade
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RENDER_WEBHOOK_SECRET = Deno.env.get('RENDER_WEBHOOK_SECRET');
const BACKEND_URL = Deno.env.get('BACKEND_URL'); // https://votre-api.onrender.com

serve(async (req) => {
  const { record, table, type } = await req.json();
  
  if (table !== 'trades') return new Response('OK', { status: 200 });
  
  const endpoint = type === 'INSERT' 
    ? '/api/notifications/webhook/trade-opened'
    : '/api/notifications/webhook/trade-closed';
  
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': RENDER_WEBHOOK_SECRET!
    },
    body: JSON.stringify({ tradeId: record.id })
  });
  
  return new Response('OK', { status: 200 });
});