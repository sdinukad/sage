'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Expense } from '@/shared/models';
import { MessageSquare, Edit3, Send, Sparkles, Check, X, Loader2 } from 'lucide-react';
import CategoryBadge from '@/components/CategoryBadge';
import { format } from 'date-fns';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  matchedExpenses?: Expense[];
  editIntent?: {
    expenseId: string;
    changes: any;
    confirmationText: string;
  };
}

export default function ChatPage() {
  const [activeTab, setActiveTab] = useState<'ask' | 'edit'>('ask');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchExpenses = async () => {
      const { data } = await supabase.from('expenses').select('*');
      if (data) setExpenses(data);
    };
    fetchExpenses();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(7),
      type: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const endpoint = activeTab === 'ask' ? '/api/ai/query' : '/api/ai/edit-intent';
      const body = activeTab === 'ask' 
        ? { query: input, expenses } 
        : { message: input, expenses };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (activeTab === 'ask') {
        const matched = expenses.filter(e => data.matchedIds?.includes(e.id));
        setMessages((prev) => [...prev, {
          id: Math.random().toString(36).substring(7),
          type: 'ai',
          content: data.answer,
          matchedExpenses: matched
        }]);
      } else {
        setMessages((prev) => [...prev, {
          id: Math.random().toString(36).substring(7),
          type: 'ai',
          content: data.confirmationText,
          editIntent: data.expenseId ? {
            expenseId: data.expenseId,
            changes: data.changes,
            confirmationText: data.confirmationText
          } : undefined
        }]);
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [...prev, {
        id: Math.random().toString(36).substring(7),
        type: 'ai',
        content: "Sorry, I encountered an error processing your request."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const confirmEdit = async (msgId: string, intent: any) => {
    setLoading(true);
    const { error } = await supabase
      .from('expenses')
      .update(intent.changes)
      .eq('id', intent.expenseId);

    if (error) {
      alert(error.message);
    } else {
      setMessages((prev) => prev.map(m => 
        m.id === msgId ? { ...m, editIntent: undefined, content: "✓ Expense updated successfully!" } : m
      ));
      // Refresh expenses
      const { data } = await supabase.from('expenses').select('*');
      if (data) setExpenses(data);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="card flex-1 flex flex-col p-0 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('ask')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${
              activeTab === 'ask' ? 'text-[#16a34a] border-b-2 border-[#16a34a]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <MessageSquare size={18} />
            Ask
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium transition-colors ${
              activeTab === 'edit' ? 'text-[#16a34a] border-b-2 border-[#16a34a]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Edit3 size={18} />
            Edit
          </button>
        </div>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Sparkles size={32} className="text-[#16a34a]" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Hi, I'm Sage Assistant</h3>
                <p className="text-sm">
                  {activeTab === 'ask' 
                    ? "Ask me things like 'How much did I spend on food this week?'"
                    : "Try 'Change my lunch today to $15'"}
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] space-y-3 ${msg.type === 'user' ? 'order-2' : ''}`}>
                <div className={`p-4 rounded-2xl shadow-sm ${
                  msg.type === 'user' 
                    ? 'bg-[#16a34a] text-white rounded-tr-none' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none'
                }`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>

                {/* Match Cards for "Ask" */}
                {msg.matchedExpenses && msg.matchedExpenses.length > 0 && (
                  <div className="grid grid-cols-1 gap-2">
                    {msg.matchedExpenses.map((exp) => (
                      <div key={exp.id} className="card p-3 flex items-center justify-between border-l-4 border-l-[#16a34a]">
                        <div>
                          <p className="text-sm font-bold">${Number(exp.amount).toFixed(2)}</p>
                          <p className="text-xs text-gray-500">{exp.note || exp.category}</p>
                        </div>
                        <div className="text-right">
                          <CategoryBadge category={exp.category} className="text-[10px]" />
                          <p className="text-[10px] text-gray-400 mt-1">{format(new Date(exp.date), 'MMM d')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Confirm Card for "Edit" */}
                {msg.editIntent && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-900/30 p-4 rounded-xl space-y-3">
                    <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider">Confirm Changes</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => confirmEdit(msg.id, msg.editIntent)}
                        className="flex-1 bg-[#16a34a] text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                      >
                        <Check size={16} /> Confirm
                      </button>
                      <button 
                        onClick={() => setMessages(m => m.filter(x => x.id !== msg.id))}
                        className="flex-1 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 py-2 rounded-lg text-sm font-bold border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2"
                      >
                        <X size={16} /> Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-gray-400" />
                <span className="text-xs text-gray-400 font-medium">Sage is thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="relative flex items-center">
            <input
              type="text"
              placeholder={activeTab === 'ask' ? "Ask about your expenses..." : "Describe what to change..."}
              className="input-field pr-12 py-3 shadow-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="absolute right-2 p-2 bg-[#16a34a] text-white rounded-lg hover:bg-[#15803d] transition-colors disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
