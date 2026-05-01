'use client';

import { useState, useEffect, useRef } from 'react';
import { FaRobot, FaUser, FaTrash, FaTimes, FaPaperPlane, FaSpinner, FaWifi } from 'react-icons/fa';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { sendMessageWithFallback, OpenRouterMessage } from '@/lib/ai';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: 'airo_hunter' | 'devnova_id';
  reasoning_details?: any;
}

const QURANKU_SYSTEM_PROMPT = `Anda adalah asisten AI untuk aplikasi quranku (https://quranku.devnova.icu). 
Aplikasi ini adalah Quran digital dengan fitur: membaca Al-Quran 114 surah + tafsir, doa harian, ilmu tajwid, kumpulan hadis (9 kitab utama), jadwal sholat seluruh Indonesia, mode offline, PWA, bookmark, audio murattal, dan kalkulator zakat.
Teknologi: Next.js 15, TypeScript, Tailwind CSS, Dexie (IndexedDB), Service Worker, API dari devnova.icu, hadith.gading.dev, equran.id.
Jawablah pertanyaan dengan ramah, informatif, dan singkat. Jika ditanya di luar topik quranku, arahkan kembali ke fitur aplikasi.`;

const MarkdownContent = ({ content }: { content: string }) => (
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
        const isInline = !className; // Jika tidak ada className, berarti inline code
        if (isInline) {
          return <code className="bg-gray-100 px-1 rounded text-xs" {...props}>{children}</code>;
        }
        return (
          <pre className="bg-gray-100 p-2 rounded overflow-x-auto text-xs">
            <code className={className} {...props}>{children}</code>
          </pre>
        );
      },
      a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
          {children}
        </a>
      ),
    }}
  >
    {content}
  </ReactMarkdown>
);

export const AIChatPopup = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Halo! Saya asisten quranku. Ada yang ingin Anda tanyakan tentang aplikasi ini? Fitur, teknologi, atau cara penggunaannya?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'online' | 'fallback' | 'offline'>('online');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const apiMessages: OpenRouterMessage[] = [
      { role: 'system', content: QURANKU_SYSTEM_PROMPT },
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.role === 'assistant' && msg.reasoning_details ? { reasoning_details: msg.reasoning_details } : {})
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
      setMessages(prev => [...prev, aiMessage]);
      setStatus(result.status);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Maaf, layanan AI sedang sibuk. Silakan coba lagi nanti.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
      setStatus('offline');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'Chat telah dibersihkan. Ada yang ingin Anda tanyakan tentang quranku?',
      timestamp: new Date(),
    }]);
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'online': return <span className="text-[10px] text-green-600 flex items-center gap-1"><FaWifi className="w-2.5 h-2.5" /> AI Online</span>;
      case 'fallback': return <span className="text-[10px] text-yellow-600 flex items-center gap-1"><FaWifi className="w-2.5 h-2.5" /> Backup</span>;
      default: return <span className="text-[10px] text-red-600 flex items-center gap-1"><FaWifi className="w-2.5 h-2.5" /> Offline</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <FaRobot className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold text-gray-900">Tanya Quranku AI</h3>
            {getStatusBadge()}
          </div>
          <div className="flex gap-1">
            <button onClick={clearChat} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="Hapus chat">
              <FaTrash className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <FaRobot className="w-3 h-3 text-emerald-600" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-lg px-3 py-2 ${msg.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                {msg.role === 'assistant' ? (
                  <MarkdownContent content={msg.content} />
                ) : (
                  <p className="text-xs whitespace-pre-wrap break-words">{msg.content}</p>
                )}
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[9px] opacity-70">
                    {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.provider && <span className="text-[8px] bg-gray-200 px-1 rounded">{msg.provider === 'airo_hunter' ? 'AH' : 'DN'}</span>}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
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
                <FaSpinner className="animate-spin w-3 h-3 text-emerald-600" />
                <span className="text-xs ml-2 text-gray-500">Sedang berpikir...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t border-gray-200">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Tanyakan tentang quranku..."
              className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-2 resize-none h-10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="px-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              <FaPaperPlane className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">Enter kirim, Shift+Enter baris baru. AI dilengkapi kemampuan penalaran.</p>
        </div>
      </div>
    </div>
  );
};