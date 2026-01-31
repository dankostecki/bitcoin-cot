import React, { useState, useEffect, useRef } from 'react';
import { ProcessedDataPoint } from '../types';
import { generateAIContext, generateStaticReport } from '../utils';
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, FileText, User, Sparkles, Maximize2, Minimize2, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  data: ProcessedDataPoint[];
}

const AnalysisPage: React.FC<Props> = ({ data }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState('');
  const [isChatFullscreen, setIsChatFullscreen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate static report on mount or data change
    if (data.length > 0) {
        setReport(generateStaticReport(data));
    }
  }, [data]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = generateAIContext(data);
      
      const systemInstruction = `
      Jesteś ekspertem i analitykiem rynku kryptowalut z Wall Street. Specjalizujesz się w analizie raportów COT (Commitment of Traders).
      Masz dostęp do następujących najnowszych danych (Futures Only):
      ${context}

      Twoim zadaniem jest odpowiadać na pytania użytkownika dotyczące tych danych.
      - Formatuj odpowiedź używając Markdown, aby wyglądała jak profesjonalna notatka.
      - Używaj nagłówków (##, ###) do sekcji.
      - Używaj pogrubień (**tekst**) dla kluczowych liczb i wniosków.
      - Używaj list punktowanych dla czytelności.
      - Bądź zwięzły, konkretny i profesjonalny.
      - Używaj żargonu finansowego (Long, Short, Net Positioning, Smart Money, Basis Trade), ale tłumacz go jeśli trzeba.
      - Jeśli pytają o "Smart Money", mów o Asset Managerach.
      - Jeśli pytają o spekulantów, mów o Leveraged Funds.
      - Pamiętaj, że duży Short u Leveraged Funds to często Basis Trade (arbitraż), a nie zakład na spadki.
      - Odpowiadaj w języku polskim.
      `;

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: systemInstruction,
        },
        history: messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
      });

      const result = await chat.sendMessage({ message: userMsg });
      const response = result.text;

      if (response) {
        setMessages(prev => [...prev, { role: 'model', text: response }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "Przepraszam, wystąpił błąd połączenia z AI. Sprawdź klucz API." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadChat = () => {
    if (messages.length === 0) return;
    
    const timestamp = new Date().toLocaleString('pl-PL');
    let content = `RAPORT AI - WALL STREET BITCOIN INSIGHT\nData generowania: ${timestamp}\n\n========================================\n\n`;
    
    messages.forEach(m => {
      const role = m.role === 'user' ? 'PYTANIE UŻYTKOWNIKA' : 'ODPOWIEDŹ AI';
      content += `[${role}]\n\n${m.text}\n\n${'-'.repeat(40)}\n\n`;
    });

    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = `Raport_AI_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-140px)] animate-fade-in relative">
      
      {/* LEFT COLUMN: STATIC REPORT */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-xl">
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                Raport Analityczny
            </h2>
            <div className="px-2 py-1 bg-green-900/20 border border-green-500/30 rounded text-[10px] text-green-400 font-mono">
                AUTO-GENERATED
            </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-[#0f1014]">
            <article className="prose prose-invert prose-orange max-w-none">
                {report.split('\n').map((line, i) => {
                    if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-bold text-white mb-4 mt-6 border-b border-slate-800 pb-2">{line.replace('## ', '')}</h2>;
                    if (line.startsWith('### ')) return <h3 key={i} className="text-lg font-bold text-orange-400 mb-2 mt-4">{line.replace('### ', '')}</h3>;
                    if (line.startsWith('*')) return <li key={i} className="text-gray-300 ml-4 mb-1">{line.replace('*', '')}</li>;
                    if (line === '') return <br key={i} />;
                    return <p key={i} className="text-gray-300 mb-2 leading-relaxed text-sm text-justify" dangerouslySetInnerHTML={{__html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')}} />;
                })}
            </article>
            <div className="mt-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Jak interpretować dane?</h4>
                <p className="text-xs text-gray-500">
                    Ten raport jest generowany automatycznie na podstawie twardych danych liczbowych. 
                    Asset Managerowie zazwyczaj wyznaczają długoterminowy trend. 
                    Leveraged Funds zapewniają płynność i często stosują strategie neutralne rynkowo (Basis Trade).
                </p>
            </div>
        </div>
      </div>

      {/* RIGHT COLUMN: CHATBOT */}
      <div className={`${
          isChatFullscreen 
            ? 'fixed inset-0 z-50 h-screen w-screen m-0 rounded-none border-0' 
            : 'relative bg-slate-900 border border-slate-800 rounded-xl shadow-xl'
        } overflow-hidden flex flex-col bg-slate-900 transition-all duration-200`}>
        
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                AI Analityk (Beta)
            </h2>

            {/* Controls */}
            <div className="flex items-center gap-2">
                 <button 
                    onClick={handleDownloadChat}
                    disabled={messages.length === 0}
                    className="p-2 hover:bg-slate-800 rounded-lg text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Pobierz historię czatu (.txt)"
                 >
                    <Download className="w-4 h-4" />
                 </button>
                 <button 
                    onClick={() => setIsChatFullscreen(!isChatFullscreen)}
                    className="p-2 hover:bg-slate-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                    title={isChatFullscreen ? "Zamknij pełny ekran" : "Pełny ekran"}
                 >
                    {isChatFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                 </button>
            </div>
        </div>
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6 bg-[#0a0a0a]">
            {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 opacity-50">
                    <Bot className="w-16 h-16 mb-4" />
                    <p className="text-sm">Zapytaj o pozycje Asset Managerów...</p>
                </div>
            )}
            
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'user' ? (
                        // User Message
                        <div className="max-w-[80%] bg-orange-600 text-white p-3 rounded-xl rounded-br-none shadow-sm text-sm">
                            {msg.text}
                        </div>
                    ) : (
                        // Model Message (Report Card Style)
                        <div className="w-full max-w-[95%] bg-slate-800/60 border border-slate-700/80 rounded-xl rounded-tl-none p-5 shadow-lg backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-4 border-b border-slate-700/50 pb-2">
                                <Bot className="w-4 h-4 text-purple-400" />
                                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">AI Market Insight</span>
                            </div>
                            <div className="text-sm text-gray-300 leading-relaxed">
                                <ReactMarkdown
                                    components={{
                                        h1: ({node, ...props}) => <h1 className="text-xl font-bold text-white mb-3 mt-4 border-b border-orange-500/30 pb-1" {...props} />,
                                        h2: ({node, ...props}) => <h2 className="text-lg font-bold text-orange-400 mb-2 mt-4" {...props} />,
                                        h3: ({node, ...props}) => <h3 className="text-base font-bold text-gray-200 mb-1 mt-3" {...props} />,
                                        strong: ({node, ...props}) => <strong className="text-white font-bold" {...props} />,
                                        ul: ({node, ...props}) => <ul className="list-disc pl-4 space-y-1 mb-3 text-gray-400 marker:text-orange-500" {...props} />,
                                        ol: ({node, ...props}) => <ol className="list-decimal pl-4 space-y-1 mb-3 text-gray-400 marker:text-orange-500" {...props} />,
                                        li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                        p: ({node, ...props}) => <p className="mb-3 last:mb-0" {...props} />,
                                    }}
                                >
                                    {msg.text}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>
            ))}
            {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-slate-800 p-4 rounded-xl rounded-tl-none border border-slate-700 flex items-center gap-3">
                        <Bot className="w-4 h-4 text-purple-500 animate-pulse" />
                        <div className="flex gap-1.5">
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-75" />
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-150" />
                        </div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-950 border-t border-slate-800">
            <div className="relative">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Zapytaj o dane (np. 'Czy Dealerzy są short?')..."
                    className="w-full bg-slate-900 text-white pl-4 pr-12 py-3 rounded-lg border border-slate-700 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all placeholder:text-gray-600 text-sm"
                />
                <button 
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-orange-600 hover:bg-orange-500 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
            <p className="text-[10px] text-gray-600 mt-2 text-center">
                AI generuje wnioski na podstawie dostępnych danych. Zawsze weryfikuj z wykresem.
            </p>
        </div>
      </div>

    </div>
  );
};

export default AnalysisPage;