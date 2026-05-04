'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  FaUser, FaTrash, FaPaperPlane, FaSpinner, FaWifi, FaPlus,
  FaExclamationTriangle, FaArrowLeft, FaSearch, FaCommentDots,
  FaExternalLinkAlt, FaShareAlt, FaRobot, FaGlobe
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toPng } from 'html-to-image';
import { sendMessageWithFallback, OpenRouterMessage } from '@/lib/ai';

// ----------------------------------------------------------------------
// Type Definitions
// ----------------------------------------------------------------------
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: 'airo_hunter' | 'devnova_id';
}

interface SearchResult {
  tipe: 'surat' | 'ayat' | 'tafsir' | 'doa';
  skor: number;
  relevansi: 'tinggi' | 'sedang' | 'rendah';
  data: any;
}

// ----------------------------------------------------------------------
// System Prompt untuk AI Chat
// ----------------------------------------------------------------------
const QURANKU_SYSTEM_PROMPT = `Anda adalah asisten AI cerdas yang bernama Quranku AI yang di buat oleh this key dari tim pengembang DevNova-ID untuk aplikasi quranku (https://quranku.devnova.icu).  
Anda memiliki akses penuh ke semua fitur aplikasi. Tugas Anda membantu pengguna dengan informasi akurat.

## FITUR APLIKASI
1. Al-Qur'an 114 surah + tafsir + audio - tautan: /surah/[nomor]?ayat=[nomor]
2. Doa harian - tautan: /prayer
3. Tajwid (7 kategori) - tautan: /tajwid?category=[nama]
4. Hadis (Bukhari, Muslim, Abu Dawud, Tirmidzi, Nasai, Ibnu Majah, Ahmad, Malik, Darimi) - tautan: /hadist/[nama-kitab]?number=[nomor]
5. Jadwal sholat - tautan: /schedule
6. Kalkulator zakat - tautan: /kalkulator-zakat

## CARA MERESPON
- Jika pengguna meminta ayat atau hadis tentang topik tertentu, berikan konten yang relevan (jika tersedia), lalu tawarkan konfirmasi dengan tautan format: "Apakah Anda ingin membuka [nama surat] ayat [nomor]? [Ya](/surah/[nomor]?ayat=[nomor])"
- Gunakan markdown untuk tautan internal: [Teks tautan](/path)
- Jangan gunakan target="_blank" atau atribut eksternal.
- Jika pengguna bertanya di luar topik, arahkan kembali ke fitur aplikasi.
- Sertakan disclaimer di akhir respons jika perlu.

Contoh respons untuk "carikan ayat tentang cinta":
> QS. Ar-Rum ayat 21: "Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan hidup dari jenismu sendiri, supaya kamu cenderung dan merasa tenteram kepadanya, dan dijadikan-Nya di antaramu rasa kasih dan sayang..."
> 
> Apakah Anda ingin membuka surat Ar-Rum ayat 21? [Ya](/surah/30?ayat=21)

Contoh untuk hadis:
> Hadis riwayat Bukhari No. 13: "Tidak sempurna iman seseorang di antara kalian hingga ia mencintai saudaranya seperti ia mencintai dirinya sendiri."
>
> Apakah Anda ingin membuka hadis ini? [Ya](/hadist/bukhari?number=13)

Selalu berikan tautan internal. Jangan pernah memberikan konten palsu.`;

