import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quranku.devnova.icu'
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/schedule`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/tajwid`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/prayer`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/hadist`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]

  // Generate all 114 surah pages
  const surahPages: MetadataRoute.Sitemap = Array.from({ length: 114 }, (_, i) => ({
    url: `${baseUrl}/surah/${i + 1}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.9,
  }))

  // Fetch hadith books and generate pages
  let hadithPages: MetadataRoute.Sitemap = []
  try {
    const res = await fetch('https://api.hadith.gading.dev/books', {
      next: { revalidate: 86400 } // revalidate setiap 24 jam
    })
    const data = await res.json()
    if (data.code === 200 && Array.isArray(data.data)) {
      hadithPages = data.data.map((book: any) => ({
        url: `${baseUrl}/hadist/${book.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      }))
    }
  } catch (error) {
    console.error('Failed to fetch hadith books for sitemap:', error)
    // Fallback: gunakan daftar statis jika API gagal
    const fallbackBooks = [
      'abu-daud', 'ahmad', 'bukhari', 'darimi', 'ibnu-majah',
      'malik', 'muslim', 'nasai', 'tirmidzi'
    ]
    hadithPages = fallbackBooks.map(id => ({
      url: `${baseUrl}/hadist/${id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }))
  }

  return [...staticPages, ...surahPages, ...hadithPages]
}