import { supabase } from './supabase';
import { fromZonedTime } from 'date-fns-tz';

export interface DailySchedule {
  prayers: Array<{
    name: string;
    time_24h: string;
  }>;
}

/**
 * Mengonversi tanggal Indonesia "16 Feb 2026" menjadi "2026-02-16"
 */
export function parseIndonesianDate(dateStr: string): string {
  const months: Record<string, string> = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'Mei': '05', 'Jun': '06', 'Jul': '07', 'Agt': '08',
    'Sep': '09', 'Okt': '10', 'Nov': '11', 'Des': '12'
  };
  const [day, month, year] = dateStr.split(' ');
  return `${year}-${months[month]}-${day.padStart(2, '0')}`;
}

/**
 * Menghasilkan notifikasi untuk satu hari berdasarkan jadwal sholat
 * @param endpoint endpoint push subscription
 * @param provinceSlug slug provinsi
 * @param citySlug slug kota
 * @param schedule jadwal hari ini (today_schedule)
 * @param prayerTypes daftar sholat yang ingin diingatkan
 * @param advanceMinutes menit sebelum waktu sholat
 * @param dateStr tanggal lokal dalam format YYYY-MM-DD (contoh: 2026-02-16)
 */
export async function generateDailyNotifications(
  endpoint: string,
  provinceSlug: string,
  citySlug: string,
  schedule: DailySchedule,
  prayerTypes: string[],
  advanceMinutes: number,
  dateStr: string // YYYY-MM-DD lokal
): Promise<void> {
  const timeZone = 'Asia/Jakarta';
  const now = new Date();

  // Tentukan rentang hari lokal dalam UTC
  const startOfDay = fromZonedTime(`${dateStr}T00:00:00`, timeZone);
  const endOfDay = fromZonedTime(`${dateStr}T23:59:59`, timeZone);

  // Hapus notifikasi yang sudah ada untuk endpoint & lokasi yang sama pada hari ini
  await supabase
    .from('prayer_notifications')
    .delete()
    .eq('endpoint', endpoint)
    .eq('province_slug', provinceSlug)
    .eq('city_slug', citySlug)
    .gte('scheduled_for', startOfDay.toISOString())
    .lt('scheduled_for', endOfDay.toISOString());

  const notifications = [];

  for (const prayer of schedule.prayers) {
    const prayerName = prayer.name.toLowerCase();
    const matchingType = prayerTypes.find(pt => prayerName.includes(pt));
    if (!matchingType) continue;

    // Gabungkan tanggal lokal dengan waktu sholat
    const timeStr = `${dateStr}T${prayer.time_24h}:00`;
    // Konversi ke objek Date dalam UTC (waktu lokal diubah ke UTC)
    const prayerDate = fromZonedTime(timeStr, timeZone);
    // Hitung waktu notifikasi (mundur advanceMinutes)
    const scheduledFor = new Date(prayerDate.getTime() - advanceMinutes * 60 * 1000);

    // Lewati jika waktu notifikasi sudah lewat
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