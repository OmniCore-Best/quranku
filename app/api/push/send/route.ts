import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import webPush from 'web-push';

// Konfigurasi VAPID
webPush.setVapidDetails(
  'mailto:this.key@devnova.icu',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { title, body, url, data } = await request.json();

    // Ambil semua subscription aktif
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
        title: title || 'quranku',
        body: body || 'Ada notifikasi baru',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: data || { url: url || '/' }
      });

      try {
        await webPush.sendNotification(pushSubscription, payload);
        results.push({ endpoint: sub.endpoint, status: 'success' });
      } catch (err: any) {
        // Jika subscription expired (410), hapus dari database
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
    console.error('Error sending push:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}