'use client';

import { useState, useEffect, useCallback, FormEvent, useRef } from 'react';
import { Typewriter } from 'react-simple-typewriter';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import type { Session, User } from '@supabase/auth-helpers-nextjs';
import Sidebar from '@/components/Sidebar';
import GameModeSelectionModal from '@/components/GameModeSelectionModal';
import NoteModal from '@/components/NoteModal';
import InventoryPanel from '@/components/InventoryPanel';
import CharactersPanel, { NPC } from '@/components/CharactersPanel';
import GlobalChat from '@/components/GlobalChat';
import PrivateChat from '@/components/PrivateChat';
import Portal from '@/components/Portal';
import DndGameCreationModal from '@/components/DndGameCreationModal';
import Lobby from '@/components/Lobby';
import DndOocChat from '@/components/DndOocChat';

interface Message { role: 'user' | 'assistant'; content: string; user_id?: string; }
interface Story { id: number; created_at: string; history: Message[] | null; user_id: string; title?: string; game_mode?: string; custom_prompt?: string; notes?: string; difficulty?: string; inventory?: string[] | null; npcs?: NPC[] | null; legend_name?: string; is_multiplayer?: boolean; host_id?: string; current_player_turn_id?: string; turn_order?: string[]; status?: string; }
interface GameParticipant { id: string; game_id: number; user_id: string; character_name: string | null; ai_role?: string; profiles: { username: string; chat_color: string } | null; }

const TYPE_SPEED = 20;
const STORY_LIMIT = 10;
const ANIMATION_DURATION = 500;

const parseResponseForItems = (message: string): { cleanedMessage: string, newItems: string[] } => {
  const itemRegex = /\[ITEM_ACQUIRED:([^\]]+)\]/g;
  const newItems: string[] = [];
  const matches = message.matchAll(itemRegex);
  for (const match of matches) {
    newItems.push(match[1].replace(/_/g, ' '));
  }
  const cleanedMessage = message.replace(itemRegex, "").trim();
  return { cleanedMessage, newItems };
};

