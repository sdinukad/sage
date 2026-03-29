'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Expense, Income, ChatAction, ChatResponse } from '@/shared/models';
import { Send, Sparkles } from 'lucide-react';
import ChatBubble from '@/components/ChatBubble';
import ConfirmationCard from '@/components/ConfirmationCard';
import { CATEGORY_COLORS } from '@/components/CategoryBadge';
import { useAuth } from '@/context/AuthContext';
import { useExpenseData } from '@/context/ExpenseDataContext';
import { syncAddExpense, syncUpdateExpense, syncAddIncome, syncUpdateIncome } from '@/lib/sync';
import { getRate } from '@/lib/exchange-rates';
import { useSettings } from '@/context/SettingsContext';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  actions?: ChatAction[];
  resolvedActions?: string[];
}

type ChatMode = 'ask' | 'edit';

export default function ChatPage() {
  const { user } = useAuth();
  const { currency, formatCurrency } = useSettings();
  const { expenses, categories, refreshData } = useExpenseData();
  const [mode] = useState<ChatMode>('ask');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [messages]);

  // Scroll when loading starts
  const prevLoadingRef = useRef(false);
  useEffect(() => {
    if (loading && !prevLoadingRef.current && scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
    prevLoadingRef.current = loading;
  }, [loading]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      type: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    if (!navigator.onLine) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            type: 'assistant',
            content:
              "I'm having trouble connecting to the network. Please connect to Wi-Fi so we can chat!",
          },
        ]);
        setLoading(false);
      }, 500);
      return;
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          mode,
          expenseCategories: categories
            .filter((c) => c.type === 'expense')
            .map((c) => ({ name: c.name, hints: c.ai_hints })),
          incomeCategories: categories
            .filter((c) => c.type === 'income')
            .map((c) => ({ name: c.name, hints: c.ai_hints })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data: ChatResponse = await res.json();

      const msgId = Math.random().toString(36).substring(7);
      setMessages((prev) => [
        ...prev,
        {
          id: msgId,
          type: 'assistant',
          content: data.answer,
          actions: data.actions || [],
          resolvedActions: [],
        },
      ]);
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          type: 'assistant',
          content: !navigator.onLine
            ? "I'm having trouble connecting to the network. Please connect to Wi-Fi so we can chat!"
            : "I'm having trouble connecting to Sage AI. Please try again later.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (msgId: string, actionIndex: number) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg || !msg.actions) return;
    const action = msg.actions[actionIndex];
    if (!action) return;

    if (!user) return;

    let success = false;
    try {
      if (action.type === 'edit_expense' && action.data?.editExpense) {
        await syncUpdateExpense(
          action.data.editExpense.id,
          action.data.editExpense.changes
        );
        success = true;
      } else if (action.type === 'add_expense' && action.data?.newExpense) {
        const date = action.data.newExpense.date || new Date().toISOString().split('T')[0];
        const extCurrency = action.data.newExpense.currency || currency;
        const amount = Number(action.data.newExpense.amount || 0);
        
        const rate = await getRate(extCurrency, currency, date);
        const base_amount = Number((amount * rate).toFixed(2));

        await syncAddExpense({
          ...action.data.newExpense,
          id: crypto.randomUUID(),
          user_id: user.id,
          created_at: new Date().toISOString(),
          date,
          currency: extCurrency,
          base_currency: currency,
          base_amount,
          exchange_rate: rate,
        } as Expense);
        success = true;
      } else if (action.type === 'add_income' && action.data?.newIncome) {
        const date = action.data.newIncome.date || new Date().toISOString().split('T')[0];
        const extCurrency = action.data.newIncome.currency || currency;
        const amount = Number(action.data.newIncome.amount || 0);
        
        const rate = await getRate(extCurrency, currency, date);
        const base_amount = Number((amount * rate).toFixed(2));

        await syncAddIncome({
          ...action.data.newIncome,
          id: crypto.randomUUID(),
          user_id: user.id,
          created_at: new Date().toISOString(),
          date,
          currency: extCurrency,
          base_currency: currency,
          base_amount,
          exchange_rate: rate,
        } as Income);
        success = true;
      } else if (action.type === 'edit_income' && action.data?.editIncome) {
        await syncUpdateIncome(
          action.data.editIncome.id,
          action.data.editIncome.changes
        );
        success = true;
      }
    } catch (err) {
      console.error('Action error:', err);
    }

    if (success) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                resolvedActions: [
                  ...(m.resolvedActions || []),
                  actionIndex.toString(),
                ],
              }
            : m
        )
      );
      refreshData();
    }
  };

  const examplePrompts = [
    'How much did I spend this month?',
    "What's my biggest category?",
    'Show food expenses',
    'Got my salary 120k',
  ];

  return (
    /* 
      On mobile: fills the area between sticky header and bottom nav (set by AppShell's main pb-[...]).
      On desktop: AppShell makes this column h-screen overflow-hidden, 
      so we use h-full flex flex-col here.
    */
    <div className="flex flex-col h-full">
      {/* ── Desktop top bar ── */}
      <div
        className="hidden lg:flex items-center gap-3 px-6 py-4 shrink-0"
        style={{
          borderBottom: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)',
          backgroundColor: 'var(--surface)',
        }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--primary-container)', color: 'var(--on-primary-container)' }}
        >
          <Sparkles size={16} strokeWidth={2} />
        </div>
        <div>
          <h1 className="font-serif text-[17px] font-semibold text-on-surface leading-tight">
            Chat with Sage
          </h1>
          <p className="text-[12px] text-on-surface-variant">
            Your personal financial assistant
          </p>
        </div>
      </div>

      {/* ── Scrollable message area ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 flex flex-col gap-4 no-scrollbar"
      >
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col gap-6 mt-4 lg:mt-10 animate-[fadeSlideUp_0.4s_ease-out]">
            <div className="flex flex-col items-center text-center gap-2 mb-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2"
                style={{ backgroundColor: 'var(--primary-container)', color: 'var(--on-primary-container)' }}
              >
                <Sparkles size={30} strokeWidth={1.5} />
              </div>
              <h2 className="font-serif text-[24px] lg:text-[28px] text-on-surface">
                Hello, I&apos;m Sage
              </h2>
              <p className="text-[14px] text-on-surface-variant max-w-[280px] lg:max-w-xs">
                Your personal financial assistant. How can I help you today?
              </p>
            </div>

            {/* Suggested prompts */}
            <div className="flex flex-col gap-3 w-full max-w-2xl mx-auto">
              <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider ml-1">
                Suggested
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {examplePrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="px-4 py-3.5 rounded-2xl text-[14px] font-medium text-left transition-all group flex items-center justify-between"
                    style={{
                      backgroundColor: 'var(--surface-container)',
                      color: 'var(--on-surface)',
                      border: '1px solid color-mix(in srgb, var(--outline-variant) 60%, transparent)',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-container-high)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--surface-container)';
                      (e.currentTarget as HTMLElement).style.borderColor = 'color-mix(in srgb, var(--outline-variant) 60%, transparent)';
                    }}
                  >
                    <span>{prompt}</span>
                    <span
                      className="text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0 font-bold"
                    >
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto">
          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col">
              <ChatBubble role={msg.type} content={msg.content} />

              {/* Matched Expenses */}
              {msg.type === 'assistant' &&
                msg.actions?.some(
                  (a: ChatAction) =>
                    a.type === 'query' && a.data?.matchedIds
                ) && (
                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x ml-2 my-2 transition-all">
                    {expenses
                      .filter((e) =>
                        msg.actions
                          ?.find((a: ChatAction) => a.type === 'query')
                          ?.data?.matchedIds?.includes(e.id)
                      )
                      .map((exp) => (
                        <div
                          key={exp.id}
                          className="card min-w-[160px] p-4 flex flex-col gap-2 snap-start border-sage-100 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{
                                backgroundColor:
                                  CATEGORY_COLORS[exp.category] ||
                                  CATEGORY_COLORS['Other'],
                              }}
                            />
                            <span className="text-[10px] text-on-surface-variant font-medium uppercase">
                              {exp.category}
                            </span>
                          </div>
                          <span className="font-mono text-[20px] text-on-surface font-semibold">
                            {formatCurrency(Number(exp.base_amount || exp.amount))}
                          </span>
                          <span className="text-[12px] text-on-surface-variant truncate">
                            {exp.note || 'No description'}
                          </span>
                        </div>
                      ))}
                  </div>
                )}

              {/* Confirmation Actions */}
              {msg.type === 'assistant' &&
                msg.actions?.map((action: ChatAction, idx: number) => {
                  const isResolved = msg.resolvedActions?.includes(
                    idx.toString()
                  );
                  if (
                    [
                      'edit_expense',
                      'add_expense',
                      'add_income',
                      'edit_income',
                    ].includes(action.type) &&
                    !isResolved
                  ) {
                    return (
                      <div
                        key={idx}
                        className="ml-2 animate-[fadeSlideUp_0.3s_ease-out]"
                      >
                        <ConfirmationCard
                          text={action.confirmationText || ''}
                          onConfirm={() => handleConfirmAction(msg.id, idx)}
                          onCancel={() =>
                            setMessages((prev) =>
                              prev.map((m) =>
                                m.id === msg.id
                                  ? {
                                      ...m,
                                      resolvedActions: [
                                        ...(m.resolvedActions || []),
                                        idx.toString(),
                                      ],
                                    }
                                  : m
                              )
                            )
                          }
                        />
                      </div>
                    );
                  }
                  return null;
                })}
            </div>
          ))}

          {/* Thinking indicator */}
          {loading && <ChatBubble role="assistant" content="" isThinking />}
        </div>
      </div>

      {/* ── Input Area ── */}
      <div
        className="shrink-0 backdrop-blur-md p-3 pb-[calc(64px+env(safe-area-inset-bottom)+4px)] lg:pb-3 lg:px-6"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--surface) 95%, transparent)',
          borderTop: '1px solid color-mix(in srgb, var(--outline-variant) 30%, transparent)',
        }}
      >
        <div
          className="max-w-3xl mx-auto flex items-center gap-3 px-3 py-2 rounded-[24px]"
          style={{
            backgroundColor: 'var(--surface-container)',
            border: '1.5px solid var(--outline-variant)',
          }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={
              isOffline
                ? 'You are offline. Reconnect to chat…'
                : 'Log an expense or ask about your finances…'
            }
            value={input}
            disabled={isOffline || loading}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 bg-transparent border-none py-1.5 text-[15px] text-on-surface outline-none resize-none no-scrollbar font-sans"
            style={{ color: 'var(--on-surface)' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading || isOffline}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              backgroundColor: input.trim() && !loading && !isOffline
                ? 'var(--primary)'
                : 'var(--surface-container-high)',
              color: input.trim() && !loading && !isOffline
                ? 'var(--on-primary)'
                : 'var(--on-surface-variant)',
              opacity: !input.trim() || loading || isOffline ? 0.5 : 1,
            }}
          >
            <Send size={17} strokeWidth={2.5} />
          </button>
        </div>
        <p className="hidden lg:block text-center text-[11px] mt-2" style={{ color: 'var(--on-surface-variant)', opacity: 0.4 }}>
          Press <kbd className="font-mono">Enter</kbd> to send · <kbd className="font-mono">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
