'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  FaBars, FaPlus, FaPaperPlane, FaSpinner,
  FaExclamationTriangle, FaSearch, FaExternalLinkAlt,
  FaShareAlt, FaMicrophone, FaUser, FaTimes, FaTrash,
  FaPhoneAlt, FaPhoneSlash,
} from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { snapdom } from '@zumer/snapdom';
import { sendMessageWithFallback, OpenRouterMessage } from '@/lib/ai';

// ----------------------------------------------------------------------
// Type definitions
// ----------------------------------------------------------------------
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: 'airo_hunter' | 'devnova_id';
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
}

interface SearchResult {
  tipe: 'surat' | 'ayat' | 'tafsir' | 'doa';
  skor: number;
  relevansi: 'tinggi' | 'sedang' | 'rendah';
  data: any;
}

// ----------------------------------------------------------------------
// System prompt untuk LLM
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
// Markdown renderer (dengan perbaikan href undefined)
// ----------------------------------------------------------------------
const MarkdownContent = ({ content, onNavigate }: { content: string; onNavigate: (href: string) => void }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm, remarkMath]}
    rehypePlugins={[rehypeKatex]}
    components={{
      table: ({ children }) => (
        <div className="overflow-x-auto my-3">
          <table className="min-w-full border-collapse border border-gray-300 text-sm">{children}</table>
        </div>
      ),
      th: ({ children }) => <th className="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold text-left">{children}</th>,
      td: ({ children }) => <td className="border border-gray-300 px-3 py-2">{children}</td>,
      code: ({ className, children, inline }: any) => {
        if (!inline) return <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto text-xs my-2"><code className={className}>{children}</code></pre>;
        return <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>;
      },
      a: ({ href, children }) => {
        if (!href) return <span>{children}</span>;
        return (
          <a href={href} onClick={(e) => { e.preventDefault(); onNavigate(href); }} className="text-blue-600 underline font-medium hover:text-blue-800">
            {children}
          </a>
        );
      },
      p: ({ children }) => <p className="mb-2 last:mb-0 text-sm leading-relaxed">{children}</p>,
    }}
  >
    {content}
  </ReactMarkdown>
);