// ----------------------------------------------------------------------
// Komponen untuk merender Markdown dengan navigasi internal
// ----------------------------------------------------------------------
const MarkdownContent = ({ content, onNavigate }: { content: string; onNavigate: (href: string) => void }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full border-collapse border border-gray-200 text-sm">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => <th className="border border-gray-200 px-2 py-1 bg-gray-50 text-left">{children}</th>,
        td: ({ children }) => <td className="border border-gray-200 px-2 py-1">{children}</td>,
        code: ({ className, children, ...props }: any) => {
          const isInline = !className;
          if (isInline) {
            return <code className="bg-gray-100 px-1 rounded text-xs font-mono" {...props}>{children}</code>;
          }
          return (
            <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-xs">
              <code className={className} {...props}>{children}</code>
            </pre>
          );
        },
        a: ({ href, children }) => {
          if (!href) return <span>{children}</span>;
          const handleClick = (e: React.MouseEvent) => {
            e.preventDefault();
            onNavigate(href);
          };
          return (
            <a
              href={href}
              onClick={handleClick}
              className="text-emerald-600 font-medium underline decoration-emerald-300 hover:decoration-emerald-600 transition"
            >
              {children}
            </a>
          );
        },
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

// ----------------------------------------------------------------------
// Komponen Utama
// ----------------------------------------------------------------------
export default function QurankuAIPage() {
  const router = useRouter();

  // State untuk Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'online' | 'fallback' | 'offline'>('online');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const STORAGE_KEY = 'quranku_ai_chat_history';

  // Mode: true = semantic search aktif (tombol utama biru muda), false = chat (tombol abu-abu)
  const [isVectorMode, setIsVectorMode] = useState(false);

  // State untuk input (satu input untuk kedua mode)
  const [inputValue, setInputValue] = useState('');

  // State untuk Semantic Search
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);

  // ----------------------------------------------------------------------
  // Chat Logic
  // ----------------------------------------------------------------------
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const withDates = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(withDates);
      } catch (e) {
        console.error('Gagal memuat riwayat chat', e);
        setMessages([getWelcomeMessage()]);
      }
    } else {
      setMessages([getWelcomeMessage()]);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0 && !isVectorMode) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, isVectorMode]);

  const getWelcomeMessage = (): ChatMessage => ({
    id: 'welcome',
    role: 'assistant',
    content:
      'Halo! Saya asisten cerdas quranku. Saya bisa membantu Anda mencari:\n\n' +
      '- Ayat atau tafsir Al-Qur\'an\n- Hadis dari 9 kitab utama\n- Doa harian\n- Hukum tajwid\n- Jadwal sholat dan kalkulator zakat\n\n' +
      'Cukup tanyakan saja. Contoh: "Cari hadis tentang keutamaan belajar" atau "Tafsir surat Al-Fatihah ayat 1"',
    timestamp: new Date(),
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, [isVectorMode]);

  useEffect(() => {
    if (!isVectorMode) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isVectorMode]);

  const clearChat = () => {
    setMessages([getWelcomeMessage()]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const startNewChat = () => {
    setMessages([getWelcomeMessage()]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleNavigate = (href: string) => router.push(href);

  const sendChatMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue('');
    setIsLoading(true);

    const apiMessages: OpenRouterMessage[] = [
      { role: 'system', content: QURANKU_SYSTEM_PROMPT },
      ...messages.map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: currentInput },
    ];

    try {
      const result = await sendMessageWithFallback(apiMessages, true);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.content,
        timestamp: new Date(),
        provider: result.provider,
      }]);
      setStatus(result.status);
    } catch (error) {
      console.error('Error saat memanggil AI:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Maaf, layanan AI sedang sibuk. Silakan coba lagi nanti.',
        timestamp: new Date(),
      }]);
      setStatus('offline');
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // Semantic Search Logic
  // ----------------------------------------------------------------------
  const performSemanticSearch = async () => {
    if (!inputValue.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const response = await fetch('https://equran.id/api/vector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: inputValue.trim(),
          limit: 10,
          types: ['ayat', 'tafsir', 'doa'],
          minScore: 0.4,
        }),
      });
      const data = await response.json();
      if (data.status === 'sukses') {
        setSearchResults(data.hasil || []);
      } else {
        throw new Error('Respons API tidak valid');
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Gagal mencari');
    } finally {
      setSearchLoading(false);
    }
  };

  // Fungsi untuk capture elemen dengan watermark
  const captureElementWithWatermark = async (element: HTMLElement): Promise<string> => {
    // Clone node untuk menghindari modifikasi DOM asli
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.position = 'relative';
    clone.style.backgroundColor = 'white'; 
    clone.style.borderRadius = '16px';
    clone.style.padding = '1rem';

    // Buat elemen watermark
    const watermark = document.createElement('div');
    watermark.textContent = '— generated by Quranku AI';
    watermark.style.position = 'absolute';
    watermark.style.bottom = '12px';
    watermark.style.right = '16px';
    watermark.style.fontSize = '10px';
    watermark.style.color = '#9ca3af';
    watermark.style.backgroundColor = 'rgba(255,255,255,0.8)';
    watermark.style.padding = '2px 8px';
    watermark.style.borderRadius = '20px';
    watermark.style.fontFamily = 'system-ui, sans-serif';
    watermark.style.fontWeight = 'normal';
    watermark.style.zIndex = '20';
    watermark.style.pointerEvents = 'none';
    watermark.style.backdropFilter = 'blur(2px)';
    clone.appendChild(watermark);

    // Capture clone
    const dataUrl = await toPng(clone, { quality: 0.95, pixelRatio: 2 });
    return dataUrl;
  };

  // Membagikan hasil pencarian sebagai gambar PNG dengan watermark
  const handleShareResult = async (elementId: string, title: string) => {
    const originalElement = document.getElementById(elementId);
    if (!originalElement) return;
    setSharingId(elementId);
    try {
      const dataUrl = await captureElementWithWatermark(originalElement);
      if (navigator.share) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `quranku_${title.replace(/\s/g, '_')}.png`, { type: 'image/png' });
        await navigator.share({ files: [file], title: 'Quranku - Hasil Pencarian', text: title });
      } else {
        const link = document.createElement('a');
        link.download = `quranku_${title.replace(/\s/g, '_')}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error('Gagal share:', error);
    } finally {
      setSharingId(null);
    }
  };

  // Render kartu hasil pencarian semantik
  const renderSearchResult = (result: SearchResult, idx: number) => {
    const { tipe, skor, relevansi, data } = result;
    const scorePercent = Math.round(skor * 100);
    const relevansiColor =
      relevansi === 'tinggi' ? 'bg-emerald-100 text-emerald-800' :
      relevansi === 'sedang' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600';
    const uniqueId = `${tipe}-${data.id_surat || data.nomor_ayat || idx}-${idx}`;
    const shareTitle = `${data.nama_surat || 'Hasil'} - ${tipe === 'ayat' ? `Ayat ${data.nomor_ayat}` : tipe}`;

    if (tipe === 'ayat') {
      return (
        <motion.div
          id={uniqueId}
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.05 }}
          className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 p-5 hover:border-emerald-300 hover:shadow-lg transition-all"
        >
          <button
            onClick={() => handleShareResult(uniqueId, shareTitle)}
            disabled={sharingId === uniqueId}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm disabled:opacity-50 z-10"
            title="Bagikan sebagai gambar"
          >
            {sharingId === uniqueId ? <FaSpinner className="animate-spin w-4 h-4" /> : <FaShareAlt className="w-4 h-4 text-gray-500 hover:text-emerald-600" />}
          </button>
          <div className="flex justify-between items-start mb-3 pr-8">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">Ayat</span>
              <span className="text-sm font-semibold text-gray-800">{data.nama_surat} · {data.nomor_ayat}</span>
            </div>
            <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${relevansiColor}`}>
              {relevansi} · {scorePercent}%
            </div>
          </div>
          <div className="text-right font-arabic text-xl leading-loose mb-3 text-gray-800">{data.teks_arab}</div>
          <div className="text-sm text-gray-600 italic mb-2">{data.teks_latin}</div>
          <div className="text-sm text-gray-700 border-l-3 border-emerald-400 pl-3">{data.terjemahan_id}</div>
          <button
            onClick={() => router.push(`/surah/${data.id_surat}?ayat=${data.nomor_ayat}`)}
            className="mt-4 text-sm text-emerald-600 hover:text-emerald-800 flex items-center gap-1 font-medium"
          >
            Baca lengkap <FaExternalLinkAlt className="w-3 h-3" />
          </button>
        </motion.div>
      );
    }
    if (tipe === 'tafsir') {
      return (
        <motion.div
          id={uniqueId}
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 p-5 hover:border-emerald-300 transition-all"
        >
          <button
            onClick={() => handleShareResult(uniqueId, shareTitle)}
            disabled={sharingId === uniqueId}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm disabled:opacity-50"
          >
            {sharingId === uniqueId ? <FaSpinner className="animate-spin w-4 h-4" /> : <FaShareAlt className="w-4 h-4 text-gray-500 hover:text-emerald-600" />}
          </button>
          <div className="flex justify-between items-start mb-2 pr-8">
            <div className="flex gap-2">
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">Tafsir</span>
              <span className="text-sm font-medium">{data.nama_surat} ayat {data.nomor_ayat}</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${relevansiColor}`}>{relevansi} · {scorePercent}%</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-4">{data.isi}</p>
          <button
            onClick={() => router.push(`/surah/${data.id_surat}?ayat=${data.nomor_ayat}`)}
            className="mt-3 text-xs text-emerald-600 hover:underline"
          >
            Lihat Ayat
          </button>
        </motion.div>
      );
    }
    if (tipe === 'doa') {
      return (
        <motion.div
          id={uniqueId}
          key={idx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 p-4 hover:border-emerald-300 transition-all"
        >
          <button
            onClick={() => handleShareResult(uniqueId, shareTitle)}
            disabled={sharingId === uniqueId}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-white shadow-sm"
          >
            {sharingId === uniqueId ? <FaSpinner className="animate-spin w-3 h-3" /> : <FaShareAlt className="w-3 h-3 text-gray-500 hover:text-emerald-600" />}
          </button>
          <div className="pr-6">
            <span className="font-bold text-sm">{data.nama_doa || 'Doa'}</span>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${relevansiColor}`}>{relevansi}</span>
          </div>
          <div className="text-right font-arabic text-lg mt-2">{data.teks_arab}</div>
          <p className="text-sm text-gray-600 mt-2">{data.terjemahan}</p>
        </motion.div>
      );
    }
    return null;
  };

  // ----------------------------------------------------------------------
  // Submit berdasarkan mode
  // ----------------------------------------------------------------------
  const handleSubmit = () => {
    if (isVectorMode) {
      performSemanticSearch();
    } else {
      sendChatMessage();
    }
  };

  // ----------------------------------------------------------------------
  // Render Utama
  // ----------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      <div className="max-w-5xl mx-auto px-4 py-6 pb-28">
        {/* Header dengan navigasi kembali */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <Link href="/" className="group flex items-center gap-2 text-gray-600 hover:text-emerald-700 transition">
            <FaArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
            <span className="text-sm font-medium">Kembali</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm">
              <Image src="/icons/icon-512x512.png" alt="Quranku AI" width={28} height={28} className="rounded-full" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent">Quranku AI</h1>
            {!isVectorMode && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                status === 'online' ? 'bg-green-100 text-green-700' :
                status === 'fallback' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {status === 'online' ? 'Online' : status === 'fallback' ? 'Backup' : 'Offline'}
              </span>
            )}
          </div>
        </div>

        {/* Area Konten Dinamis: Chat Messages atau Hasil Semantic Search */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm min-h-[400px] max-h-[60vh] overflow-y-auto p-4 mb-4">
          {!isVectorMode ? (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <FaRobot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <MarkdownContent content={msg.content} onNavigate={handleNavigate} />
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
                    <div className="text-right text-[9px] opacity-60 mt-1">
                      {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                      <FaUser className="w-4 h-4 text-gray-600" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                    <FaSpinner className="animate-spin text-white w-4 h-4" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-2 text-sm text-gray-500 shadow-sm">
                    AI sedang mengetik...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div>
              {searchLoading && (
                <div className="text-center py-10">
                  <FaSpinner className="animate-spin w-8 h-8 text-emerald-500 mx-auto mb-3" />
                  <p className="text-gray-500">Menganalisis makna dari pertanyaan Anda...</p>
                </div>
              )}
              {searchError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                  <FaExclamationTriangle className="inline mr-2" /> {searchError}
                </div>
              )}
              {!searchLoading && searchResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {searchResults.map((res, i) => renderSearchResult(res, i))}
                </div>
              )}
              {!searchLoading && inputValue && searchResults.length === 0 && !searchError && (
                <div className="text-center py-10 text-gray-500">
                  <FaSearch className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p>Tidak ada hasil untuk "{inputValue}"</p>
                  <p className="text-xs mt-1">Coba gunakan kata kunci yang berbeda.</p>
                </div>
              )}
              {!inputValue && !searchLoading && !searchError && (
                <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                  <FaSearch className="w-8 h-8 mx-auto mb-2" />
                  <p>Cari ayat, tafsir, atau doa dengan bahasa natural</p>
                  <p className="text-xs mt-1">Contoh: "ayat tentang kesabaran dalam menghadapi cobaan"</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area dengan Tombol Globe (toggle mode) dan Tombol Utama (Kirim/Cari) */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm p-3">
          <div className="flex gap-2">
            {/* Tombol Globe untuk toggle mode */}
            <button
              onClick={() => setIsVectorMode(!isVectorMode)}
              className={`p-3 rounded-xl transition-all shadow-sm ${
                isVectorMode
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
              title={isVectorMode ? "Nonaktifkan pencarian vektor (kembali ke chat)" : "Aktifkan pencarian vektor (cari ayat/tafsir/doa)"}
            >
              <FaGlobe className="w-5 h-5" />
            </button>

            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
              placeholder={
                isVectorMode
                  ? "Cari ayat/tafsir/doa dengan bahasa natural (contoh: 'ayat tentang kasih sayang')"
                  : "Tanyakan tentang Al-Quran, hadis, doa, tajwid, jadwal sholat, atau zakat..."
              }
              rows={2}
              className="flex-1 px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none bg-white"
              disabled={(!isVectorMode && isLoading) || (isVectorMode && searchLoading)}
            />

            <button
              onClick={handleSubmit}
              disabled={
                (isVectorMode && (!inputValue.trim() || searchLoading)) ||
                (!isVectorMode && (!inputValue.trim() || isLoading))
              }
              className={`p-3 rounded-xl transition-all shadow-sm ${
                isVectorMode
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              } disabled:opacity-40`}
              title={isVectorMode ? "Cari dengan kecerdasan semantik" : "Kirim pesan ke AI"}
            >
              {isVectorMode ? <FaSearch className="w-5 h-5" /> : <FaPaperPlane className="w-5 h-5" />}
            </button>
          </div>

          {!isVectorMode && (
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={startNewChat} className="text-xs text-gray-500 hover:text-emerald-600 flex items-center gap-1 transition">
                <FaPlus className="w-3 h-3" /> Percakapan Baru
              </button>
              <button onClick={clearChat} className="text-xs text-gray-500 hover:text-emerald-600 flex items-center gap-1 transition">
                <FaTrash className="w-3 h-3" /> Hapus Semua
              </button>
            </div>
          )}

          <p className="text-center text-[11px] text-gray-400 mt-2">
            {isVectorMode
              ? 'Enter untuk mencari • Hasil berdasarkan makna (semantik)'
              : 'Enter kirim pesan, Shift+Enter untuk baris baru'}
          </p>
        </div>
      </div>
    </div>
  );
}