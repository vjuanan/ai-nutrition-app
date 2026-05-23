'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context/AppContext';
import { Send, User, Sparkles, MessageSquare, Check, CheckCheck } from 'lucide-react';

interface Message {
    id: string;
    sender: 'user' | 'professional';
    body: string;
    time: string;
}

interface Thread {
    id: string;
    name: string;
    role: string;
    avatarLetter: string;
    unread: boolean;
    lastMessage: string;
    messages: Message[];
}

const initialThreads: Thread[] = [
    {
        id: 't1',
        name: 'Carlos Gomez',
        role: 'Paciente',
        avatarLetter: 'C',
        unread: false,
        lastMessage: 'Perfecto, hoy arranco con la avena a la mañana!',
        messages: [
            { id: 'm1', sender: 'professional', body: 'Hola Carlos! ¿Pudiste ver el plan que te armé para esta semana?', time: '10:00' },
            { id: 'm2', sender: 'user', body: 'Hola Lic! Sí, se ve genial. Muy saciador el almuerzo.', time: '10:15' },
            { id: 'm3', sender: 'professional', body: 'Excelente. Recuerda tomar los 3 Litros de agua diarios.', time: '10:20' },
            { id: 'm4', sender: 'user', body: 'Perfecto, hoy arranco con la avena a la mañana!', time: '10:30' }
        ]
    },
    {
        id: 't2',
        name: 'Lucía Fernández',
        role: 'Paciente',
        avatarLetter: 'L',
        unread: true,
        lastMessage: '¿Puedo reemplazar la pechuga por lomo de cerdo magro?',
        messages: [
            { id: 'm5', sender: 'user', body: '¿Puedo reemplazar la pechuga por lomo de cerdo magro?', time: 'Yest.' }
        ]
    },
    {
        id: 't3',
        name: 'Mariano Silva',
        role: 'Marketplace Lead',
        avatarLetter: 'M',
        unread: true,
        lastMessage: 'Hola, me interesa tu programa de nutrición deportiva. ¿Tenés turnos?',
        messages: [
            { id: 'm6', sender: 'user', body: 'Hola, me interesa tu programa de nutrición deportiva. ¿Tenés turnos?', time: 'Yest.' }
        ]
    }
];

export default function MessagesPage() {
    const { role } = useApp();
    const [threads, setThreads] = useState<Thread[]>(initialThreads);
    const [activeThreadId, setActiveThreadId] = useState('t1');
    const [inputText, setInputText] = useState('');

    const activeThread = threads.find(t => t.id === activeThreadId) || threads[0];

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const newMessage: Message = {
            id: `msg_${Date.now()}`,
            sender: role === 'patient' ? 'user' : 'professional',
            body: inputText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        const updatedThreads = threads.map(t => {
            if (t.id === activeThreadId) {
                return {
                    ...t,
                    lastMessage: inputText,
                    messages: [...t.messages, newMessage]
                };
            }
            return t;
        });

        setThreads(updatedThreads);
        setInputText('');
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mensajería</h1>
                <p className="text-sm text-slate-500 font-semibold mt-1">Chat de consultas y contrataciones del Marketplace.</p>
            </div>

            {/* Split layout: Inbox threads and active chat */}
            <div className="grid gap-8 lg:grid-cols-[1fr_2fr] h-[600px] border border-olive-200 bg-white rounded-[2.5rem] overflow-hidden shadow-cv-sm">
                
                {/* Inbox list */}
                <div className="border-r border-olive-100 flex flex-col h-full overflow-hidden bg-olive-50/10">
                    <div className="p-5 border-b border-olive-100">
                        <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">Conversaciones</span>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-olive-50">
                        {threads.map((thread) => {
                            const active = thread.id === activeThreadId;
                            return (
                                <button
                                    key={thread.id}
                                    onClick={() => {
                                        setActiveThreadId(thread.id);
                                        // Mark read
                                        setThreads(threads.map(t => t.id === thread.id ? { ...t, unread: false } : t));
                                    }}
                                    className={`w-full p-4 text-left flex items-start gap-3 transition ${
                                        active ? 'bg-olive-100/40 border-l-4 border-l-olive-800' : 'hover:bg-olive-50/50'
                                    }`}
                                >
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-olive-800 text-white font-black text-sm">
                                        {thread.avatarLetter}
                                    </span>
                                    <div className="flex-1 overflow-hidden relative">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-black text-slate-900 truncate pr-6">{thread.name}</h4>
                                            {thread.unread && (
                                                <span className="absolute right-0 top-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
                                            )}
                                        </div>
                                        <span className="block text-[9px] font-bold text-slate-400 mt-0.5">{thread.role}</span>
                                        <p className="text-[11px] font-medium text-slate-500 mt-2 truncate leading-relaxed">
                                            {thread.lastMessage}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Active Chat box */}
                <div className="flex flex-col h-full overflow-hidden justify-between">
                    {/* Chat header */}
                    <div className="h-16 border-b border-olive-100 px-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-olive-50 text-olive-800 font-black text-xs">
                                {activeThread.avatarLetter}
                            </span>
                            <div>
                                <h4 className="text-xs font-black text-slate-900 leading-none">{activeThread.name}</h4>
                                <span className="text-[9px] font-bold text-slate-400 mt-0.5 block">{activeThread.role}</span>
                            </div>
                        </div>
                    </div>

                    {/* Messages panel */}
                    <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-olive-50/5">
                        {activeThread.messages.map((message) => {
                            const isMine = role === 'patient'
                                ? message.sender === 'user'
                                : message.sender === 'professional';

                            return (
                                <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-md rounded-2xl p-4 shadow-cv-sm border text-xs font-semibold leading-relaxed ${
                                        isMine
                                            ? 'bg-olive-800 text-white border-olive-800 rounded-tr-none'
                                            : 'bg-white text-slate-800 border-olive-100 rounded-tl-none'
                                    }`}>
                                        <p>{message.body}</p>
                                        <div className="flex justify-end items-center gap-1.5 mt-2 text-[9px] font-mono text-slate-300">
                                            <span>{message.time}</span>
                                            {isMine && <CheckCheck size={12} />}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Chat Input form */}
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-olive-100 bg-white flex gap-3">
                        <input
                            type="text"
                            placeholder="Escribí un mensaje..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            className="cv-input h-10 px-4 rounded-xl text-xs font-bold"
                        />
                        <button
                            type="submit"
                            className="cv-btn-accent h-10 w-10 shrink-0 flex items-center justify-center rounded-xl"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
