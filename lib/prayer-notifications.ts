import { supabase } from './supabase';

export interface PrayerNotificationData {
  prayer_name: string;
  prayer_time: string;
  advance_minutes: number;
}

export interface DailySchedule {
  prayers: Array<{
    name: string;
    time_24h: string;
  }>;
}

/**
 * Menghasilkan notifikasi untuk satu hari berdasarkan jadwal sholat
 */
export async function generateDailyNotifications(
  endpoint: string,
  provinceSlug: string,
  citySlug: string,
  schedule: DailySchedule,
  prayerTypes: string[],
  advanceMinutes: number
): Promise<void> {
  const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const now = new Date();

  // Hapus notifikasi yang sudah ada untuk hari ini (jika pernah dibuat)
  await supabase
    .from('prayer_notifications')
    .delete()
    .eq('endpoint', endpoint)
    .eq('province_slug', provinceSlug)
    .eq('city_slug', citySlug)
    .gte('scheduled_for', `${todayStr}T00:00:00`)
    .lt('scheduled_for', `${todayStr}T23:59:59`);

  const notifications = [];

  for (const prayer of schedule.prayers) {
    const prayerName = prayer.name.toLowerCase();
    // Cocokkan dengan prayerTypes (case insensitive)
    const matchingType = prayerTypes.find(pt => prayerName.includes(pt));
    if (!matchingType) continue;

    const [hours, minutes] = prayer.time_24h.split(':').map(Number);
    const prayerDate = new Date();
    prayerDate.setHours(hours, minutes, 0, 0);

    const scheduledFor = new Date(prayerDate.getTime() - advanceMinutes * 60 * 1000);

    // Jika waktu notifikasi sudah lewat hari ini, skip
    if (scheduledFor <= now) continue;

    notifications.push({
      endpoint,
      province_slug: provinceSlug,
      city_slug: citySlug,
      prayer_name: prayer.name, // simpan nama asli dari API
      prayer_time: prayer.time_24h,
      advance_minutes: advanceMinutes,
      scheduled_for: scheduledFor.toISOString(),
      notified: false,
    });
  }

  if (notifications.length > 0) {
    const { error } = await supabase.from('prayer_notifications').insert(notifications);
    if (error) {
      console.error('Error inserting notifications:', error);
      throw error;
    }
  }
}