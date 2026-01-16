import { supabase } from './supabase';

export interface PrayerNotification {
  prayer: string;
  time: string;
  advanceMinutes: number;
}

export async function schedulePrayerNotifications(
  provinceSlug: string,
  citySlug: string,
  schedule: any
) {
  if (!schedule?.today_schedule?.prayers) return;

  // Get user notification preferences
  const { data: preferences } = await supabase
    .from('push_subscriptions')
    .select('prayer_types, advance_minutes')
    .eq('enabled', true)
    .single();

  const prayerTypes = preferences?.prayer_types || ['imsak', 'subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
  const advanceMinutes = preferences?.advance_minutes || 10;

  const notifications: PrayerNotification[] = [];

  schedule.today_schedule.prayers.forEach((prayer: any) => {
    if (prayerTypes.includes(prayer.name.toLowerCase())) {
      notifications.push({
        prayer: prayer.name,
        time: prayer.time_24h,
        advanceMinutes
      });
    }
  });

  // Store notifications in Supabase for background processing
  await supabase.from('prayer_notifications').upsert(
    notifications.map(notif => ({
      province_slug: provinceSlug,
      city_slug: citySlug,
      prayer_name: notif.prayer,
      prayer_time: notif.time,
      advance_minutes: notif.advanceMinutes,
      notified: false,
      scheduled_for: calculateNotificationTime(notif.time, notif.advanceMinutes)
    }))
  );

  return notifications;
}

function calculateNotificationTime(prayerTime: string, advanceMinutes: number): string {
  const [hours, minutes] = prayerTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes - advanceMinutes, 0, 0);
  return date.toISOString();
}

export function translateProvinceName(englishName: string): string {
  const translations: Record<string, string> = {
    'aceh': 'Aceh',
    'bali': 'Bali',
    'bangka-belitung-islands': 'Kepulauan Bangka Belitung',
    'banten': 'Banten',
    'bengkulu': 'Bengkulu',
    'central-java': 'Jawa Tengah',
    'central-kalimantan': 'Kalimantan Tengah',
    'central-sulawesi': 'Sulawesi Tengah',
    'dki-jakarta': 'DKI Jakarta',
    'east-java': 'Jawa Timur',
    'east-kalimantan': 'Kalimantan Timur',
    'east-nusa-tenggara': 'Nusa Tenggara Timur',
    'gorontalo': 'Gorontalo',
    'jakarta': 'Jakarta',
    'jambi': 'Jambi',
    'lampung': 'Lampung',
    'maluku': 'Maluku',
    'north-kalimantan': 'Kalimantan Utara',
    'north-maluku': 'Maluku Utara',
    'north-sulawesi': 'Sulawesi Utara',
    'north-sumatra': 'Sumatera Utara',
    'papua': 'Papua',
    'riau': 'Riau',
    'riau-islands': 'Kepulauan Riau',
    'south-kalimantan': 'Kalimantan Selatan',
    'south-sulawesi': 'Sulawesi Selatan',
    'south-sumatra': 'Sumatera Selatan',
    'southeast-sulawesi': 'Sulawesi Tenggara',
    'west-java': 'Jawa Barat',
    'west-kalimantan': 'Kalimantan Barat',
    'west-nusa-tenggara': 'Nusa Tenggara Barat',
    'west-papua': 'Papua Barat',
    'west-sulawesi': 'Sulawesi Barat',
    'west-sumatra': 'Sumatera Barat',
    'yogyakarta': 'Yogyakarta'
  };

  return translations[englishName.toLowerCase()] || englishName;
}