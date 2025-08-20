// app/page.tsx
'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [history, setHistory] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Başlangıçta true
  const storyContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const startGame = async () => {
      setIsLoading(true);
      const response = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: [] }),
      });
      const data = await response.json();
      if (data.message) {
        setHistory([{ role: 'assistant', content: data.message }]);
      }
      setIsLoading(false);
    };
    startGame();
  }, []);

  useEffect(() => {
    storyContainerRef.current?.scrollTo(0, storyContainerRef.current.scrollHeight);
    if (!isLoading) {
        inputRef.current?.focus();
    }
  }, [history, isLoading]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const newUserMessage: Message = { role: 'user', content: userInput };
    const newHistory = [...history, newUserMessage];
    
    setHistory(newHistory);
    setUserInput('');
    setIsLoading(true);

    const response = await fetch('/api/story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: newHistory }),
    });

    const data = await response.json();

    if (data.message) {
      setHistory([...newHistory, { role: 'assistant', content: data.message }]);
    }
    setIsLoading(false);
  };

  return (
    <main className="bg-black text-green-400 min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-4xl flex flex-col h-[90vh]">
        <h1 
          className="text-4xl md:text-6xl mb-6 text-center" 
          style={{ textShadow: '0 0 5px #39FF14, 0 0 10px #39FF14' }}
        >
          Ş İ D M İ
        </h1>
        
        <div 
          ref={storyContainerRef} 
          className="flex-grow mb-6 space-y-4 overflow-y-auto p-4 border border-green-700/50 rounded-sm"
        >
          {history.map((msg, index) => (
            <div key={index} className="fade-in">
              {msg.role === 'assistant' ? (
                // Anlatıcı metni satır satır yazılıyormuş gibi göstermek için
                <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                <p className="text-green-600/70">{`> ${msg.content}`}</p>
              )}
            </div>
          ))}
          {isLoading && <p className="text-green-400/50 animate-pulse">...</p>}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center">
          <span className="text-2xl mr-2 text-green-400">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="w-full bg-transparent text-xl p-2 focus:outline-none placeholder-green-700/50"
            placeholder={isLoading ? "" : "..."}
            disabled={isLoading}
            autoFocus
          />
          {!isLoading && <span className="blinking-cursor text-2xl">_</span>}
        </form>
      </div>
    </main>
  );
}