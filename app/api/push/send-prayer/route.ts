import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import webPush from 'web-push';

webPush.setVapidDetails(
  'mailto:admin@quranku.devnova.icu',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('enabled', true);

    if (error) throw error;

    const results = [];
    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      };

      const payload = JSON.stringify({
        title: 'Pengingat Sholat',
        body: 'Waktu sholat akan segera tiba',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: { url: '/schedule', type: 'prayer_reminder' }
      });

      try {
        await webPush.sendNotification(pushSubscription, payload);
        results.push({ endpoint: sub.endpoint, status: 'success' });
      } catch (err: any) {
        if (err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          results.push({ endpoint: sub.endpoint, status: 'deleted' });
        } else {
          results.push({ endpoint: sub.endpoint, status: 'failed', error: err.message });
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error sending prayer notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}