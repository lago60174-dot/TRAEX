// Cron dernier vendredi de l'année à 21:00
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RENDER_WEBHOOK_SECRET = Deno.env.get('RENDER_WEBHOOK_SECRET');
const BACKEND_URL = Deno.env.get('BACKEND_URL');

serve(async (req) => {
  const now = new Date();
  
  // Vérifier vendredi
  if (now.getDay() !== 5) return new Response('Not Friday', { status: 200 });
  
  // Vérifier dernier vendredi de l'année
  const lastDayOfYear = new Date(now.getFullYear(), 11, 31);
  const lastFriday = new Date(lastDayOfYear);
  lastFriday.setDate(lastDayOfYear.getDate() - ((lastDayOfYear.getDay() + 2) % 7));
  
  if (now.getDate() !== lastFriday.getDate() || now.getMonth() !== 11) {
    return new Response('Not last Friday of year', { status: 200 });
  }
  
  const response = await fetch(`${BACKEND_URL}/api/notifications/webhook/yearly-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': RENDER_WEBHOOK_SECRET!
    }
  });
  
  return new Response('OK', { status: 200 });
});