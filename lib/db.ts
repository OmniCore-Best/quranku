import Dexie, { type EntityTable } from 'dexie';

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

class QuranDatabase extends Dexie {
  quranList!: Dexie.Table<QuranList, number>;
  surahDetail!: Dexie.Table<SurahDetail, number>;
  readingProgress!: Dexie.Table<ReadingProgress, number>;
  lastRead!: Dexie.Table<LastRead, number>;

  constructor() {
    super('QuranDatabase');
    
    this.version(3).stores({
      quranList: '++id, nomor, updatedAt',
      surahDetail: '++id, nomor, updatedAt',
      readingProgress: '++id, surahId, timestamp, [surahId+timestamp]',
      lastRead: '++id, surahId, timestamp'
    });
  }

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
  }

  async saveReadingProgress(surahId: number, surahName: string, ayatNumber: number) {
    await this.readingProgress.add({
      surahId,
      surahName,
      ayatNumber,
      timestamp: new Date(),
      completed: false
    });

    // Update last read
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
    // Get all progress for this surah and sort manually
    const allProgress = await this.readingProgress
      .where('surahId')
      .equals(surahId)
      .toArray();
    
    // Sort by timestamp descending (newest first)
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
}

export const db = new QuranDatabase();