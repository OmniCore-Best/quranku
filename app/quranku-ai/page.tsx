'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaBars, FaPlus, FaPaperPlane, FaSpinner, FaWifi,
  FaExclamationTriangle, FaSearch, FaExternalLinkAlt,
  FaShareAlt, FaRobot, FaMicrophone, FaUser } from 'react-icons/fa';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toPng } from 'html-to-image';
import { sendMessageWithFallback, OpenRouterMessage } from '@/lib/ai';

// ============================================================================
// TIPE DATA
// ============================================================================
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

// ============================================================================
// SYSTEM PROMPT UNTUK AI CHAT (salin dari file asli Anda)
// ============================================================================
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

// ============================================================================
// KOMPONEN MARKDOWN DENGAN NAVIGASI INTERNAL
// ============================================================================
const MarkdownContent = ({ content, onNavigate }: { content: string; onNavigate: (href: string) => void }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
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
              className="text-blue-600 underline font-medium hover:text-blue-800"
            >
              {children}
            </a>
          );
        },
        p: ({ children }) => <p className="mb-2 last:mb-0 text-sm leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

// ============================================================================
// KOMPONEN UTAMA
// ============================================================================
export default function QurankuAIPage() {
  const router = useRouter();

  // State Chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'online' | 'fallback' | 'offline'>('online');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const STORAGE_KEY = 'quranku_ai_chat_history';

  // Mode: 'chat' atau 'semantic'
  const [mode, setMode] = useState<'chat' | 'semantic'>('chat');

  // State Semantic Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [searchLimit] = useState(5);
  const [searchTypes] = useState<string[]>(['ayat', 'tafsir', 'doa']);
  const [searchMinScore] = useState(0.4);

  // ==========================================================================
  // CHAT LOGIC
  // ==========================================================================
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
    if (messages.length > 0 && mode === 'chat') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, mode]);

  const getWelcomeMessage = (): ChatMessage => ({
    id: 'welcome',
    role: 'assistant',
    content:
      'Halo! Saya asisten cerdas Quranku. Saya bisa membantu Anda:\n\n• Mencari ayat/tafsir Al-Qur\'an\n• Menjawab pertanyaan Islam\n• Menampilkan hadis, doa, jadwal sholat, dan kalkulator zakat\n\nCoba tanyakan: "Cari ayat tentang kesabaran" atau "Hadis tentang keutamaan ilmu"',
    timestamp: new Date(),
  });

  // Fokus input saat mode berubah
  useEffect(() => {
    if (mode === 'chat') {
      inputRef.current?.focus();
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else {
      inputRef.current?.focus();
    }
  }, [mode]);

  // Fungsi chat
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
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    const apiMessages: OpenRouterMessage[] = [
      { role: 'system', content: QURANKU_SYSTEM_PROMPT },
      ...messages.map(m => ({ role: m.role, content: m.content })),
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
      console.error('Error AI:', error);
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

  // ==========================================================================
  // SEMANTIC SEARCH LOGIC (parameter API benar)
  // ==========================================================================
  const performSemanticSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const response = await fetch('https://equran.id/api/vector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cari: searchQuery.trim(),
          batas: searchLimit,
          tipe: searchTypes,
          skorMin: searchMinScore,
        }),
      });
      const data = await response.json();
      if (data.status === 'sukses') {
        setSearchResults(data.hasil || []);
      } else {
        throw new Error(data.pesan || 'Gagal mencari');
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setSearchLoading(false);
    }
  };

  // ==========================================================================
  // SHARE PNG DENGAN WATERMARK
  // ==========================================================================
  const captureWithWatermark = async (element: HTMLElement): Promise<string> => {
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.position = 'relative';
    clone.style.backgroundColor = '#ffffff';
    clone.style.borderRadius = '16px';
    clone.style.padding = '16px';
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
    watermark.style.fontFamily = 'system-ui';
    watermark.style.pointerEvents = 'none';
    clone.appendChild(watermark);
    return await toPng(clone, { quality: 0.95, pixelRatio: 2 });
  };

  const handleShareResult = async (elementId: string, title: string) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    setSharingId(elementId);
    try {
      const dataUrl = await captureWithWatermark(el);
      if (navigator.share) {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `quranku_${title.replace(/\s/g, '_')}.png`, { type: 'image/png' });
        await navigator.share({ files: [file], title: 'Quranku - Hasil Pencarian' });
      } else {
        const link = document.createElement('a');
        link.download = `quranku_${title.replace(/\s/g, '_')}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSharingId(null);
    }
  };

  // ==========================================================================
  // RENDER KARTU HASIL SEMANTIC
  // ==========================================================================
  const renderSearchResultCard = (result: SearchResult, idx: number) => {
    const { tipe, skor, relevansi, data } = result;
    const scorePercent = Math.round(skor * 100);
    const relevansiColor =
      relevansi === 'tinggi' ? 'bg-emerald-100 text-emerald-800' :
      relevansi === 'sedang' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600';
    const uniqueId = `${tipe}-${data.id_surat || data.nomor_ayat || idx}-${idx}`;
    const shareTitle = `${data.nama_surat || 'Hasil'} - ${tipe === 'ayat' ? `Ayat ${data.nomor_ayat}` : tipe}`;

    if (tipe === 'ayat') {
      return (
        <div id={uniqueId} key={idx} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 relative">
          <button
            onClick={() => handleShareResult(uniqueId, shareTitle)}
            disabled={sharingId === uniqueId}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition disabled:opacity-50"
          >
            {sharingId === uniqueId ? <FaSpinner className="animate-spin w-4 h-4" /> : <FaShareAlt className="w-4 h-4 text-gray-600" />}
          </button>
          <div className="flex items-center gap-2 mb-2 pr-10">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">Ayat</span>
            <span className="text-sm font-semibold">{data.nama_surat} · {data.nomor_ayat}</span>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${relevansiColor}`}>{relevansi} · {scorePercent}%</span>
          </div>
          <div className="text-right font-arabic text-xl leading-loose mb-2">{data.teks_arab}</div>
          <div className="text-sm text-gray-600 italic mb-2">{data.teks_latin}</div>
          <div className="text-sm text-gray-700 border-l-2 border-blue-400 pl-3">{data.terjemahan_id}</div>
          <button
            onClick={() => router.push(`/surah/${data.id_surat}?ayat=${data.nomor_ayat}`)}
            className="mt-3 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Baca lengkap <FaExternalLinkAlt className="w-3 h-3" />
          </button>
        </div>
      );
    }
    if (tipe === 'tafsir') {
      return (
        <div id={uniqueId} key={idx} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 relative">
          <button
            onClick={() => handleShareResult(uniqueId, shareTitle)}
            disabled={sharingId === uniqueId}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
          >
            {sharingId === uniqueId ? <FaSpinner className="animate-spin w-4 h-4" /> : <FaShareAlt className="w-4 h-4 text-gray-600" />}
          </button>
          <div className="flex items-center gap-2 mb-2 pr-10">
            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">Tafsir</span>
            <span className="text-sm font-medium">{data.nama_surat} ayat {data.nomor_ayat}</span>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${relevansiColor}`}>{relevansi} · {scorePercent}%</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{data.isi}</p>
          <button
            onClick={() => router.push(`/surah/${data.id_surat}?ayat=${data.nomor_ayat}`)}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            Lihat Ayat
          </button>
        </div>
      );
    }
    if (tipe === 'doa') {
      return (
        <div id={uniqueId} key={idx} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 relative">
          <button
            onClick={() => handleShareResult(uniqueId, shareTitle)}
            disabled={sharingId === uniqueId}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
          >
            {sharingId === uniqueId ? <FaSpinner className="animate-spin w-4 h-4" /> : <FaShareAlt className="w-4 h-4 text-gray-600" />}
          </button>
          <div className="flex items-center gap-2 pr-10">
            <span className="font-bold text-sm">{data.nama_doa || 'Doa'}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${relevansiColor}`}>{relevansi}</span>
          </div>
          <div className="text-right font-arabic text-lg mt-2">{data.teks_arab}</div>
          <p className="text-sm text-gray-600 mt-2">{data.terjemahan}</p>
        </div>
      );
    }
    return null;
  };

  // ==========================================================================
  // SUBMIT HANDLER
  // ==========================================================================
  const handleSubmit = () => {
    if (mode === 'chat') {
      sendChatMessage();
    } else {
      performSemanticSearch();
    }
  };

  const handleModeToggle = (newMode: 'chat' | 'semantic') => {
    setMode(newMode);
    if (newMode === 'semantic') {
      setSearchResults([]);
      setSearchError(null);
    }
  };

  const currentInputValue = mode === 'chat' ? input : searchQuery;
  const setCurrentInputValue = (val: string) => {
    if (mode === 'chat') setInput(val);
    else setSearchQuery(val);
  };

  // ==========================================================================
  // RENDER UTAMA - DESAIN MODERN
  // ==========================================================================
  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      {/* HEADER: tinggi 56px, padding horizontal 16px, background putih */}
      <div className="h-14 px-4 flex items-center justify-between bg-white border-b border-gray-100 sticky top-0 z-10">
        <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition">
          <FaBars className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex items-center gap-2">
          <Image src="/icons/icon-512x512.png" alt="Quranku AI" width={28} height={28} className="rounded-full" />
          <h1 className="text-base font-semibold text-gray-800">Quranku AI</h1>
          {mode === 'chat' && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
              status === 'online' ? 'bg-green-100 text-green-700' :
              status === 'fallback' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
            }`}>
              {status === 'online' ? 'Online' : status === 'fallback' ? 'Backup' : 'Offline'}
            </span>
          )}
        </div>
        <button
          onClick={mode === 'chat' ? startNewChat : () => setSearchResults([])}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition"
        >
          <FaPlus className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* CHAT AREA: flex-1, overflow-y-auto, padding 16px, background #F5F5F5 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {mode === 'chat' ? (
          // ========== BUBBLE CHAT ==========
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                    <FaRobot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#4A8CFF] text-white rounded-br-md'
                      : 'bg-white text-gray-800 shadow-sm rounded-bl-md'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <MarkdownContent content={msg.content} onNavigate={handleNavigate} />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                  <div className="text-right text-[9px] opacity-60 mt-1">
                    {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 ml-2 mt-1">
                    <FaUser className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center mr-2">
                  <FaSpinner className="animate-spin text-white w-4 h-4" />
                </div>
                <div className="bg-white rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-gray-500 shadow-sm">
                  AI sedang mengetik...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        ) : (
          // ========== MODE SEMANTIC SEARCH ==========
          <div>
            {searchLoading && (
              <div className="text-center py-8">
                <FaSpinner className="animate-spin w-6 h-6 text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Mencari makna dari pertanyaan Anda...</p>
              </div>
            )}
            {searchError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">
                <FaExclamationTriangle className="inline mr-2" /> {searchError}
              </div>
            )}
            {!searchLoading && searchResults.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Hasil untuk "{searchQuery}"</p>
                {searchResults.map((res, i) => renderSearchResultCard(res, i))}
              </div>
            )}
            {!searchLoading && searchQuery && searchResults.length === 0 && !searchError && (
              <div className="text-center py-8 text-gray-500">
                <FaSearch className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Tidak ada hasil untuk "{searchQuery}"</p>
                <p className="text-xs mt-1">Coba gunakan kata kunci lain atau turunkan skor minimal (di opsi lanjutan)</p>
              </div>
            )}
            {!searchQuery && !searchLoading && !searchError && (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                <FaSearch className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">Cari ayat, tafsir, atau doa dengan bahasa natural</p>
                <p className="text-xs mt-1">Contoh: "ayat tentang kesabaran" atau "tafsir surat Al-Fatihah"</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* INPUT AREA: sticky bottom, background transparan, padding 12-16px */}
      <div className="sticky bottom-0 bg-transparent px-4 py-3">
        <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-3">
          {/* Input teks */}
          <textarea
            ref={inputRef}
            value={currentInputValue}
            onChange={(e) => setCurrentInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
            placeholder={mode === 'chat' ? "Tanyakan sesuatu..." : "Cari ayat/tafsir/doa..."}
            rows={1}
            className="w-full text-sm border-0 focus:ring-0 resize-none placeholder-gray-400 outline-none bg-transparent"
          />
          {/* Action Row: Chips kiri, Icon kanan */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-2">
              {/* Chip Tanya AI */}
              <button
                onClick={() => handleModeToggle('chat')}
                className={`h-8 px-3 rounded-full text-xs font-medium transition ${
                  mode === 'chat'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tanya AI
              </button>
              {/* Chip Cari Semantik */}
              <button
                onClick={() => handleModeToggle('semantic')}
                className={`h-8 px-3 rounded-full text-xs font-medium transition ${
                  mode === 'semantic'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Cari Semantik
              </button>
            </div>
            <div className="flex gap-2">
              <button className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                <FaMicrophone className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  (mode === 'chat' && (!currentInputValue.trim() || isLoading)) ||
                  (mode === 'semantic' && (!currentInputValue.trim() || searchLoading))
                }
                className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-40 transition"
              >
                {mode === 'chat' ? <FaPaperPlane className="w-4 h-4" /> : <FaSearch className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-2">
          {mode === 'chat' ? 'Enter kirim, Shift+Enter baris baru' : 'Enter cari'}
        </p>
      </div>
    </div>
  );
}