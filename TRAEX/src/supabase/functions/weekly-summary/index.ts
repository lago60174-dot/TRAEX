// Cron vendredi à 21:00 (fermeture marchés FX)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RENDER_WEBHOOK_SECRET = Deno.env.get('RENDER_WEBHOOK_SECRET');
const BACKEND_URL = Deno.env.get('BACKEND_URL');

serve(async (req) => {
  // Vérifier que c'est vendredi
  const now = new Date();
  if (now.getDay() !== 5) return new Response('Not Friday', { status: 200 });
  
  const response = await fetch(`${BACKEND_URL}/api/notifications/webhook/weekly-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': RENDER_WEBHOOK_SECRET!
    }
  });
  
  return new Response('OK', { status: 200 });
});