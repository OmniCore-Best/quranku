import { supabase } from './supabase';
import { fromZonedTime } from 'date-fns-tz';

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
  const timeZone = 'Asia/Jakarta';

  // Hapus notifikasi yang sudah ada untuk hari ini
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
    const matchingType = prayerTypes.find(pt => prayerName.includes(pt));
    if (!matchingType) continue;

    // Buat string tanggal dalam format "YYYY-MM-DDTHH:mm:ss" (waktu lokal WIB)
    const [hours, minutes] = prayer.time_24h.split(':').map(Number);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timeStr = `${year}-${month}-${day}T${prayer.time_24h}:00`;

    // Konversi dari waktu WIB ke UTC
    const prayerDate = fromZonedTime(timeStr, timeZone);

    // Hitung waktu notifikasi (advance minutes sebelumnya)
    const scheduledFor = new Date(prayerDate.getTime() - advanceMinutes * 60 * 1000);

    // Jika waktu notifikasi sudah lewat, skip
    if (scheduledFor <= now) continue;

    notifications.push({
      endpoint,
      province_slug: provinceSlug,
      city_slug: citySlug,
      prayer_name: prayer.name,
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