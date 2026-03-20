'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { ChatResponse, Expense, ChatAction } from '@/shared/models';
import { Send, Sparkles } from 'lucide-react';
import ChatBubble from '@/components/ChatBubble';
import ConfirmationCard from '@/components/ConfirmationCard';
import { CATEGORY_COLORS } from '@/components/CategoryBadge';
import { useAuth } from '@/context/AuthContext';
import { useExpenseData } from '@/context/ExpenseDataContext';
import { syncAddExpense, syncUpdateExpense } from '@/lib/sync';

const currencyFormatter = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 });

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
  const { expenses, categories, incomes, refreshData } = useExpenseData();
  const [mode] = useState<ChatMode>('ask');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll when messages change (not on loading toggle)
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

  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [messages]);

  // Scroll when loading starts (one-time, not on loading=false)
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
        setMessages((prev) => [...prev, {
          id: Math.random().toString(36).substring(7),
          type: 'assistant',
          content: "I'm having trouble connecting to the network. Please connect to Wi-Fi so we can chat!"
        }]);
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
          expenseCategories: categories.filter(c => c.type === 'expense').map(c => c.name),
          incomeCategories: categories.filter(c => c.type === 'income').map(c => c.name)
        }),
      });

      if (!res.body) throw new Error('No readable stream from API');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let rawJson = '';
      
      const msgId = Math.random().toString(36).substring(7);
      setMessages((prev) => [...prev, { id: msgId, type: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        rawJson += decoder.decode(value, { stream: true });
        
        const match = rawJson.match(/"answer"\s*:\s*"([\s\S]*?)(?:",\s*"actions"|$)/);
        if (match) {
            const partialAnswer = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
            setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: partialAnswer } : m));
        }
      }

      // Stream fully completed, parse the compiled payload
      const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '');
      const data: ChatResponse = JSON.parse(cleanJson);
      
      // Ensure the exact final answer text and actions are committed
      setMessages((prev) => prev.map(m => m.id === msgId ? { ...m, content: data.answer, actions: data.actions || [], resolvedActions: [] } : m));

    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev, {
        id: Math.random().toString(36).substring(7),
        type: 'assistant',
        content: !navigator.onLine 
          ? "I'm having trouble connecting to the network. Please connect to Wi-Fi so we can chat!"
          : "I'm having trouble connecting to Sage AI. Please try again later."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (msgId: string, actionIndex: number) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg || !msg.actions) return;
    const action = msg.actions[actionIndex];
    if (!action) return;

    if (!user) return;

    let success = false;
    try {
      if (action.type === 'edit_expense' && action.data?.editExpense) {
        await syncUpdateExpense(action.data.editExpense.id, action.data.editExpense.changes);
        success = true;
      } else if (action.type === 'add_expense' && action.data?.newExpense) {
        await syncAddExpense({
          ...action.data.newExpense,
          id: crypto.randomUUID(),
          user_id: user.id,
          created_at: new Date().toISOString(),
          date: action.data.newExpense.date || new Date().toISOString().split('T')[0]
        } as Expense);
        success = true;
      } else if (action.type === 'add_income' && action.data?.newIncome) {
        const { error } = await supabase.from('incomes').insert({
          ...action.data.newIncome,
          user_id: user.id
        });
        if (!error) success = true;
      } else if (action.type === 'edit_income' && action.data?.editIncome) {
        const { error } = await supabase
          .from('incomes')
          .update(action.data.editIncome.changes)
          .eq('id', action.data.editIncome.id);
        if (!error) success = true;
      }
    } catch (err) {
      console.error('Action error:', err);
    }

    if (success) {
      setMessages((prev) => prev.map(m => 
        m.id === msgId ? { 
          ...m, 
          resolvedActions: [...(m.resolvedActions || []), actionIndex.toString()]
        } : m
      ));
      refreshData();
    }
  };

  const examplePrompts = [
    "How much did I spend this month?",
    "What's my biggest category?",
    "Show food expenses",
    "Got my salary 120k"
  ];

  return (
    <div className="flex flex-col absolute inset-0 top-[56px] bottom-[calc(64px+env(safe-area-inset-bottom))]">
      {/* Chat Area — scrollable */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 no-scrollbar"
      >
        {messages.length === 0 && (
          <div className="flex flex-col gap-6 mt-8 animate-[fadeSlideUp_0.4s_ease-out]">
            <div className="flex flex-col items-center text-center gap-2 mb-4">
              <div className="w-16 h-16 bg-secondary-container rounded-2xl flex items-center justify-center text-on-secondary-container mb-2">
                <Sparkles size={32} />
              </div>
              <h2 className="font-serif text-[24px] text-on-surface">Hello, I&apos;m Sage</h2>
              <p className="text-[14px] text-on-surface-variant max-w-[240px]">Your personal financial assistant. How can I help you today?</p>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider ml-1">Suggested:</p>
              <div className="flex flex-col gap-2">
                {examplePrompts.map((prompt) => (
                  <button 
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="px-5 py-3.5 bg-surface-container border border-outline-variant text-on-surface rounded-2xl text-[14px] font-medium text-left active:scale-[0.98] transition-all hover:border-primary group flex items-center justify-between"
                  >
                    {prompt}
                    <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col">
            <ChatBubble role={msg.type} content={msg.content} />
            
            {/* Matched Expenses */}
            {msg.type === 'assistant' && msg.actions?.some((a: ChatAction) => a.type === 'query' && a.data?.matchedIds) && (
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x ml-2 my-2 transition-all">
                {expenses.filter(e => msg.actions?.find((a: ChatAction) => a.type === 'query')?.data?.matchedIds?.includes(e.id)).map(exp => (
                  <div key={exp.id} className="card min-w-[160px] p-4 flex flex-col gap-2 snap-start border-sage-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[exp.category] || CATEGORY_COLORS['Other'] }} />
                      <span className="text-[10px] text-on-surface-variant font-medium uppercase">{exp.category}</span>
                    </div>
                    <span className="font-mono text-[20px] text-on-surface font-semibold">
                      {currencyFormatter.format(Number(exp.amount))}
                    </span>
                    <span className="text-[12px] text-on-surface-variant truncate">{exp.note || 'No description'}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Confirmation Actions */}
            {msg.type === 'assistant' && msg.actions?.map((action: ChatAction, idx: number) => {
              const isResolved = msg.resolvedActions?.includes(idx.toString());
              if (['edit_expense', 'add_expense', 'add_income', 'edit_income'].includes(action.type) && !isResolved) {
                return (
                  <div key={idx} className="ml-2 animate-[fadeSlideUp_0.3s_ease-out]">
                    <ConfirmationCard 
                      text={action.confirmationText || ''}
                      onConfirm={() => handleConfirmAction(msg.id, idx)}
                      onCancel={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, resolvedActions: [...(m.resolvedActions || []), idx.toString()] } : m))}
                    />
                  </div>
                );
              }
              return null;
            })}
          </div>
        ))}

        {/* Thinking indicator — no entrance animation to avoid flicker */}
        {loading && (
          <ChatBubble role="assistant" content="" isThinking />
        )}
      </div>

      {/* Fixed Input Area at bottom */}
      <div className="flex-shrink-0 bg-surface/90 backdrop-blur-md border-t border-border p-3">
        <div className="flex items-center gap-3 px-3 py-2 bg-surface-container border border-border rounded-[24px]">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={isOffline ? "You are offline. Reconnect to chat..." : "Ask anything..."}
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
          />
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() || loading || isOffline}
            className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center flex-shrink-0 active:scale-95 disabled:opacity-50 transition-all shadow-md"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