const parseResponseForCharacters = (message: string): { cleanedMessage: string, updatedNpcs: NPC[] } => {
  const characterRegex = /\[CHARACTER_UPDATE:({.*?)\]/g;
  const updatedNpcs: NPC[] = [];
  const matches = message.matchAll(characterRegex);
  for (const match of matches) {
    try {
      const jsonString = match[1];
      const npcData = JSON.parse(jsonString);
      if (npcData.name && npcData.description && npcData.state) {
        updatedNpcs.push(npcData);
      }
    } catch (e) {
      console.error("Karakter JSON'u parse edilemedi:", match[1], e);
    }
  }
  const cleanedMessage = message.replace(characterRegex, "").trim();
  return { cleanedMessage, updatedNpcs };
};

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
  const [isDndCreationModalOpen, setIsDndCreationModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [currentNotes, setCurrentNotes] = useState("");
  const [inventory, setInventory] = useState<string[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [isInventoryOpen, setIsInventoryOpen] = useState(true);
  const [isCharactersOpen, setIsCharactersOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isOocChatOpen, setIsOocChatOpen] = useState(false);
  const [activePrivateChats, setActivePrivateChats] = useState<Map<string, { id: string; username: string }>>(new Map());
  const [closingWindows, setClosingWindows] = useState({
    globalChat: false,
    privateChats: new Set<string>(),
    gameModeModal: false,
    noteModal: false,
    dndCreationModal: false,
  });

  const [isMobile, setIsMobile] = useState(false);
  const [isMultiplayerGame, setIsMultiplayerGame] = useState(false);
  const [gameParticipants, setGameParticipants] = useState<GameParticipant[]>([]);
  const [currentPlayerTurn, setCurrentPlayerTurn] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', checkMobile);
    checkMobile();
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchStories = useCallback(async (user: User) => {
    const { data: allGames, error } = await supabase.rpc('get_all_games_for_user', { target_user_id: user.id });
    if (error) {
      console.error('Oyunlar çekilirken hata:', error.message);
    } else if (allGames) {
      setStories(allGames.sort((a: Story, b: Story) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    }
  }, [supabase]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) { router.push('/login'); }
      else { setSession(session); fetchStories(session.user); }
    });
    return () => subscription.unsubscribe();
  }, [supabase, router, fetchStories]);

  useEffect(() => {
    if (!session?.user) return;

    const channel = supabase.channel('story-updates');

    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_participants', filter: `user_id=eq.${session.user.id}` }, () => {
      fetchStories(session.user);
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, supabase, fetchStories]);

  useEffect(() => {
    if (!activeStory) {
      setHistory([]);
      setInventory([]);
      setNpcs([]);
      setIsMultiplayerGame(false);
      setGameParticipants([]);
      setCurrentPlayerTurn(null);
      return;
    }

    setIsMultiplayerGame(!!activeStory.is_multiplayer);
    if (activeStory.is_multiplayer) {
      const fetchParticipants = async () => {
        const { data, error } = await supabase.from('game_participants').select('*, profiles(username, chat_color)').eq('game_id', activeStory.id);
        if (error) {
          console.error('Katılımcılar çekilirken hata:', error.message);
        } else if (data) {
          setGameParticipants(data as GameParticipant[]);
          setCurrentPlayerTurn(activeStory.current_player_turn_id || null);
        }
      };
      fetchParticipants();
    } else {
      setGameParticipants([]);
      setCurrentPlayerTurn(null);
    }

    const currentHistory = (activeStory.history as Message[]) || [];
    setHistory(currentHistory);
    setCurrentNotes(activeStory.notes || "");
    setInventory(activeStory.inventory || []);
    setNpcs((activeStory.npcs as NPC[]) || []);
    setIsTyping(false);

    if (!activeStory.is_multiplayer && currentHistory.length === 0 && activeStory.id) {
      setIsLoading(true);
      fetch('/api/story', {
        method: 'POST',
        body: JSON.stringify({
          history: [],
          game_mode: activeStory.game_mode,
          difficulty: activeStory.difficulty,
          customPrompt: activeStory.custom_prompt,
          inventory: activeStory.inventory || [],
          npcs: activeStory.npcs || [],
          legend_name: activeStory.legend_name
        }),
        headers: { 'Content-Type': 'application/json' }
      })
        .then(res => res.json())
        .then(async (storyData) => {
          if (!storyData.message) return;
          const itemParseResult = parseResponseForItems(storyData.message);
          const finalParseResult = parseResponseForCharacters(itemParseResult.cleanedMessage);
          const { cleanedMessage, updatedNpcs } = finalParseResult;
          const { newItems } = itemParseResult;
          const initialHistory: Message[] = [{ role: 'assistant', content: cleanedMessage }];
          const initialInventory = [...(activeStory.inventory || []), ...newItems];
          const initialNpcs = [...((activeStory.npcs as NPC[]) || []), ...updatedNpcs];
          const titleResponse = await fetch('/api/generate-title', { method: 'POST', body: JSON.stringify({ storyText: cleanedMessage }), headers: { 'Content-Type': 'application/json' } });
          const { title } = await titleResponse.json();
          const finalTitle = title || activeStory.title || "İsimsiz Macera";
          const { data: updatedStory } = await supabase.from('games').update({ history: initialHistory, title: finalTitle, inventory: initialInventory, npcs: initialNpcs }).eq('id', activeStory.id).select().single();
          if (updatedStory) {
            const finalUpdatedStory = updatedStory as Story;
            setStories(current => current.map(s => s.id === activeStory.id ? finalUpdatedStory : s));
            setActiveStory(finalUpdatedStory);
            setHistory(finalUpdatedStory.history || []);
            setInventory(finalUpdatedStory.inventory || []);
            setNpcs(finalUpdatedStory.npcs || []);
            setIsTyping(true);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [activeStory, supabase]);
  
  useEffect(() => {
    if (!activeStory?.is_multiplayer || !activeStory.id) return;

    const channelName = `game-${activeStory.id}`;
    const channel = supabase.channel(channelName);
    
    // DÜZELTME: Kullanılmayan değişkenin başına '_' eklendi
    const _gameUpdateSubscription = channel.on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'games', filter: `id=eq.${activeStory.id}` }, 
        (payload) => {
            const newGameData = payload.new as Story;
            if (newGameData) {
                setActiveStory(currentGame => ({ ...currentGame, ...newGameData }));
                setHistory((newGameData.history as Message[]) || []);
                setInventory(newGameData.inventory || []);
                setNpcs((newGameData.npcs as NPC[]) || []);
                setCurrentNotes(newGameData.notes || "");
                setCurrentPlayerTurn(newGameData.current_player_turn_id || null);
                
                const lastMessage = newGameData.history ? newGameData.history[newGameData.history.length - 1] : null;
                if (lastMessage && lastMessage.role === 'assistant') {
                    setIsTyping(true);
                }
            }
        }
    ).subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            console.log(`'${channelName}' kanalına başarıyla abone olundu.`);
        }
    });

    return () => {
        console.log(`'${channelName}' kanalından abonelik kaldırılıyor.`);
        supabase.removeChannel(channel);
    };

  // DÜZELTME: Eksik bağımlılık eklendi
  }, [activeStory?.id, activeStory?.is_multiplayer, supabase]);

  const handleStartStory = useCallback(async (mode: string, difficulty: string, customPrompt?: string, legendName?: string) => {
    if (!session?.user || stories.length >= STORY_LIMIT) return;
    setIsGameModeModalOpen(false);
    setIsLoading(true);
    const { data: newStoryData } = await supabase.from('games').insert({
      user_id: session.user.id,
      title: legendName || "Yeni Macera...",
      game_mode: mode,
      difficulty: difficulty,
      custom_prompt: customPrompt,
      legend_name: legendName,
      is_multiplayer: false,
      inventory: [],
      npcs: []
    }).select().single();
    if (newStoryData) {
      setStories(current => [newStoryData as Story, ...current]);
      setActiveStory(newStoryData as Story);
    }
    setIsLoading(false);
  }, [session, stories, supabase]);

  // DÜZELTME: DnD VS modu kaldırıldığı için fonksiyon sadeleştirildi
  const handleStartDndGame = async (difficulty: string, customPrompt: string, selectedUsers: string[], characterName: string) => {
    if (!session?.user) return;
    setIsDndCreationModalOpen(false);
    setIsLoading(true);

    const playerIds = [session.user.id, ...selectedUsers];

    const response = await fetch('/api/dnd/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_mode: 'dnd', // Artık sabit olarak 'dnd' gönderiyoruz
        difficulty,
        custom_prompt: customPrompt,
        player_ids: playerIds,
        host_character_name: characterName,
        ai_role_id: null // Artık bu rol yok
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Oyun oluşturma hatası:", errorData.error);
      alert(`Oyun oluşturulamadı: ${errorData.error}`);
      setIsLoading(false);
      return;
    }

    const { game } = await response.json();
    if (game) {
      setStories(current => [game as Story, ...current]);
      setActiveStory(game as Story);
    }
    setIsLoading(false);
  };

  const handleJoinDndGame = async (gameId: number, characterName: string) => {
    if (!session?.user) return;

    const response = await fetch('/api/dnd/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, characterName }),
    });

    if (response.ok) {
      const { data } = await supabase.from('games').select('*').eq('id', gameId).single();
      if (data) {
        setActiveStory(data as Story);
      }
    }
  };

  const handleStartMultiplayerGame = async (gameId: number) => {
    if (!session?.user || activeStory?.host_id !== session.user.id) return;
    setIsLoading(true);
    const response = await fetch('/api/dnd/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId }),
    });
    if (response.ok) {
      const { game } = await response.json();
      if (game) {
        setActiveStory(game);
      }
    }
    setIsLoading(false);
  };

  const handleSaveNotes = async (newNotes: string) => {
    if (!activeStory) return;
    const { data } = await supabase.from('games').update({ notes: newNotes }).eq('id', activeStory.id).select().single();
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
    if (!session || !session.user || !userInput.trim() || isLoading || isTyping || !activeStory) return;

    const newUserMessage: Message = { role: 'user', content: userInput, user_id: session.user.id };
    setHistory(prevHistory => [...prevHistory, newUserMessage]);
    setUserInput('');
    setIsLoading(true);

    const endpoint = activeStory.is_multiplayer ? '/api/dnd/submit-turn' : '/api/story';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          history: [...history, newUserMessage],
          game_mode: activeStory.game_mode,
          difficulty: activeStory.difficulty,
          customPrompt: activeStory.custom_prompt,
          inventory: inventory,
          npcs: npcs,
          legend_name: activeStory.legend_name,
          game_id: activeStory.id,
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(`Oyun işlemi başarısız: ${errorData.error}`);
        setHistory(history);
        setIsLoading(false);
        return;
      }

      if (!activeStory.is_multiplayer) {
        const data = await response.json();
        if (data.message) {
          const itemParseResult = parseResponseForItems(data.message);
          const finalParseResult = parseResponseForCharacters(itemParseResult.cleanedMessage);
          const { cleanedMessage, updatedNpcs } = finalParseResult;
          const { newItems } = itemParseResult;
          const finalInventory = [...inventory];
          const finalNpcs = [...npcs];
          if (newItems.length > 0) {
            const uniqueNewItems = newItems.filter(item => !finalInventory.includes(item));
            if (uniqueNewItems.length > 0) { finalInventory.push(...uniqueNewItems); }
          }
          if (updatedNpcs.length > 0) {
            updatedNpcs.forEach(updatedNpc => {
              const existingNpcIndex = finalNpcs.findIndex(npc => npc.name === updatedNpc.name);
              if (existingNpcIndex !== -1) { finalNpcs[existingNpcIndex] = updatedNpc; }
              else { finalNpcs.push(updatedNpc); }
            });
          }
          const finalHistory: Message[] = [...history, newUserMessage, { role: 'assistant', content: cleanedMessage }];
          const { data: updatedStory } = await supabase.from('games').update({ history: finalHistory, inventory: finalInventory, npcs: finalNpcs }).eq('id', activeStory.id).select().single();
          if (updatedStory) {
            const finalUpdatedStory = updatedStory as Story;
            setStories(current => current.map(s => s.id === activeStory.id ? finalUpdatedStory : s));
            setActiveStory(finalUpdatedStory);
            setHistory(finalUpdatedStory.history || []);
            setInventory(finalUpdatedStory.inventory || []);
            setNpcs(finalUpdatedStory.npcs || []);
            setIsTyping(true);
          }
        } else {
          setIsTyping(false);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleGameModeModalClose = () => {
    setClosingWindows(prev => ({ ...prev, gameModeModal: true }));
    setTimeout(() => {
      setIsGameModeModalOpen(false);
      setClosingWindows(prev => ({ ...prev, gameModeModal: false }));
    }, ANIMATION_DURATION);
  };

  const handleDndCreationModalClose = () => {
    setClosingWindows(prev => ({ ...prev, dndCreationModal: true }));
    setTimeout(() => {
      setIsDndCreationModalOpen(false);
      setClosingWindows(prev => ({ ...prev, dndCreationModal: false }));
    }, ANIMATION_DURATION);
  };

  const handleNoteModalClose = () => {
    setClosingWindows(prev => ({ ...prev, noteModal: true }));
    setTimeout(() => {
      setIsNoteModalOpen(false);
      setClosingWindows(prev => ({ ...prev, noteModal: false }));
    }, ANIMATION_DURATION);
  };

  const handleChatClose = () => {
    setClosingWindows(prev => ({ ...prev, globalChat: true }));
    setTimeout(() => {
      setIsChatOpen(false);
      setClosingWindows(prev => ({ ...prev, globalChat: false }));
    }, ANIMATION_DURATION);
  };

  const handleStartPrivateChat = async (userId: string, username: string) => {
    if (userId === session?.user.id) return;
    for (const user of activePrivateChats.values()) {
      if (user.id === userId) return;
    }
    const response = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ other_user_id: userId }),
    });
    
    if (!response.ok) {
        const data = await response.json();
        alert(`Sohbet başlatılamadı: ${data.error}`);
        return;
    }
    
    const { conversation_id } = await response.json();
    if (conversation_id) {
      setActivePrivateChats(prev => new Map(prev).set(conversation_id, { id: userId, username: username }));
    }
  };

  const handleClosePrivateChat = (conversationId: string) => {
    setClosingWindows(prev => ({ ...prev, privateChats: new Set(prev.privateChats).add(conversationId) }));
    setTimeout(() => {
      setActivePrivateChats(prev => {
        const newMap = new Map(prev);
        newMap.delete(conversationId);
        return newMap;
      });
      setClosingWindows(prev => {
        const newSet = new Set(prev.privateChats);
        newSet.delete(conversationId);
        return { ...prev, privateChats: newSet };
      });
    }, ANIMATION_DURATION);
  };

  const handleDeleteConversation = async (conversationId: string) => {
    const response = await fetch(`/api/conversations/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: conversationId }),
    });

    if (response.ok) {
      handleClosePrivateChat(conversationId);
    } else {
      console.error("Sohbet silinemedi.");
      alert("Sohbet silinirken bir hata oluştu.");
    }
  };

  useEffect(() => {
    storyContainerRef.current?.scrollTo(0, storyContainerRef.current.scrollHeight);
    if (!isLoading && !isTyping) inputRef.current?.focus();
  }, [history, isLoading, isTyping]);

  if (!session) return <div>Yönlendiriliyor...</div>;

  const renderGameContent = () => {
    if (activeStory?.is_multiplayer) {
      if (activeStory.status === 'pending') {
        const myCharacterName = gameParticipants.find(p => p.user_id === session?.user.id)?.character_name;
        return <Lobby
          gameId={activeStory?.id}
          participants={gameParticipants}
          session={session}
          onJoin={handleJoinDndGame}
          isHost={activeStory?.host_id === session?.user.id}
          myCharacterName={myCharacterName}
          gameStatus={activeStory.status}
          onStartMultiplayerGame={handleStartMultiplayerGame}
        />;
      }
    }

    return (
      <div className="game-wrapper">
        <div ref={storyContainerRef} className="story-box">
          {activeStory?.is_multiplayer && activeStory.status === 'in_progress' && (
            <div style={{ textAlign: 'center', marginBottom: '1rem', color: '#fff' }}>
              --- Sıra: {gameParticipants.find(p => p.user_id === currentPlayerTurn)?.character_name || 'Yapay Zeka'} ---
            </div>
          )}
          {isLoading && history.length === 0 && <p style={{ textAlign: 'center' }}>Yeni macera oluşturuluyor...</p>}
          {!activeStory && !isLoading && <div><p>Başlamak için yeni bir hikaye oluşturun veya birini seçin.</p></div>}
          {history.map((msg, index) => {
            const isLastMessage = index === history.length - 1;

            const sender = activeStory?.is_multiplayer
              ? gameParticipants.find(p => p.user_id === msg.user_id)
              : null;

            const displayName = sender?.character_name || sender?.profiles?.username || 'Siz';
            const displayColor = sender?.profiles?.chat_color || 'inherit';

            const messageStyle = msg.role === 'user' ? { color: displayColor } : {};

            return (
              <div key={`${index}-${msg.content?.slice(0, 10)}`} className="fade-in" style={{ marginBottom: '1.5rem' }}>
                {msg.role === 'user' ? (
                  <p className="story-text user-text">
                    <strong style={messageStyle}>{displayName}:</strong> {msg.content}
                  </p>
                ) : isLastMessage && isTyping ? (
                  <p className="story-text">
                    <Typewriter words={[msg.content]} loop={1} cursor cursorStyle='_' typeSpeed={TYPE_SPEED} onLoopDone={() => setIsTyping(false)} />
                  </p>
                ) : (
                  <p className="story-text">{msg.content}</p>
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
            placeholder={!activeStory ? "Önce bir hikaye seç..." : (isLoading || isTyping ? "..." : (activeStory?.is_multiplayer && activeStory.current_player_turn_id !== session?.user.id ? "Sıranı bekle..." : "Ne yapıyorsun?"))}
            disabled={!activeStory || isLoading || isTyping || (activeStory?.is_multiplayer && activeStory.current_player_turn_id !== session?.user.id)}
            autoFocus
          />
        </form>
      </div>
    );
  };

  return (
    <>
      <div className="layout-wrapper">
        <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>
        <button className="hamburger-button" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>☰</button>
        <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <Sidebar
            stories={stories}
            onNewStory={() => setIsGameModeModalOpen(true)}
            onSelectStory={handleSelectStory}
            onDeleteStory={handleDeleteStory}
            onLogout={handleLogout}
            storyLimit={STORY_LIMIT}
            activeStoryId={activeStory?.id ?? null}
            session={session}
            onChatToggle={() => setIsChatOpen(true)}
          />
        </div>
        <div className="main-layout">
          <header className="header">
            <div style={{ flex: 1 }}></div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h1 className="title">STORYTELLING</h1>
              <p className="game-mode-subtitle">{activeStory ? (activeStory.game_mode?.replace(/_/g, ' ') || 'classic') : ''}</p>
            </div>
            <div style={{ flex: 1 }}></div>
          </header>
          <main className="main-content">
            {activeStory && <button className="notes-button" onClick={() => setIsNoteModalOpen(true)}>Not Defteri</button>}
            {activeStory?.is_multiplayer && (
              <button
                className="notes-button ooc-chat-button"
                onClick={() => setIsOocChatOpen(true)}
              >
                OOC Chat
              </button>
            )}
            <CharactersPanel
              npcs={npcs}
              participants={isMultiplayerGame ? gameParticipants : []}
              currentUserId={session?.user.id}
              isOpen={isCharactersOpen}
              onToggle={() => setIsCharactersOpen(!isCharactersOpen)}
            />
            {(activeStory?.game_mode === 'prison_escape' || activeStory?.is_multiplayer) && (
              <InventoryPanel items={inventory} isOpen={isInventoryOpen} onToggle={() => setIsInventoryOpen(!isInventoryOpen)} />
            )}
            {renderGameContent()}
          </main>
        </div>
      </div>

      <Portal>
        {isGameModeModalOpen && <GameModeSelectionModal onStartStory={handleStartStory} onStartDnd={() => { handleGameModeModalClose(); setIsDndCreationModalOpen(true); }} onClose={handleGameModeModalClose} className={closingWindows.gameModeModal ? 'fade-out' : 'fade-in'} />}
        {isDndCreationModalOpen && <DndGameCreationModal session={session} onStartGame={handleStartDndGame} onClose={handleDndCreationModalClose} className={closingWindows.dndCreationModal ? 'fade-out' : 'fade-in'} />}
        {isNoteModalOpen && <NoteModal initialNotes={currentNotes} onSave={handleSaveNotes} onClose={handleNoteModalClose} className={closingWindows.noteModal ? 'fade-out' : 'fade-in'} />}
        {isChatOpen && (
          <GlobalChat
            session={session}
            onClose={handleChatClose}
            onStartPrivateChat={handleStartPrivateChat}
            className={`${closingWindows.globalChat ? 'fade-out' : 'fade-in'} ${isMobile ? 'full-screen-modal' : ''}`}
          />
        )}
        {Array.from(activePrivateChats.entries()).map(([conversationId, otherUser]) => (
          <PrivateChat
            key={conversationId}
            session={session}
            conversationId={conversationId}
            otherUser={otherUser}
            onClose={() => handleClosePrivateChat(conversationId)}
            onDelete={() => handleDeleteConversation(conversationId)}
            className={`${closingWindows.privateChats.has(conversationId) ? 'fade-out' : 'fade-in'} ${isMobile ? 'full-screen-modal' : ''}`}
          />
        ))}
        {activeStory?.is_multiplayer && isOocChatOpen && (
          <DndOocChat
            gameId={activeStory.id.toString()}
            onClose={() => setIsOocChatOpen(false)}
          />
        )}
      </Portal>
    </>
  );
}