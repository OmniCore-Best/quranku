import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateDailyNotifications, parseIndonesianDate } from '@/lib/prayer-notifications';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Ambil semua subscription aktif yang memiliki lokasi
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('enabled', true)
      .not('province_slug', 'is', null)
      .not('city_slug', 'is', null);

    if (error) throw error;

    const results = [];

    for (const sub of subscriptions) {
      try {
        // Ambil jadwal sholat untuk lokasi ini
        const scheduleUrl = `https://api.devnova.icu/api/islamic/prayer-time?type=schedule&province=${sub.province_slug}&city=${sub.city_slug}`;
        const res = await fetch(scheduleUrl, {
          headers: { 'Cache-Control': 'no-cache' }
        });

        if (!res.ok) {
          results.push({ endpoint: sub.endpoint, status: 'failed', error: `HTTP ${res.status}` });
          continue;
        }

        const data = await res.json();
        if (!data.success || !data.data?.today_schedule || !data.data?.city) {
          results.push({ endpoint: sub.endpoint, status: 'failed', error: 'Invalid API response' });
          continue;
        }

        const schedule = data.data.today_schedule;
        const city = data.data.city;

        // Konversi tanggal Indonesia ke format YYYY-MM-DD
        const dateStr = parseIndonesianDate(city.date_today);

        // Parse prayer_types jika disimpan sebagai string JSON
        let prayerTypes = sub.prayer_types;
        if (typeof prayerTypes === 'string') {
          try {
            prayerTypes = JSON.parse(prayerTypes);
          } catch {
            prayerTypes = ['imsak', 'subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
          }
        }

        await generateDailyNotifications(
          sub.endpoint,
          sub.province_slug,
          sub.city_slug,
          schedule,
          prayerTypes,
          sub.advance_minutes || 10,
          dateStr
        );

        results.push({ endpoint: sub.endpoint, status: 'generated' });
      } catch (err: any) {
        results.push({ endpoint: sub.endpoint, status: 'failed', error: err.message });
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error) {
    console.error('Daily generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}