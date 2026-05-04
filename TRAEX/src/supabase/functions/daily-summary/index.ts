// Cron quotidien à 23:59
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RENDER_WEBHOOK_SECRET = Deno.env.get('RENDER_WEBHOOK_SECRET');
const BACKEND_URL = Deno.env.get('BACKEND_URL');

serve(async (req) => {
  const response = await fetch(`${BACKEND_URL}/api/notifications/webhook/daily-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': RENDER_WEBHOOK_SECRET!
    }
  });
  
  return new Response('OK', { status: 200 });
});