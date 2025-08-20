// app/page.tsx
'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';
import { Typewriter } from 'react-simple-typewriter';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function Home() {
  const [history, setHistory] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const storyContainerRef = useRef<HTMLDivElement>(null);

  // Oyunun başlangıç mantığı aynı kalıyor...
  useEffect(() => {
    const startGame = async () => {
      setIsLoading(true);
      const response = await fetch('/api/story', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ history: [] }) });
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
  }, [history]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;
    const newUserMessage: Message = { role: 'user', content: userInput };
    const newHistory = [...history, newUserMessage];
    setHistory(newHistory);
    setUserInput('');
    setIsLoading(true);
    const response = await fetch('/api/story', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ history: newHistory }) });
    const data = await response.json();
    if (data.message) {
      setHistory([...newHistory, { role: 'assistant', content: data.message }]);
    }
    setIsLoading(false);
  };

  return (
    <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: '896px' }}>
        {/* YENİ: Başlığın font boyutu '3rem' (48px) olarak küçültüldü */}
        <h1 style={{ fontSize: '3rem', marginBottom: '1.5rem', textAlign: 'center', letterSpacing: '0.1em' }}>
          STORYTELLING
        </h1>
        
        <div ref={storyContainerRef} className="story-box">
          {history.map((msg, index) => (
            <div key={index} className="fade-in" style={{ marginBottom: '1.5rem' }}>
              {msg.role === 'assistant' ? (
                <p style={{ whiteSpace: 'pre-wrap', fontSize: '1.125rem' }}>
                  <Typewriter words={[msg.content]} loop={1} cursor cursorStyle='_' typeSpeed={20} />
                </p>
              ) : (
                <p className="user-text" style={{ fontSize: '1.125rem' }}>{`> ${msg.content}`}</p>
              )}
            </div>
          ))}
          {isLoading && <p style={{ color: '#6b7280' }}>...</p>}
        </div>

        <form onSubmit={handleSubmit} className="input-prompt" style={{ marginTop: '1.5rem' }}>
          <span style={{ fontSize: '1.5rem', marginRight: '0.75rem' }}>&gt;</span>
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="story-input"
            placeholder={isLoading ? "" : "Hikayeye yön ver..."}
            disabled={isLoading}
            autoFocus
          />
        </form>
      </div>
    </div>
  );
}