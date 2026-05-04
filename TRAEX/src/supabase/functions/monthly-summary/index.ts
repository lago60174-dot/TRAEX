// Cron dernier vendredi du mois à 21:00
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RENDER_WEBHOOK_SECRET = Deno.env.get('RENDER_WEBHOOK_SECRET');
const BACKEND_URL = Deno.env.get('BACKEND_URL');

serve(async (req) => {
  const now = new Date();
  
  // Vérifier vendredi
  if (now.getDay() !== 5) return new Response('Not Friday', { status: 200 });
  
  // Vérifier dernier vendredi du mois
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const lastFriday = new Date(lastDay);
  lastFriday.setDate(lastDay.getDate() - ((lastDay.getDay() + 2) % 7));
  
  if (now.getDate() !== lastFriday.getDate()) {
    return new Response('Not last Friday', { status: 200 });
  }
  
  const response = await fetch(`${BACKEND_URL}/api/notifications/webhook/monthly-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': RENDER_WEBHOOK_SECRET!
    }
  });
  
  return new Response('OK', { status: 200 });
});