'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaRobot, FaUser, FaTrash, FaTimes, FaPaperPlane, FaSpinner, FaWifi, FaPlus, FaExclamationTriangle } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendMessageWithFallback, OpenRouterMessage } from '@/lib/ai';

// ==================== Type Definitions ====================
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: 'airo_hunter' | 'devnova_id';
  reasoning_details?: any;
}

// ==================== System Prompt ====================
const QURANKU_SYSTEM_PROMPT = `Anda adalah asisten AI cerdas untuk aplikasi quranku (https://quranku.devnova.icu).  
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

// ==================== Markdown Component ====================
const MarkdownContent = ({ content, onNavigate }: { content: string; onNavigate: (href: string) => void }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="min-w-full border-collapse border border-gray-300 text-xs">
              {children}
            </table>
          </div>
        ),
        th: ({ children }) => <th className="border border-gray-300 px-2 py-1 bg-gray-100">{children}</th>,
        td: ({ children }) => <td className="border border-gray-300 px-2 py-1">{children}</td>,
        code: ({ className, children, ...props }: any) => {
          const isInline = !className;
          if (isInline) {
            return <code className="bg-gray-100 px-1 rounded text-xs" {...props}>{children}</code>;
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
              className="text-blue-600 underline hover:text-blue-800 transition cursor-pointer"
            >
              {children}
            </a>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

// ==================== Main Component ====================
export const AIChatPopup = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'online' | 'fallback' | 'offline'>('online');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const STORAGE_KEY = 'quranku_ai_chat_history';

  /**
   * Load saved chat history from localStorage on mount.
   */
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
        console.error('Failed to load chat history', e);
        setMessages([getWelcomeMessage()]);
      }
    } else {
      setMessages([getWelcomeMessage()]);
    }
  }, []);

  /**
   * Persist chat history to localStorage whenever messages change.
   */
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  /**
   * Returns the welcome message for new conversations.
   */
  const getWelcomeMessage = (): ChatMessage => ({
    id: 'welcome',
    role: 'assistant',
    content:
      'Halo! Saya asisten cerdas quranku. Saya bisa membantu Anda mencari:\n\n' +
      '• **Ayat atau tafsir** Al-Qur\'an\n' +
      '• **Hadis** dari 9 kitab utama (Bukhari, Muslim, dll)\n' +
      '• **Doa harian** berdasarkan kebutuhan\n' +
      '• **Hukum tajwid** dengan contoh\n' +
      '• **Jadwal sholat** dan **kalkulator zakat**\n\n' +
      'Cukup tanyakan saja, saya akan berikan jawaban dengan tautan langsung.\n\n' +
      '*Contoh: "Cari hadis tentang keutamaan belajar" atau "Tafsir surat Al-Fatihah ayat 1"*',
    timestamp: new Date(),
  });

  // Auto-focus input when popup opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Reset current conversation completely.
   */
  const clearChat = () => {
    setMessages([getWelcomeMessage()]);
    localStorage.removeItem(STORAGE_KEY);
  };

  /**
   * Start a fresh conversation without deleting stored history.
   */
  const startNewChat = () => {
    setMessages([getWelcomeMessage()]);
    localStorage.removeItem(STORAGE_KEY);
  };

  /**
   * Handle internal navigation via Next.js router.
   * Closes the popup after navigation.
   */
  const handleNavigate = (href: string) => {
    router.push(href);
    onClose();
  };

  /**
   * Send user message, get AI response, and update chat.
   */
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const apiMessages: OpenRouterMessage[] = [
      { role: 'system', content: QURANKU_SYSTEM_PROMPT },
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        ...(msg.role === 'assistant' && msg.reasoning_details ? { reasoning_details: msg.reasoning_details } : {}),
      })),
      { role: 'user', content: userMessage.content },
    ];

    try {
      const result = await sendMessageWithFallback(apiMessages, true);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.content,
        timestamp: new Date(),
        provider: result.provider,
        reasoning_details: result.reasoning_details,
      };
      setMessages((prev) => [...prev, aiMessage]);
      setStatus(result.status);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Maaf, layanan AI sedang sibuk. Silakan coba lagi nanti.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
      setStatus('offline');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Returns badge component indicating current server status.
   */
  const getStatusBadge = () => {
    switch (status) {
      case 'online':
        return <span className="text-[10px] text-green-600 flex items-center gap-1"><FaWifi className="w-2.5 h-2.5" /> AI Online</span>;
      case 'fallback':
        return <span className="text-[10px] text-yellow-600 flex items-center gap-1"><FaWifi className="w-2.5 h-2.5" /> Backup</span>;
      default:
        return <span className="text-[10px] text-red-600 flex items-center gap-1"><FaWifi className="w-2.5 h-2.5" /> Offline</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <FaRobot className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Tanya Quranku AI</h3>
            {getStatusBadge()}
          </div>
          <div className="flex gap-1">
            <button onClick={startNewChat} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition" title="Percakapan baru">
              <FaPlus className="w-4 h-4" />
            </button>
            <button onClick={clearChat} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition" title="Hapus semua chat">
              <FaTrash className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FaRobot className="w-3 h-3 text-emerald-600" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-lg px-3 py-2 ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                {msg.role === 'assistant' ? (
                  <MarkdownContent content={msg.content} onNavigate={handleNavigate} />
                ) : (
                  <p className="text-xs whitespace-pre-wrap break-words">{msg.content}</p>
                )}
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[9px] opacity-70">
                    {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.provider && (
                    <span className="text-[8px] bg-gray-200 px-1 rounded">
                      {msg.provider === 'airo_hunter' ? 'AH' : 'DN'}
                    </span>
                  )}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FaUser className="w-3 h-3 text-gray-600" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                <FaRobot className="w-3 h-3 text-emerald-600" />
              </div>
              <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                <FaSpinner className="animate-spin w-3 h-3 text-emerald-600 inline" />
                <span className="text-xs ml-2 text-gray-500">Sedang berpikir...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-gray-200 bg-white rounded-b-2xl">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Tanyakan tentang Al-Quran, hadis, doa, tajwid..."
              className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-2 resize-none h-10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="px-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              <FaPaperPlane className="w-4 h-4" />
            </button>
          </div>

          {/* Disclaimer */}
          <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-amber-600 bg-amber-50 p-1.5 rounded-lg">
            <FaExclamationTriangle className="w-3 h-3" />
            <span>AI dapat membuat kesalahan. Cek kebenaran informasi.</span>
          </div>

          <p className="text-[10px] text-gray-400 mt-1 text-center">
            Enter kirim, Shift+Enter baris baru. Klik tautan [Ya] untuk membuka halaman.
          </p>
        </div>
      </div>
    </div>
  );
};