'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Droplets,
  X,
  Send,
  Bot,
  User,
  MessageCircle,
  Minimize2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  role: 'bot' | 'user';
  timestamp: Date;
}

const suggestedQuestions = [
  'Berapa konsumsi air saya hari ini?',
  'Prediksi tagihan bulan ini',
  'Apakah ada kebocoran? ',
  'Tips hemat air dong',
];

// Parse markdown bold **text** to JSX
function parseMarkdownBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export function WataboyChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content:
        'Halo!  Saya Wataboy 💧 Asisten Smart Water Meter kamu. Ada yang bisa saya bantu? ',
      role: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      // ==========================================
      // 🔧 FIX: Ganti URL ke Next.js API Route
      // ==========================================
      // Sebelum: http://localhost:8000/chat (langsung ke Python)
      // Sesudah: /api/chat (via Next.js → InfluxDB → Python)
      // ==========================================

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: content.trim(),
          user_id: 'web_user',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from chatbot');
      }

      const data = await response.json();

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content:
          data.response ||
          data.message ||
          'Maaf, saya tidak dapat memproses permintaan Anda saat ini.',
        role: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          'Maaf, terjadi kesalahan saat menghubungi server. Silakan coba lagi nanti.  🙏',
        role: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => {
            setIsOpen(!isOpen);
            setIsMinimized(false);
          }}
          className={cn(
            'relative h-14 w-14 rounded-full shadow-lg',
            'bg-primary hover:bg-primary/90',
            'transition-colors duration-200'
          )}
          size="icon"
        >
          {isOpen ? (
            <X className="h-6 w-6 text-primary-foreground" />
          ) : (
            <Droplets className="h-6 w-6 text-primary-foreground" />
          )}
        </Button>
      </div>

      {/* Chat Window - Larger size */}
      <div
        className={cn(
          'fixed bottom-24 right-6 z-50 w-105 h-150',
          'transition-opacity duration-200',
          isOpen && !isMinimized
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        )}
      >
        <Card className="flex flex-col h-full shadow-xl overflow-hidden border border-border/50">
          {/* Header */}
          <CardHeader className="bg-primary text-primary-foreground py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-foreground/15 ring-2 ring-primary-foreground/20">
                  <Droplets className="h-5 w-5" />
                </div>
                {/* Online indicator */}
                <span className="absolute -bottom-0.5 -right-0.5 h-3. 5 w-3.5 rounded-full bg-green-400 ring-2 ring-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold tracking-tight">
                  Wataboy
                </CardTitle>
                <p className="text-xs text-primary-foreground/70 flex items-center gap-1.5">
                  <span className="relative flex h-1. 5 w-1.5">
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
                  </span>
                  Online • Siap membantu
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={() => setIsMinimized(true)}
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-primary-foreground/70 hover: text-primary-foreground hover: bg-primary-foreground/10"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Messages Area */}
          <CardContent
            className={cn(
              'flex-1 overflow-y-auto p-4 space-y-3 bg-background',
              'scrollbar-hide'
            )}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-2. 5',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-4 py-2. 5 text-sm shadow-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-secondary text-secondary-foreground rounded-tl-sm'
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {parseMarkdownBold(message.content)}
                  </p>
                  <span className="text-[10px] mt-1.5 block opacity-60">
                    {message.timestamp.toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5 items-center">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-pulse" />
                    <span
                      className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-pulse"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-pulse"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </CardContent>

          {/* Suggested Questions */}
          <div className="px-4 pb-2 pt-2 border-t bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2 font-medium">
              💡 Pertanyaan populer
            </p>
            <div className="relative flex items-center gap-1">
              <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSendMessage(question)}
                    className={cn(
                      'text-xs px-3 py-1.5 rounded-full whitespace-nowrap shrink-0',
                      'bg-background text-foreground',
                      'border border-border hover:border-primary/50',
                      'hover:bg-primary/5',
                      'transition-colors duration-150',
                      'shadow-sm'
                    )}
                  >
                    {question}
                  </button>
                ))}
              </div>
              <div className="shrink-0 text-muted-foreground/50">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-3 border-t bg-card">
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ketik pesan..."
                  className={cn(
                    'w-full rounded-full border border-input bg-background',
                    'pl-4 pr-4 py-2.5 text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
                    'placeholder:text-muted-foreground/60',
                    'transition-colors duration-150'
                  )}
                />
              </div>
              <Button
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim() || isTyping}
                size="icon"
                className="rounded-full h-10 w-10 shrink-0 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <Droplets className="h-3 w-3 text-muted-foreground/50" />
              <p className="text-[10px] text-muted-foreground/50">
                Powered by Wataboy AI
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Minimized State */}
      {isOpen && isMinimized && (
        <div className="fixed bottom-24 right-6 z-50">
          <button
            onClick={() => setIsMinimized(false)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-full',
              'bg-primary text-primary-foreground shadow-lg',
              'hover: bg-primary/90',
              'transition-colors duration-150'
            )}
          >
            <div className="relative">
              <MessageCircle className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-2. 5 w-2.5 rounded-full bg-green-400 ring-2 ring-primary" />
            </div>
            <span className="font-medium text-sm">Wataboy</span>
          </button>
        </div>
      )}
    </>
  );
}
