'use client';

import { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { Typewriter } from 'react-simple-typewriter';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import type { Session, User } from '@supabase/auth-helpers-nextjs';
import Sidebar from '@/components/Sidebar';
import GameModeSelectionModal from '@/components/GameModeSelectionModal';
import NoteModal from '@/components/NoteModal';

// Interface ve Sabitler
interface Message { role: 'user' | 'assistant'; content: string; }
interface Story { id: number; created_at: string; history: Message[] | null; user_id: string; title?: string; game_mode?: string; custom_prompt?: string; notes?: string; difficulty?: string; }
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

  const [isGameModeModalOpen, setIsGameModeModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [currentNotes, setCurrentNotes] = useState("");
  
  const fetchStories = useCallback(async (user: User) => {
    const { data } = await supabase.from('games').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setStories(data as Story[]);
  }, [supabase]);
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) router.push('/login');
      else { setSession(session); fetchStories(session.user); }
    });
    return () => subscription.unsubscribe();
  }, [supabase, router, fetchStories]);

  useEffect(() => {
    if (!activeStory) { setHistory([]); return; }
    
    const currentHistory = (activeStory.history as Message[]) || [];
    setHistory(currentHistory);
    setCurrentNotes(activeStory.notes || "");
    setIsTyping(false);
    
    if (currentHistory.length === 0) {
      setIsLoading(true);
      fetch('/api/story', { 
        method: 'POST', 
        body: JSON.stringify({ history: [], game_mode: activeStory.game_mode, difficulty: activeStory.difficulty, custom_prompt: activeStory.custom_prompt }), 
        headers: { 'Content-Type': 'application/json' } 
      })
      .then(res => res.json())
      .then(async (storyData) => {
        if (!storyData.message) return;
        const initialHistory: Message[] = [{ role: 'assistant', content: storyData.message }];
        
        const titleResponse = await fetch('/api/generate-title', { method: 'POST', body: JSON.stringify({ storyText: storyData.message }), headers: { 'Content-Type': 'application/json' }});
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
  
  const handleStartStory = useCallback(async (mode: string, difficulty: string, prompt?: string) => {
    if (!session?.user || stories.length >= STORY_LIMIT) return;
    setIsGameModeModalOpen(false);
    setIsLoading(true);

    const { data: newStoryData } = await supabase
      .from('games')
      .insert({ user_id: session.user.id, title: "Yeni Macera...", game_mode: mode, difficulty: difficulty, custom_prompt: prompt })
      .select().single();

    if (newStoryData) {
      setStories(current => [newStoryData as Story, ...current]);
      setActiveStory(newStoryData as Story);
    }
  }, [session, stories, supabase]);

  const handleSaveNotes = async (newNotes: string) => {
    if (!activeStory) return;
    
    const { data, error } = await supabase.from('games').update({ notes: newNotes }).eq('id', activeStory.id).select().single();
    if (error) { console.error('Notları kaydederken hata:', error); return; }

    if (data) {
        const updatedStory = data as Story;
        setActiveStory(updatedStory);
        setStories(currentStories => currentStories.map(s => s.id === updatedStory.id ? updatedStory : s));
    }
    setIsNoteModalOpen(false);
  };

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
      const response = await fetch('/api/story', { 
        method: 'POST', 
        body: JSON.stringify({ history: newHistoryWithUser, game_mode: activeStory.game_mode, difficulty: activeStory.difficulty, custom_prompt: activeStory.custom_prompt }), 
        headers: { 'Content-Type': 'application/json' }
      });
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
  
  if (!session) return <div>Yönlendiriliyor...</div>;

  return (
    <>
      {isGameModeModalOpen && <GameModeSelectionModal onStartStory={handleStartStory} onClose={() => setIsGameModeModalOpen(false)} />}
      {isNoteModalOpen && <NoteModal initialNotes={currentNotes} onSave={handleSaveNotes} onClose={() => setIsNoteModalOpen(false)} />}

      <div className="layout-wrapper">
        <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
        <button className="hamburger-button" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>☰</button>
        <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <Sidebar stories={stories} onNewStory={() => setIsGameModeModalOpen(true)} onSelectStory={handleSelectStory} onDeleteStory={handleDeleteStory} onLogout={handleLogout} storyLimit={STORY_LIMIT} activeStoryId={activeStory?.id ?? null} session={session} />
        </div>

        <div className="main-layout">
          <header className="header">
            <div style={{flex: 1}}></div>
            <h1 className="title">STORYTELLING</h1>
            <div style={{flex: 1}}></div>
          </header>
          <main className="main-content">
            {activeStory && <button className="notes-button" onClick={() => setIsNoteModalOpen(true)}>Not Defteri</button>}
            <div className="game-wrapper">
              <div ref={storyContainerRef} className="story-box">
                {isLoading && history.length === 0 && <p style={{textAlign: 'center'}}>Yeni macera oluşturuluyor...</p>}
                {!activeStory && !isLoading && <div><p>Başlamak için yeni bir hikaye oluşturun veya birini seçin.</p></div>}
                
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
              </div>
              <form onSubmit={handleSubmit} className="input-prompt">
                <span>&gt;</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="story-input"
                  placeholder={!activeStory ? "Önce bir hikaye seç..." : (isLoading || isTyping ? "..." : "Ne yapıyorsun?")}
                  disabled={!activeStory || isLoading || isTyping}
                  autoFocus
                />
              </form>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}