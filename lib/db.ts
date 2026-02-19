import Dexie from 'dexie';

export interface QuranList {
  id: number;
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  tempatTurun: string;
  arti: string;
  deskripsi: string;
  audioFull: Record<string, string>;
  updatedAt: Date;
}

export interface SurahDetail {
  id: number;
  nomor: number;
  nama: string;
  namaLatin: string;
  jumlahAyat: number;
  tempatTurun: string;
  arti: string;
  deskripsi: string;
  audioFull: Record<string, string>;
  ayat: Array<{
    nomorAyat: number;
    teksArab: string;
    teksLatin: string;
    teksIndonesia: string;
    audio: Record<string, string>;
  }>;
  suratSebelumnya?: {
    nomor: number;
    nama: string;
    namaLatin: string;
    jumlahAyat: number;
  };
  suratSelanjutnya?: {
    nomor: number;
    nama: string;
    namaLatin: string;
    jumlahAyat: number;
  } | boolean;
  updatedAt: Date;
}

export interface ReadingProgress {
  id?: number;
  surahId: number;
  surahName: string;
  ayatNumber: number;
  timestamp: Date;
  completed: boolean;
}

export interface LastRead {
  id?: number;
  surahId: number;
  surahName: string;
  ayatNumber: number;
  timestamp: Date;
}

export interface Tafsir {
  id?: number;
  surahId: number;
  ayat: number;
  teks: string;
  updatedAt: Date;
}

// === HADIS ===
export interface HadithBook {
  id?: number;
  bookId: string;        
  name: string;
  available: number;     
  updatedAt: Date;
}

export interface Hadith {
  id?: number;
  bookId: string;
  number: number;
  arab: string;
  translation: string;   
  updatedAt: Date;
}

class QuranDatabase extends Dexie {
  quranList!: Dexie.Table<QuranList, number>;
  surahDetail!: Dexie.Table<SurahDetail, number>;
  readingProgress!: Dexie.Table<ReadingProgress, number>;
  lastRead!: Dexie.Table<LastRead, number>;
  tafsir!: Dexie.Table<Tafsir, number>;
  hadithBooks!: Dexie.Table<HadithBook, number>;
  hadiths!: Dexie.Table<Hadith, number>;

  constructor() {
    super('QuranDatabase');
    
    // Upgrade ke versi 15 untuk menambahkan tabel hadis
    this.version(15).stores({
      quranList: '++id, nomor, updatedAt',
      surahDetail: '++id, nomor, updatedAt',
      readingProgress: '++id, surahId, timestamp, [surahId+timestamp]',
      lastRead: '++id, surahId, timestamp',
      tafsir: '++id, surahId, ayat, [surahId+ayat], updatedAt',
      hadithBooks: '++id, bookId, updatedAt',
      hadiths: '++id, bookId, number, [bookId+number], updatedAt'
    });
  }

  // Membersihkan data lama (lebih dari 3 hari)
  async clearOldData() {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    await this.quranList
      .where('updatedAt')
      .below(threeDaysAgo)
      .delete();
    
    await this.surahDetail
      .where('updatedAt')
      .below(threeDaysAgo)
      .delete();
    
    await this.tafsir
      .where('updatedAt')
      .below(threeDaysAgo)
      .delete();

    // Hapus data hadis lama
    await this.hadithBooks
      .where('updatedAt')
      .below(threeDaysAgo)
      .delete();

    await this.hadiths
      .where('updatedAt')
      .below(threeDaysAgo)
      .delete();
  }

  // ===== Progress Membaca Al-Qur'an =====
  async saveReadingProgress(surahId: number, surahName: string, ayatNumber: number) {
    await this.readingProgress.add({
      surahId,
      surahName,
      ayatNumber,
      timestamp: new Date(),
      completed: false
    });

    await this.lastRead.clear();
    await this.lastRead.add({
      surahId,
      surahName,
      ayatNumber,
      timestamp: new Date()
    });
  }

