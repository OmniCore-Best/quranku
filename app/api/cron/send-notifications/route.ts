import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import webPush from 'web-push';

webPush.setVapidDetails(
  'mailto:this.key@devnova.icu',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('prayer_notifications')
      .select(`
        id,
        endpoint,
        prayer_name,
        prayer_time,
        advance_minutes,
        push_subscriptions!inner (
          p256dh,
          auth
        )
      `)
      .eq('notified', false)
      .lte('scheduled_for', now)
      .limit(50);

    if (error) throw error;

    // Tipe data hasil query: push_subscriptions berupa array
    const notifications = data as {
      id: number;
      endpoint: string;
      prayer_name: string;
      prayer_time: string;
      advance_minutes: number;
      push_subscriptions: { p256dh: string; auth: string }[];
    }[];

    const results = [];

    for (const notif of notifications) {
      // Ambil subscription pertama (seharusnya hanya satu)
      const sub = notif.push_subscriptions[0];
      if (!sub) {
        console.warn(`No subscription found for notification ${notif.id}`);
        continue;
      }

      const pushSubscription = {
        endpoint: notif.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      };

      const payload = JSON.stringify({
        title: 'Pengingat Sholat',
        body: `Waktu ${notif.prayer_name} akan tiba dalam ${notif.advance_minutes} menit (${notif.prayer_time})`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: {
          url: '/schedule',
          type: 'prayer_reminder',
          prayer: notif.prayer_name,
          time: notif.prayer_time,
          advance: notif.advance_minutes
        }
      });

      try {
        await webPush.sendNotification(pushSubscription, payload);
        await supabase
          .from('prayer_notifications')
          .update({ notified: true })
          .eq('id', notif.id);
        results.push({ id: notif.id, status: 'sent' });
      } catch (err: any) {
        if (err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', notif.endpoint);
          results.push({ id: notif.id, status: 'deleted' });
        } else {
          results.push({ id: notif.id, status: 'failed', error: err.message });
        }
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}