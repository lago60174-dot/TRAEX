import webpush from 'web-push';

export const VAPID_CONFIG = {
  publicKey: process.env.VAPID_PUBLIC_KEY!,
  privateKey: process.env.VAPID_PRIVATE_KEY!,
  subject: process.env.VAPID_SUBJECT || 'mailto:admin@votre-trading.com'
};

// Initialisation VAPID
export function initializeVAPID(): void {
  webpush.setVapidDetails(
    VAPID_CONFIG.subject,
    VAPID_CONFIG.publicKey,
    VAPID_CONFIG.privateKey
  );
}