// ----------------------------------------------------------------------
// Helper: strip markdown untuk TTS
// ----------------------------------------------------------------------
const stripMarkdown = (markdown: string): string => {
  let text = markdown.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');
  text = text.replace(/`{1,3}[^`]*`{1,3}/g, '');
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/^[\-\*]{3,}\s*$/gm, '');
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  return text.trim();
};

// ----------------------------------------------------------------------
// Komponen utama
// ----------------------------------------------------------------------
export default function QurankuAIPage() {
  const router = useRouter();

  // State percakapan
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [showSidebar, setShowSidebar] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find(c => c.id === activeId) || conversations[0] || null;
  const messages = activeConv?.messages ?? [];

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'online' | 'fallback' | 'offline'>('online');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const STORAGE_KEY = 'quranku_ai_conversations';

  // Mode: chat, semantic, atau telvon
  const [mode, setMode] = useState<'chat' | 'semantic' | 'telvon'>('chat');

  // Semantic search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadErrorMsg, setDownloadErrorMsg] = useState<string | null>(null);
  const [searchLimit] = useState(5);
  const [searchTypes] = useState<string[]>(['ayat', 'tafsir', 'doa']);
  const [searchMinScore] = useState(0.4);

  // State untuk mode telvon
  const [callActive, setCallActive] = useState(false);
  const [telvonStatus, setTelvonStatus] = useState<'idle' | 'listening' | 'thinking' | 'speaking'>('idle');
  const [telvonError, setTelvonError] = useState<string | null>(null); // ✅ baru: error telvon
  const recognitionRef = useRef<any>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // ----------------------------------------------------------------------
  // Fungsi Text-to-Speech (kecepatan 1.2, pitch 1.4)
  // ----------------------------------------------------------------------
  const speakText = (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
      const plainText = stripMarkdown(text);
      if (!plainText.trim()) {
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.lang = 'id-ID';
      utterance.rate = 1.2;
      utterance.pitch = 1.4;
      utterance.volume = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        resolve();
      };
      utterance.onerror = (e) => {
        setIsSpeaking(false);
        reject(e);
      };
      window.speechSynthesis.speak(utterance);
    });
  };

  // ----------------------------------------------------------------------
  // Fungsi percakapan (chat teks)
  // ----------------------------------------------------------------------
  const createNewConversation = (): Conversation => ({
    id: Date.now().toString(),
    title: 'Percakapan Baru',
    messages: [{
      id: 'welcome',
      role: 'assistant',
      content: 'Halo! Saya asisten cerdas Quranku. Saya bisa membantu Anda:\n\n• Mencari ayat/tafsir Al-Qur\'an\n• Menjawab pertanyaan Islam\n• Menampilkan hadis, doa, jadwal sholat, dan kalkulator zakat\n\nCoba tanyakan: "Cari ayat tentang kesabaran" atau "Hadis tentang keutamaan ilmu"',
      timestamp: new Date(),
    }],
  });

  // Load & simpan localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: Conversation[] = JSON.parse(saved);
        const fixed = parsed.map(conv => ({
          ...conv,
          messages: conv.messages.map(msg => ({ ...msg, timestamp: new Date(msg.timestamp) })),
        }));
        setConversations(fixed);
        if (fixed.length > 0) setActiveId(fixed[fixed.length - 1].id);
        else { const newConv = createNewConversation(); setConversations([newConv]); setActiveId(newConv.id); }
      } catch { const newConv = createNewConversation(); setConversations([newConv]); setActiveId(newConv.id); }
    } else { const newConv = createNewConversation(); setConversations([newConv]); setActiveId(newConv.id); }
  }, []);

  useEffect(() => {
    if (conversations.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    if (mode === 'semantic') setSearchQuery(input);
  }, [mode, input]);

  useEffect(() => {
    if (mode === 'chat') inputRef.current?.focus();
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mode, messages]);

  // Reset error saat keluar mode telvon
  useEffect(() => {
    if (mode !== 'telvon') {
      setTelvonError(null);
    }
  }, [mode]);

  // Sidebar handlers
  const switchConversation = (id: string) => { setActiveId(id); setShowSidebar(false); setTimeout(() => inputRef.current?.focus(), 100); };
  const startNewChat = () => { const newConv = createNewConversation(); setConversations(prev => [...prev, newConv]); setActiveId(newConv.id); setShowSidebar(false); };
  const deleteConversation = (id: string) => {
    if (window.confirm('Hapus percakapan ini?')) {
      const updated = conversations.filter(c => c.id !== id);
      setConversations(updated);
      if (activeId === id) {
        if (updated.length > 0) setActiveId(updated[0].id);
        else { const newConv = createNewConversation(); setConversations([newConv]); setActiveId(newConv.id); }
      }
    }
  };
  const handleTouchStart = (id: string) => { longPressTimer.current = setTimeout(() => deleteConversation(id), 800); };
  const handleTouchEnd = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };
  const updateConversationTitle = (convId: string, userMsg: string) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== convId) return conv;
      if (!conv.messages.some(m => m.role === 'user') || conv.title === 'Percakapan Baru') {
        let title = userMsg.trim().replace(/\n/g, ' ');
        if (title.length > 40) title = title.slice(0, 40) + '...';
        return { ...conv, title };
      }
      return conv;
    }));
  };

  // Fungsi mengirim pesan (digunakan oleh chat teks dan mode telvon)
  const sendChatMessage = async (text: string, fromVoice: boolean = false) => {
    if (!text.trim() || isLoading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setConversations(prev => prev.map(conv => conv.id === activeId ? { ...conv, messages: [...conv.messages, userMsg] } : conv));
    updateConversationTitle(activeId, text);
    setInput('');
    setIsLoading(true);
    const apiMessages: OpenRouterMessage[] = [
      { role: 'system', content: QURANKU_SYSTEM_PROMPT },
      ...messages.filter(m => m.id !== 'welcome').map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: text },
    ];
    try {
      const result = await sendMessageWithFallback(apiMessages, true);
      const assistantMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: result.content, timestamp: new Date(), provider: result.provider };
      setConversations(prev => prev.map(conv => conv.id === activeId ? { ...conv, messages: [...conv.messages, assistantMsg] } : conv));
      setStatus(result.status);
      if (mode === 'telvon' && callActive) {
        setTelvonStatus('speaking');
        await speakText(result.content);
        setTelvonStatus('listening');
        startContinuousListening();
      }
    } catch {
      const errorMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Maaf, layanan AI sedang sibuk. Silakan coba lagi nanti.', timestamp: new Date() };
      setConversations(prev => prev.map(conv => conv.id === activeId ? { ...conv, messages: [...conv.messages, errorMsg] } : conv));
      setStatus('offline');
      if (mode === 'telvon' && callActive) {
        await speakText('Maaf, layanan sedang sibuk.');
        setTelvonStatus('listening');
        startContinuousListening();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // Mode Telvon: continuous speech recognition
  // ----------------------------------------------------------------------
  const startContinuousListening = () => {
    if (!callActive || telvonStatus !== 'listening') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTelvonError('Browser Anda tidak mendukung pengenalan suara. Silakan gunakan Chrome.');
      setCallActive(false);
      setTelvonStatus('idle');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'id-ID';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      if (transcript && transcript.trim()) {
        recognition.stop();
        setTelvonStatus('thinking');
        await sendChatMessage(transcript, true);
      }
    };
    recognition.onerror = (event: any) => {
      console.error('Recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'audio-capture') {
        setTelvonError('Mikrofon tidak diizinkan. Silakan izinkan akses mikrofon di pengaturan browser.');
        setCallActive(false);
        setTelvonStatus('idle');
        return;
      }
      if (callActive && !isSpeaking && telvonStatus === 'listening') {
        setTimeout(() => startContinuousListening(), 1000);
      }
    };
    recognition.onend = () => {
      if (callActive && !isSpeaking && telvonStatus === 'listening') {
        startContinuousListening();
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopContinuousListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  // ✅ Minta izin mikrofon sebelum memulai panggilan
  const startCall = async () => {
    setTelvonError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setTelvonError('Mikrofon tidak diizinkan. Silakan izinkan akses mikrofon.');
      return;
    }
    setCallActive(true);
    setTelvonStatus('listening');
    startContinuousListening();
  };

  const endCall = () => {
    setCallActive(false);
    stopContinuousListening();
    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setTelvonStatus('idle');
  };

  useEffect(() => {
    if (mode !== 'telvon' && callActive) endCall();
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      window.speechSynthesis.cancel();
    };
  }, [mode, callActive]);

  // ----------------------------------------------------------------------
  // Semantic search
  // ----------------------------------------------------------------------
  const performSemanticSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    try {
      const res = await fetch('https://equran.id/api/vector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cari: searchQuery.trim(), batas: searchLimit, tipe: searchTypes, skorMin: searchMinScore }),
      });
      const data = await res.json();
      if (data.status === 'sukses') setSearchResults(data.hasil || []);
      else throw new Error(data.pesan || 'Gagal mencari');
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setSearchLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // Capture & share/download gambar
  // ----------------------------------------------------------------------
  const captureElementWithWatermark = async (element: HTMLElement): Promise<Blob> => {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.position = 'relative';
    clone.style.backgroundColor = '#ffffff';
    clone.style.borderRadius = '16px';
    clone.style.padding = '16px';
    clone.style.boxShadow = 'none';
    clone.style.width = `${element.offsetWidth}px`;
    clone.querySelectorAll('button, [role="button"]').forEach((btn) => {
      (btn as HTMLElement).style.display = 'none';
    });
    wrapper.appendChild(clone);
    const watermark = document.createElement('div');
    watermark.textContent = '— generated by Quranku AI';
    watermark.style.position = 'absolute';
    watermark.style.bottom = '12px';
    watermark.style.right = '16px';
    watermark.style.fontSize = '10px';
    watermark.style.color = '#9ca3af';
    watermark.style.backgroundColor = 'rgba(255,255,255,0.9)';
    watermark.style.padding = '2px 8px';
    watermark.style.borderRadius = '20px';
    watermark.style.fontFamily = 'system-ui, sans-serif';
    watermark.style.whiteSpace = 'nowrap';
    watermark.style.zIndex = '20';
    watermark.style.pointerEvents = 'none';
    wrapper.appendChild(watermark);
    wrapper.style.position = 'fixed';
    wrapper.style.top = '0';
    wrapper.style.left = '-9999px';
    document.body.appendChild(wrapper);
    try {
      const blob = await snapdom.toBlob(wrapper, { type: 'png', scale: 2, backgroundColor: '#ffffff' });
      if (!blob) throw new Error('Gagal membuat gambar');
      return blob;
    } finally {
      document.body.removeChild(wrapper);
    }
  };

  const handleShareOrDownload = async (elementId: string, title: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      setDownloadErrorMsg('Elemen tidak ditemukan. Segarkan halaman dan coba lagi.');
      return;
    }
    setDownloadingId(elementId);
    setDownloadErrorMsg(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      const blob = await captureElementWithWatermark(element);
      const fileName = `quranku_${title.replace(/[^a-z0-9]/gi, '_')}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      const shareData = { title: title, text: 'Dibagikan dari Quranku AI', files: [file] };
      if (navigator.canShare && navigator.canShare(shareData)) {
        try { await navigator.share(shareData); } catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) setDownloadErrorMsg('Gagal membagikan gambar.'); }
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = fileName;
        link.href = url;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
    } catch (error) {
      setDownloadErrorMsg('Gagal mengunduh gambar. Silakan coba lagi.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Render kartu hasil semantic search
  const renderSearchResultCard = (result: SearchResult, idx: number) => {
    const { tipe, skor, relevansi, data } = result;
    const scorePercent = Math.round(skor * 100);
    const relevansiColor =
      relevansi === 'tinggi' ? 'bg-emerald-100 text-emerald-800' : relevansi === 'sedang' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600';
    const uniqueId = `${tipe}-${data.id_surat || data.nomor_ayat || idx}-${Date.now()}-${idx}`;
    const downloadTitle = `${data.nama_surat || 'Hasil'} - ${tipe === 'ayat' ? `Ayat ${data.nomor_ayat}` : tipe}`;

    if (tipe === 'ayat') {
      return (
        <div id={uniqueId} key={idx} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 relative">
          <button onClick={() => handleShareOrDownload(uniqueId, downloadTitle)} disabled={downloadingId === uniqueId} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition disabled:opacity-50">
            {downloadingId === uniqueId ? <FaSpinner className="animate-spin w-4 h-4" /> : <FaShareAlt className="w-4 h-4 text-gray-600" />}
          </button>
          <div className="flex items-center gap-2 mb-2 pr-10">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">Ayat</span>
            <span className="text-sm font-semibold">{data.nama_surat} · {data.nomor_ayat}</span>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${relevansiColor}`}>{relevansi} · {scorePercent}%</span>
          </div>
          <div className="text-right font-arabic text-xl leading-loose mb-2">{data.teks_arab}</div>
          <div className="text-sm text-gray-600 italic mb-2">{data.teks_latin}</div>
          <div className="text-sm text-gray-700 border-l-2 border-blue-400 pl-3">{data.terjemahan_id}</div>
          <button onClick={() => router.push(`/surah/${data.id_surat}?ayat=${data.nomor_ayat}`)} className="mt-3 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">Baca lengkap <FaExternalLinkAlt className="w-3 h-3" /></button>
        </div>
      );
    }
    if (tipe === 'tafsir') {
      return (
        <div id={uniqueId} key={idx} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 relative">
          <button onClick={() => handleShareOrDownload(uniqueId, downloadTitle)} disabled={downloadingId === uniqueId} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            {downloadingId === uniqueId ? <FaSpinner className="animate-spin w-4 h-4" /> : <FaShareAlt className="w-4 h-4 text-gray-600" />}
          </button>
          <div className="flex items-center gap-2 mb-2 pr-10">
            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs">Tafsir</span>
            <span className="text-sm font-medium">{data.nama_surat} ayat {data.nomor_ayat}</span>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${relevansiColor}`}>{relevansi} · {scorePercent}%</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">{data.isi}</p>
          <button onClick={() => router.push(`/surah/${data.id_surat}?ayat=${data.nomor_ayat}`)} className="mt-2 text-xs text-blue-600 hover:underline">Lihat Ayat</button>
        </div>
      );
    }
    if (tipe === 'doa') {
      return (
        <div id={uniqueId} key={idx} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100 relative">
          <button onClick={() => handleShareOrDownload(uniqueId, downloadTitle)} disabled={downloadingId === uniqueId} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            {downloadingId === uniqueId ? <FaSpinner className="animate-spin w-4 h-4" /> : <FaShareAlt className="w-4 h-4 text-gray-600" />}
          </button>
          <div className="flex items-center gap-2 pr-10">
            <span className="font-bold text-sm">{data.nama_doa || 'Doa'}</span>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${relevansiColor}`}>{relevansi}</span>
          </div>
          <div className="text-right font-arabic text-lg mt-2">{data.teks_arab}</div>
          <p className="text-sm text-gray-600 mt-2">{data.terjemahan}</p>
        </div>
      );
    }
    return null;
  };

  const handleSubmit = () => {
    if (mode === 'chat') sendChatMessage(input, false);
    else if (mode === 'semantic') performSemanticSearch();
  };

  const handleModeToggle = (newMode: 'chat' | 'semantic' | 'telvon') => {
    if (newMode === 'telvon') {
      setMode('telvon');
      setSearchResults([]);
    } else {
      if (callActive) endCall();
      setMode(newMode);
      if (newMode === 'semantic') setSearchResults([]);
      setTelvonError(null);
    }
  };

  // Auto-resize textarea
  const autoResizeTextarea = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 144)}px`;
    }
  };
  useEffect(() => { autoResizeTextarea(); }, [input]);

  // ----------------------------------------------------------------------
  // Render UI
  // ----------------------------------------------------------------------
  return (
    <div className="h-dvh bg-[#F5F5F5] flex flex-col relative">
      {/* Sidebar overlay */}
      {showSidebar && <div className="fixed inset-0 z-30 backdrop-blur-sm bg-white/5" onClick={() => setShowSidebar(false)} />}
      {/* Sidebar */}
      <div ref={sidebarRef} className={`fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-40 transform transition-transform duration-300 ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-base font-semibold">Riwayat</h2>
          <button onClick={() => setShowSidebar(false)} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-gray-100"><FaTimes className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto h-[calc(100%-60px)] p-3">
          {conversations.map(conv => (
            <div key={conv.id} className={`flex items-start p-3 rounded-xl mb-2 cursor-pointer ${conv.id === activeId ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              onClick={() => switchConversation(conv.id)} onTouchStart={() => handleTouchStart(conv.id)} onTouchEnd={handleTouchEnd}
              onContextMenu={(e) => { e.preventDefault(); deleteConversation(conv.id); }}>
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0"><FaUser className="w-4 h-4 text-blue-600" /></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{conv.title}</p><p className="text-xs text-gray-500 mt-0.5">{conv.messages.filter(m => m.role === 'user').length} pesan</p></div>
              <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }} className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 ml-1"><FaTrash className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={startNewChat} className="w-full mt-3 flex items-center justify-center gap-1 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 text-sm"><FaPlus className="w-3 h-3" /> Percakapan Baru</button>
        </div>
      </div>

      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between bg-white border-b border-gray-100 sticky top-0 z-20 flex-shrink-0">
        <button onClick={() => setShowSidebar(true)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"><FaBars className="w-5 h-5 text-gray-700" /></button>
        <div className="flex items-center gap-2">
          <Image src="/icons/icon-512x512.png" alt="Quranku AI" width={28} height={28} className="rounded-full" />
          <h1 className="text-base font-semibold text-gray-800">Quranku AI</h1>
          {mode === 'chat' && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${status === 'online' ? 'bg-green-100 text-green-700' : status === 'fallback' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
              {status === 'online' ? 'Online' : status === 'fallback' ? 'Backup' : 'Offline'}
            </span>
          )}
        </div>
        <button onClick={startNewChat} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100"><FaPlus className="w-5 h-5 text-gray-700" /></button>
      </div>

      {/* Area konten (scroll) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
        {mode === 'chat' && (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mr-2 mt-1 shadow-sm border border-gray-200">
                    <Image src="/icons/icon-512x512.png" alt="Quranku" width={24} height={24} className="rounded-full" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-[#4A8CFF] text-white rounded-br-md' : 'bg-white text-gray-800 shadow-sm rounded-bl-md'}`}>
                  {msg.role === 'assistant' ? <MarkdownContent content={msg.content} onNavigate={(href) => router.push(href)} /> : <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                  <div className="text-right text-[9px] opacity-60 mt-1">{msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center ml-2 mt-1"><FaUser className="w-4 h-4 text-gray-600" /></div>}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center mr-2">
                  <Image src="/icons/icon-512x512.png" width={24} height={24} alt="Quranku" className="rounded-full animate-pulse" />
                </div>
                <div className="bg-white rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-gray-500 shadow-sm">Berfikir...</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}

        {mode === 'semantic' && (
          <div>
            {downloadErrorMsg && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm mb-3"><FaExclamationTriangle className="inline mr-2" /> {downloadErrorMsg}<button onClick={() => setDownloadErrorMsg(null)} className="ml-2 text-red-500 underline text-xs">Tutup</button></div>}
            {searchLoading && <div className="text-center py-8"><FaSpinner className="animate-spin w-6 h-6 text-blue-500 mx-auto mb-2" /><p className="text-sm text-gray-500">Mencari makna dari pertanyaan Anda...</p></div>}
            {searchError && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm"><FaExclamationTriangle className="inline mr-2" /> {searchError}</div>}
            {!searchLoading && searchResults.length > 0 && <div><p className="text-xs text-gray-500 mb-2">Hasil untuk "{searchQuery}"</p>{searchResults.map((res, i) => renderSearchResultCard(res, i))}</div>}
            {!searchLoading && searchQuery && searchResults.length === 0 && !searchError && <div className="text-center py-8 text-gray-500"><FaSearch className="w-8 h-8 mx-auto mb-2 text-gray-300" /><p className="text-sm">Tidak ada hasil untuk "{searchQuery}"</p><p className="text-xs mt-1">Coba gunakan kata kunci lain.</p></div>}
            {!searchQuery && !searchLoading && !searchError && <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl"><FaSearch className="w-8 h-8 mx-auto mb-2" /><p className="text-sm">Cari ayat, tafsir, atau doa dengan bahasa natural</p><p className="text-xs mt-1">Contoh: "ayat tentang kesabaran"</p></div>}
          </div>
        )}

        {mode === 'telvon' && (
          <div className="flex flex-col items-center justify-center h-full">
            <div className={`w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 ${callActive ? (isSpeaking ? 'bg-green-500 animate-pulse' : telvonStatus === 'listening' ? 'bg-blue-500 animate-pulse' : 'bg-gray-400') : 'bg-gray-300'}`}>
              <FaMicrophone className={`text-white text-6xl ${telvonStatus === 'listening' && callActive ? 'animate-ping' : ''}`} />
            </div>
            <p className="mt-6 text-lg font-semibold">
              {callActive ? (isSpeaking ? 'AI sedang berbicara...' : telvonStatus === 'listening' ? 'Mendengarkan...' : 'Memproses...') : 'Mode Telepon'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {callActive ? 'Anda bisa bicara secara langsung. AI akan merespon dengan suara.' : 'Tekan tombol di bawah untuk memulai panggilan suara dengan AI.'}
            </p>
            {/* ✅ Tampilkan error telvon di sini */}
            {telvonError && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm max-w-xs">
                <FaExclamationTriangle className="inline mr-2" />
                {telvonError}
              </div>
            )}
            {!callActive ? (
              <button onClick={startCall} className="mt-8 bg-green-600 text-white px-8 py-3 rounded-full flex items-center gap-2 text-lg font-semibold shadow-lg"><FaPhoneAlt /> Mulai Panggilan</button>
            ) : (
              <button onClick={endCall} className="mt-8 bg-red-600 text-white px-8 py-3 rounded-full flex items-center gap-2 text-lg font-semibold shadow-lg"><FaPhoneSlash /> Akhiri Panggilan</button>
            )}
          </div>
        )}
      </div>

      {/* Input area (hanya untuk mode chat dan semantic) */}
      {mode !== 'telvon' && (
        <div className="fixed left-0 right-0 bottom-[70px] z-20 bg-transparent px-4 py-3">
          <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-3">
            <textarea ref={inputRef} value={input} onChange={(e) => { setInput(e.target.value); autoResizeTextarea(); }} placeholder={mode === 'chat' ? 'Tanyakan sesuatu...' : 'Cari ayat/tafsir/doa...'} rows={1} className="w-full text-sm border-0 focus:ring-0 resize-none placeholder-gray-400 outline-none bg-transparent overflow-y-auto" style={{ maxHeight: '144px' }} />
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-2">
                <button onClick={() => handleModeToggle('chat')} className={`h-8 px-3 rounded-full text-xs font-medium transition ${mode === 'chat' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Tanya AI</button>
                <button onClick={() => handleModeToggle('semantic')} className={`h-8 px-3 rounded-full text-xs font-medium transition ${mode === 'semantic' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Cari Semantik</button>
                <button onClick={() => handleModeToggle('telvon')} className={`h-8 px-3 rounded-full text-xs font-medium transition ${(mode as string) === 'telvon' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Mode Telvon</button>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSubmit} disabled={(mode === 'chat' && (!input.trim() || isLoading)) || (mode === 'semantic' && (!searchQuery.trim() || searchLoading))} className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 disabled:opacity-40 transition">
                  {mode === 'chat' ? <FaPaperPlane className="w-4 h-4" /> : <FaSearch className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-2">{mode === 'chat' ? 'Enter baris baru, tombol untuk kirim' : 'Enter baris baru, tombol untuk cari'}</p>
        </div>
      )}
    </div>
  );
}