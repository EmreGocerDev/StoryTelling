'use client';

import { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import type { Session } from '@supabase/auth-helpers-nextjs';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Tipleri tanımlayalım
interface ChatMessage {
  id: string;
  created_at: string;
  content: string;
  user_id: string;
  profiles: { username: string; chat_color: string } | null;
}
interface Profile {
  id: string;
  username: string;
  chat_color: string;
  last_read_at: string;
}
interface SupabasePresence {
  key: string;
  username: string;
}
interface PresenceState {
  [key: string]: SupabasePresence[];
}
interface Props {
  session: Session | null;
  onClose: () => void;
  onStartPrivateChat: (userId: string, username: string) => void;
  className?: string;
}

const GlobalChat: React.FC<Props> = ({ session, onClose, onStartPrivateChat, className }) => {
  const supabase = createClientComponentClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [settingsInput, setSettingsInput] = useState('');
  const [settingsColor, setSettingsColor] = useState('');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const updateLastReadAt = useCallback(async () => {
    if (session) {
      await supabase.from('profiles').update({ last_read_at: new Date().toISOString() }).eq('id', session.user.id);
    }
  }, [session, supabase]);
  
  const fetchAllUsers = useCallback(async () => {
    const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

    if (profilesData) {
        setAllUsers(profilesData as Profile[]);
        const currentUserProfile = profilesData.find(p => p.id === session?.user.id);
        if (currentUserProfile) {
            setMyProfile(currentUserProfile as Profile);
            setSettingsInput(currentUserProfile.username);
            setSettingsColor(currentUserProfile.chat_color || '#FFFFFF');
        }
    } else if (profilesError) {
        console.error("Kullanıcı profilleri çekilirken hata:", profilesError);
    }
  }, [session, supabase]);

  useEffect(() => {
    if (!session) return;
    
    const fetchInitialData = async () => {
      await fetchAllUsers();

      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*, profiles(username, chat_color)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (messagesData) setMessages(messagesData.reverse() as ChatMessage[]);
      else if (messagesError) console.error("Mesaj geçmişi çekilirken hata:", messagesError);
    };
    
    fetchInitialData();

    const channel = supabase.channel('global-chat', {
      config: {
        presence: {
          key: session.user.id,
        },
      },
    });

    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, 
      async (payload) => {
        const newMessage = payload.new as ChatMessage;
        const { data: profileData } = await supabase.from('profiles').select('username, chat_color').eq('id', newMessage.user_id).single();
        setMessages(prev => [...prev.slice(-100), { ...newMessage, profiles: profileData as { username: string; chat_color: string } | null }]);
        await fetchAllUsers();
      }
    );

    channel.on('presence', { event: 'sync' }, () => {
      const presenceState: PresenceState = channel.presenceState();
      const onlineIds = new Set<string>();
      for (const presenceId in presenceState) {
        onlineIds.add(presenceId);
      }
      setOnlineUserIds(onlineIds);
    });
    
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const { data: profile } = await supabase.from('profiles').select('username, chat_color').eq('id', session.user.id).single();
        const username = profile?.username || session.user.email?.split('@')[0] || `kullanici-${session.user.id.substring(0, 5)}`;
        if (!profile || !profile.username) {
            await supabase.from('profiles').upsert({ id: session.user.id, username: username });
        }
        await channel.track({ username: username });
      }
    });
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updateLastReadAt();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      supabase.removeChannel(channel);
      updateLastReadAt();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session, supabase, updateLastReadAt, fetchAllUsers]);
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (input.trim().length === 0) return;
    const tempInput = input;
    setInput('');
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: tempInput }),
    });
    
    updateLastReadAt();
  };

  const handleSettingsSave = async () => {
    if (!session || !myProfile) return;
    const { error } = await supabase.from('profiles').update({ username: settingsInput, chat_color: settingsColor }).eq('id', session.user.id);
    if (error) {
      console.error("Ayarlar kaydedilirken bir hata oluştu:", error);
    } else {
      setIsSettingsOpen(false);
      await fetchAllUsers();
    }
  };

  const sortedUsers = [...allUsers].sort((a, b) => {
    const aOnline = onlineUserIds.has(a.id);
    const bOnline = onlineUserIds.has(b.id);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return a.username.localeCompare(b.username);
  });
  
  const hasUnreadMessages = (userId: string, lastReadAt: string) => {
    if (!messages.length) return false;
    const latestMessage = messages[messages.length - 1];
    if (latestMessage.user_id === userId) return false;
    return new Date(lastReadAt) < new Date(latestMessage.created_at);
  };
  
  const getMessageStyle = (msg: ChatMessage) => {
    return { color: msg.profiles?.chat_color || '#FFFFFF' };
  };

  return (
    <div className={`global-chat-container ${className || ''}`}>
      <div className="chat-header">
        <h4>Global Sohbet</h4>
        <div className="chat-header-buttons">
          <button onClick={onClose} className="chat-close-button">X</button>
        </div>
      </div>
      <div className="chat-body">
        <div className="chat-messages-area">
            {messages.map(msg => (
                <div key={msg.id} className="chat-message-item">
                    <strong style={getMessageStyle(msg)}>
                      {msg.profiles?.username || 'Bilinmeyen'}: 
                    </strong>
                    <span>{msg.content}</span>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
        <div className="chat-online-users-area">
          <h5>Kişiler ({allUsers.length})</h5>
          <ul>
            {sortedUsers.map(user => (
              <li 
                key={user.id} 
                onClick={() => user.id !== session?.user.id && onStartPrivateChat(user.id, user.username)}
                className={user.id === session?.user.id ? 'me' : 'other'}
                title={user.id !== session?.user.id ? `${user.username} ile özel sohbet başlat` : ''}
              >
                <span style={{ color: user.chat_color || '#FFFFFF' }}>
                  {user.username}
                </span>
                {user.id === session?.user.id && ' (Siz)'}
                {onlineUserIds.has(user.id) ? (
                  <span style={{color: 'white'}}> ●</span>
                ) : (
                  <span style={{color: 'grey'}}> ●</span>
                )}
                {hasUnreadMessages(user.id, user.last_read_at) && <span className="chat-unread-indicator"> (!)</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="settings-input-wrapper">
        <button className="settings-icon" onClick={() => setIsSettingsOpen(!isSettingsOpen)}>
          ⚙️
        </button>
        {isSettingsOpen && (
            <div className="chat-settings-panel fade-in">
                <label htmlFor="username-input">Kullanıcı Adı:</label>
                <input 
                    id="username-input"
                    type="text" 
                    value={settingsInput}
                    onChange={(e) => setSettingsInput(e.target.value)}
                />
                <label htmlFor="color-picker">Sohbet Rengi:</label>
                <input 
                    id="color-picker"
                    type="color" 
                    value={settingsColor}
                    onChange={(e) => setSettingsColor(e.target.value)}
                />
                <button className="white-button" onClick={handleSettingsSave} style={{ marginTop: '0.5rem' }}>Kaydet</button>
            </div>
        )}
        <form onSubmit={handleSubmit} className="chat-input-form" style={{ flexGrow: 1, borderTop: 'none' }}>
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Mesajını yaz..."
            />
            <button type="submit">Gönder</button>
        </form>
      </div>
    </div>
  );
};

export default GlobalChat;