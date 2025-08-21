'use client';

import { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { Typewriter } from 'react-simple-typewriter';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import type { Session, User } from '@supabase/auth-helpers-nextjs';
import Sidebar from '@/components/Sidebar';
import KickChat from '@/components/KickChat'; // KickChat component'ini import et

// Interface ve Sabitler
interface Message { role: 'user' | 'assistant'; content: string; }
interface Story { id: number; created_at: string; history: Message[] | null; user_id: string; title?: string; }
const TYPE_SPEED = 20;
const STORY_LIMIT = 10;

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [stories, setStories] = useState<Story[]>([]);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [history, setHistory] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const storyContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isCreatingStoryRef = useRef(false);

  // YENİ STATE: Kick panelinin görünürlüğünü kontrol eder
  const [isKickChatVisible, setIsKickChatVisible] = useState(false);

  useEffect(() => {
    const getSessionAndStories = async (user: User) => {
      const { data } = await supabase.from('games').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setStories(data as Story[]);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) { router.push('/login'); }
      else { setSession(session); getSessionAndStories(session.user); }
    });
    return () => subscription.unsubscribe();
  }, [supabase, router]);

  useEffect(() => {
    if (!activeStory) { setHistory([]); return; }
    const currentHistory = (activeStory.history as Message[]) || [];
    setHistory(currentHistory);
    setIsTyping(false);

    if (currentHistory.length === 0) {
      setIsLoading(true);
      fetch('/api/story', { method: 'POST', body: JSON.stringify({ history: [] }), headers: { 'Content-Type': 'application/json' } })
        .then(res => res.json())
        .then(async (storyData) => {
          if (!storyData.message) return;
          const initialHistory: Message[] = [{ role: 'assistant', content: storyData.message }];
          const titleResponse = await fetch('/api/generate-title', { method: 'POST', body: JSON.stringify({ storyText: storyData.message }), headers: { 'Content-Type': 'application/json' } });
          const { title } = await titleResponse.json();
          const finalTitle = title || "İsimsiz Macera";
          const { data: updatedStory } = await supabase.from('games').update({ history: initialHistory, title: finalTitle }).eq('id', activeStory.id).select().single();
          if (updatedStory) {
            const finalUpdatedStory = updatedStory as Story;
            setStories(current => current.map(s => s.id === activeStory.id ? finalUpdatedStory : s));
            setActiveStory(finalUpdatedStory);
            setHistory(initialHistory);
            setIsTyping(true);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [activeStory, supabase]);

  const handleNewStory = useCallback(async () => {
    if (!session?.user || stories.length >= STORY_LIMIT || isCreatingStoryRef.current) return;
    isCreatingStoryRef.current = true;
    setIsSidebarOpen(false);
    const { data: newStoryData } = await supabase.from('games').insert({ user_id: session.user.id, title: "Yeni Macera Yükleniyor..." }).select().single();
    if (newStoryData) {
      setStories(current => [newStoryData as Story, ...current]);
      setActiveStory(newStoryData as Story);
    }
    isCreatingStoryRef.current = false;
  }, [session, stories, supabase]);

  const handleSelectStory = useCallback((storyId: number) => {
    const selectedStory = stories.find(s => s.id === storyId);
    if (selectedStory) setActiveStory(selectedStory);
    setIsSidebarOpen(false);
  }, [stories]);

  const handleDeleteStory = async (storyId: number) => {
    if (!window.confirm("Bu hikayeyi silmek istediğinizden emin misiniz?")) return;
    await supabase.from('games').delete().eq('id', storyId);
    setStories(stories.filter(s => s.id !== storyId));
    if (activeStory?.id === storyId) setActiveStory(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading || isTyping || !activeStory) return;
    const newHistoryWithUser: Message[] = [...history, { role: 'user', content: userInput }];
    setHistory(newHistoryWithUser);
    setUserInput('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/story', { method: 'POST', body: JSON.stringify({ history: newHistoryWithUser, gameId: activeStory.id }), headers: { 'Content-Type': 'application/json' } });
      const data = await response.json();
      if (data.message) {
        const finalHistory: Message[] = [...newHistoryWithUser, { role: 'assistant', content: data.message }];
        await supabase.from('games').update({ history: finalHistory }).eq('id', activeStory.id);
        const updatedStory = { ...activeStory, history: finalHistory };
        setStories(current => current.map(s => s.id === activeStory.id ? updatedStory : s));
        setActiveStory(updatedStory);
        setHistory(finalHistory);
        setIsTyping(true);
      } else {
        setIsTyping(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  useEffect(() => {
    storyContainerRef.current?.scrollTo(0, storyContainerRef.current.scrollHeight);
    if (!isLoading && !isTyping) inputRef.current?.focus();
  }, [history, isLoading, isTyping]);

  if (!session) {
    return <div>Yönlendiriliyor...</div>;
  }

  return (
    <div className="layout-wrapper">
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
      <button className="hamburger-button" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>☰</button>
      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <Sidebar stories={stories} onNewStory={handleNewStory} onSelectStory={handleSelectStory} onDeleteStory={handleDeleteStory} onLogout={handleLogout} storyLimit={STORY_LIMIT} activeStoryId={activeStory?.id ?? null} session={session} />
      </div>

      <div className="main-layout">
        <header className="header">
            <div style={{ flex: 1 }}></div>
            <h1 className="title">STORYTELLING</h1>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    className="white-button kick-toggle-button"
                    onClick={() => setIsKickChatVisible(!isKickChatVisible)}
                >
                    Kick Chat
                </button>
            </div>
        </header>
        <main className="main-content">
          <div className="game-wrapper">
            <div ref={storyContainerRef} className="story-box">
              {!activeStory && <div><p>Başlamak için yeni bir hikaye oluşturun veya birini seçin.</p></div>}
              {history.map((msg, index) => {
                const isLastMessage = index === history.length - 1;
                return (
                  <div key={`${index}-${msg.content?.slice(0, 10)}`} className="fade-in" style={{ marginBottom: '1.5rem' }}>
                    {msg.role === 'assistant' && isLastMessage && isTyping ? (
                      <p className="story-text">
                        <Typewriter
                          words={[msg.content]}
                          loop={1}
                          cursor
                          cursorStyle='_'
                          typeSpeed={TYPE_SPEED}
                          onLoopDone={() => setIsTyping(false)}
                        />
                      </p>
                    ) : (
                      <p className={`story-text ${msg.role === 'user' ? 'user-text' : ''}`}>
                        {msg.role === 'user' ? `> ${msg.content}` : msg.content}
                      </p>
                    )}
                  </div>
                );
              })}
              {isLoading && <p style={{ textAlign: 'center' }}>...</p>}
            </div>
            <form onSubmit={handleSubmit} className="input-prompt">
              <span>&gt;</span>
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="story-input"
                placeholder={!activeStory ? "Önce bir hikaye seçin..." : (isLoading || isTyping ? "Hala anlatıyorum..." : "Hikayeye yön ver...")}
                disabled={!activeStory || isLoading || isTyping}
                autoFocus
              />
            </form>
          </div>
        </main>
      </div>

      {isKickChatVisible && <KickChat />}
    </div>
  );
}