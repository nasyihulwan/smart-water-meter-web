'use client';

import { useState, useRef, useEffect } from 'react';
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
  'Berapa konsumsi air saya bulan ini?',
  'Bagaimana cara menghemat air?',
  'Kapan tagihan air saya jatuh tempo?',
  'Apakah ada kebocoran di rumah saya?',
];

export function WataboyChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Halo! Saya Wataboy 💧 Apa yang bisa saya bantu hari ini?',
      role: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
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
    // Delay showing messages for stagger animation
    if (isOpen) {
      const timer = setTimeout(() => setShowMessages(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowMessages(false);
    }
  }, [isOpen]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      // eslint-disable-next-line react-hooks/purity
      id: Date.now().toString(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate bot response (template - will be replaced with actual API call later)
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: getBotResponse(content),
        role: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000);
  };

  // Template response - will be replaced with actual AI model later
  const getBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();

    if (
      lowerMessage.includes('konsumsi') ||
      lowerMessage.includes('penggunaan')
    ) {
      return 'Berdasarkan data meter Anda, konsumsi air bulan ini tercatat sebesar 15.2 m³. Ini 10% lebih rendah dari bulan lalu. Bagus! 👏';
    }
    if (lowerMessage.includes('hemat') || lowerMessage.includes('menghemat')) {
      return 'Beberapa tips menghemat air:\n1. 🚿 Mandi maksimal 5 menit\n2. 🚰 Tutup keran saat menyikat gigi\n3. 🧺 Cuci pakaian saat mesin penuh\n4. 🌱 Siram tanaman pagi/sore hari';
    }
    if (lowerMessage.includes('tagihan') || lowerMessage.includes('bayar')) {
      return 'Tagihan air Anda akan jatuh tempo pada tanggal 15 setiap bulannya. Estimasi tagihan bulan ini: Rp 125.000';
    }
    if (lowerMessage.includes('bocor') || lowerMessage.includes('kebocoran')) {
      return 'Berdasarkan pola konsumsi Anda, tidak terdeteksi adanya kebocoran. Konsumsi air malam hari (00:00-05:00) normal. ✅';
    }

    return 'Terima kasih atas pertanyaannya! Fitur AI sedang dalam pengembangan. Untuk saat ini, silakan coba pertanyaan yang tersedia atau hubungi customer service kami. 😊';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  return (
    <>
      {/* Floating Button with Ripple Effect */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Pulse rings */}
        {!isOpen && (
          <>
            <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <span className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
          </>
        )}
        <Button
          onClick={() => {
            setIsOpen(!isOpen);
            setIsMinimized(false);
          }}
          className={cn(
            'relative h-14 w-14 rounded-full shadow-xl transition-all duration-500 ease-out',
            'bg-primary hover:bg-primary/90 hover:shadow-2xl',
            'hover:scale-105 active:scale-95',
            isOpen && 'rotate-0'
          )}
          size="icon"
        >
          <div className="relative">
            <Droplets
              className={cn(
                'h-6 w-6 text-primary-foreground absolute inset-0 transition-all duration-300',
                isOpen
                  ? 'opacity-0 rotate-90 scale-0'
                  : 'opacity-100 rotate-0 scale-100'
              )}
            />
            <X
              className={cn(
                'h-6 w-6 text-primary-foreground transition-all duration-300',
                isOpen
                  ? 'opacity-100 rotate-0 scale-100'
                  : 'opacity-0 -rotate-90 scale-0'
              )}
            />
          </div>
        </Button>
      </div>

      {/* Chat Window */}
      <div
        className={cn(
          'fixed bottom-24 right-6 z-50 w-100 h-140',
          'transition-all duration-500 ease-out',
          'origin-bottom-right',
          isOpen && !isMinimized
            ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto'
            : 'translate-y-8 opacity-0 scale-90 pointer-events-none'
        )}
      >
        <Card className="flex flex-col h-full shadow-2xl overflow-hidden border border-border/50 backdrop-blur-sm">
          {/* Header */}
          <CardHeader className="bg-primary text-primary-foreground py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-foreground/15 backdrop-blur-sm ring-2 ring-primary-foreground/20">
                  <Droplets className="h-5 w-5" />
                </div>
                {/* Online indicator */}
                <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-400 ring-2 ring-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold tracking-tight">
                  Wataboy
                </CardTitle>
                <p className="text-xs text-primary-foreground/70 flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
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
                  className="h-8 w-8 rounded-full text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
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
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={cn(
                  'flex gap-2.5 transition-all duration-500',
                  message.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                  showMessages
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-4 opacity-0'
                )}
                style={{
                  transitionDelay: showMessages ? `${index * 50}ms` : '0ms',
                }}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform duration-200 hover:scale-110',
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
                    'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm',
                    'transition-all duration-200 hover:shadow-md',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-secondary text-secondary-foreground rounded-tl-sm'
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {message.content}
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
              <div className="flex gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1.5 items-center">
                    <span
                      className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                      style={{
                        animationDelay: '0ms',
                        animationDuration: '0.6s',
                      }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                      style={{
                        animationDelay: '150ms',
                        animationDuration: '0.6s',
                      }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce"
                      style={{
                        animationDelay: '300ms',
                        animationDuration: '0.6s',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </CardContent>

          {/* Suggested Questions - Always visible, horizontal scroll */}
          <div
            className={cn(
              'px-4 pb-2 pt-2 border-t bg-muted/30',
              'transition-all duration-500 delay-200',
              showMessages
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2'
            )}
          >
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
                      'hover:bg-primary/5 active:scale-95',
                      'transition-all duration-200',
                      'shadow-sm hover:shadow'
                    )}
                    style={{
                      transitionDelay: `${index * 50}ms`,
                    }}
                  >
                    {question}
                  </button>
                ))}
              </div>
              {/* Arrow indicator */}
              <div className="shrink-0 text-muted-foreground/50">
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-3 border-t bg-card/80 backdrop-blur-sm">
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
                    'transition-all duration-200'
                  )}
                />
              </div>
              <Button
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim() || isTyping}
                size="icon"
                className={cn(
                  'rounded-full h-10 w-10 shrink-0',
                  'transition-all duration-200',
                  'disabled:opacity-40',
                  inputValue.trim() &&
                    'shadow-md hover:shadow-lg hover:scale-105 active:scale-95'
                )}
              >
                <Send
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    inputValue.trim() && 'translate-x-0.5'
                  )}
                />
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
        <div
          className={cn(
            'fixed bottom-24 right-6 z-50',
            'animate-in fade-in slide-in-from-bottom-4 duration-300'
          )}
        >
          <button
            onClick={() => setIsMinimized(false)}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-full',
              'bg-primary text-primary-foreground shadow-xl',
              'hover:shadow-2xl hover:scale-105 active:scale-95',
              'transition-all duration-200'
            )}
          >
            <div className="relative">
              <MessageCircle className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-primary" />
            </div>
            <span className="font-medium text-sm">Wataboy</span>
          </button>
        </div>
      )}
    </>
  );
}