  async getLastRead() {
    return await this.lastRead.orderBy('timestamp').reverse().first();
  }

  async getReadingProgress(surahId: number) {
    const allProgress = await this.readingProgress
      .where('surahId')
      .equals(surahId)
      .toArray();
    
    return allProgress.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    )[0] || null;
  }

  async markAsCompleted(surahId: number) {
    const progress = await this.getReadingProgress(surahId);
    if (progress && progress.id) {
      await this.readingProgress.update(progress.id, { completed: true });
    }
  }

  async getAllReadingProgress() {
    return await this.readingProgress.toArray();
  }

  async getBookmarkedSurahs() {
    const progress = await this.getAllReadingProgress();
    return progress
      .filter(p => !p.completed)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // ===== Tafsir =====
  async saveTafsir(surahId: number, ayat: number, teks: string) {
    await this.tafsir.put({
      surahId,
      ayat,
      teks,
      updatedAt: new Date()
    });
  }

  async getTafsir(surahId: number, ayat?: number): Promise<Tafsir[]> {
    if (ayat !== undefined) {
      const tafsir = await this.tafsir
        .where('[surahId+ayat]')
        .equals([surahId, ayat])
        .first();
      return tafsir ? [tafsir] : [];
    } else {
      return await this.tafsir
        .where('surahId')
        .equals(surahId)
        .toArray();
    }
  }

  async getSingleTafsir(surahId: number, ayat: number): Promise<Tafsir | undefined> {
    return await this.tafsir
      .where('[surahId+ayat]')
      .equals([surahId, ayat])
      .first();
  }

  async getSurahCount() {
    return await this.quranList.count();
  }

  async getTotalDownloadedData() {
    const surahCount = await this.quranList.count();
    const detailCount = await this.surahDetail.count();
    const tafsirCount = await this.tafsir.count();
    
    return { surahCount, detailCount, tafsirCount };
  }

  async isAllDataDownloaded() {
    const surahCount = await this.quranList.count();
    return surahCount >= 114;
  }

  // ===== HADIS =====
  async saveHadithBook(bookId: string, name: string, available: number) {
    await this.hadithBooks.put({
      bookId,
      name,
      available,
      updatedAt: new Date()
    });
  }

  async getHadithBook(bookId: string): Promise<HadithBook | undefined> {
    return await this.hadithBooks.where('bookId').equals(bookId).first();
  }

  // ===== PERBAIKAN: Simpan hadis dengan menghapus data lama dalam rentang yang sama =====
  async saveHadiths(bookId: string, hadiths: { number: number; arab: string; id: string }[], start?: number, end?: number) {
    // Hapus data lama dalam rentang yang sama (jika ada)
    if (start !== undefined && end !== undefined) {
      await this.hadiths
        .where('[bookId+number]')
        .between([bookId, start], [bookId, end])
        .delete();
    } else {
      // Jika tidak ada rentang, hapus berdasarkan nomor yang ada (fallback)
      const numbers = hadiths.map(h => h.number);
      if (numbers.length > 0) {
        const min = Math.min(...numbers);
        const max = Math.max(...numbers);
        await this.hadiths
          .where('[bookId+number]')
          .between([bookId, min], [bookId, max])
          .delete();
      }
    }
    const toSave = hadiths.map(h => ({
      bookId,
      number: h.number,
      arab: h.arab,
      translation: h.id,
      updatedAt: new Date()
    }));
    await this.hadiths.bulkPut(toSave);
  }

  async getHadiths(bookId: string, page: number, itemsPerPage: number): Promise<Hadith[]> {
    const start = (page - 1) * itemsPerPage + 1;
    const end = page * itemsPerPage;
    return await this.hadiths
      .where('[bookId+number]')
      .between([bookId, start], [bookId, end])
      .toArray();
  }

  async getAllHadithBooks(): Promise<HadithBook[]> {
    return await this.hadithBooks.toArray();
  }
}

export const db = new QuranDatabase();