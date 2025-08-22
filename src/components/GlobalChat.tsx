'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import type { Session } from '@supabase/auth-helpers-nextjs';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Tipleri tanımlayalım
interface ChatMessage {
  id: string;
  created_at: string;
  content: string;
  user_id: string;
  profiles: { username: string } | null;
}
interface OnlineUser {
  user_id: string;
  username: string;
}
interface SupabasePresence {
  key: string;
  username: string;
  [key: string]: any;
}
interface PresenceState {
  [key: string]: SupabasePresence[];
}
interface Props {
  session: Session | null;
  onClose: () => void;
  onStartPrivateChat: (userId: string, username: string) => void;
}

const GlobalChat: React.FC<Props> = ({ session, onClose, onStartPrivateChat }) => {
  const supabase = createClientComponentClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!session) return;

    // 1. Başlangıçta son 50 mesajı çek
    const fetchInitialMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, profiles(username)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        console.error("Mesaj geçmişi çekilirken hata:", error);
        return;
      }
      if (data) setMessages(data.reverse());
    };
    fetchInitialMessages();

    const channel = supabase.channel('global-chat', {
      config: {
        presence: {
          key: session.user.id,
        },
      },
    });

    // 2. Yeni mesajları dinle
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, 
      async (payload) => {
        const newMessage = payload.new as ChatMessage;
        const { data: profileData } = await supabase.from('profiles').select('username').eq('id', newMessage.user_id).single();
        setMessages(prev => [...prev.slice(-100), { ...newMessage, profiles: profileData }]);
      }
    );

    // 3. Çevrimiçi kullanıcıları dinle ve listeyi güncelle
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState: PresenceState = channel.presenceState();
      console.log("DEBUG: Ham Presence State:", presenceState); // Hata ayıklama için
      
      const users = Object.keys(presenceState).map(presenceId => {
        const pres = presenceState[presenceId][0] as SupabasePresence;
        return { user_id: pres.key, username: pres.username };
      })
      .filter((user, index, self) => 
        user.user_id && user.username && index === self.findIndex((u) => u.user_id === user.user_id)
      );
      
      console.log("DEBUG: İşlenmiş Kullanıcı Listesi:", users); // Hata ayıklama için
      setOnlineUsers(users);
    });

    // 4. Kanala abone ol ve kendini 'çevrimiçi' olarak bildir
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log('DEBUG: Kanala abone olundu.');
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', session.user.id).single();
        const username = profile?.username || session.user.email?.split('@')[0] || `kullanici-${session.user.id.substring(0, 5)}`;
        
        if (!profile || !profile.username) {
            console.log("DEBUG: Profil bulunamadı, oluşturuluyor...");
            const { error: upsertError } = await supabase.from('profiles').upsert({ id: session.user.id, username: username });
            if(upsertError) console.error("DEBUG: Profil oluşturma hatası:", upsertError);
        }
        
        console.log(`DEBUG: Kanala '${username}' olarak katılım bildiriliyor...`);
        const trackStatus = await channel.track({ username: username });
        console.log('DEBUG: Track status:', trackStatus);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, supabase]);
  
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
  };

  const handleClearChat = async () => {
    if (window.confirm("Global sohbeti temizlemek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
      const response = await fetch('/api/chat/clear', { method: 'POST' });
      if(response.ok) {
        setMessages([]);
      }
    }
  };

  return (
    <div className="global-chat-container">
      <div className="chat-header">
        <h4>Global Sohbet</h4>
        <div>
          <button onClick={handleClearChat} className="chat-clear-button">Temizle</button>
          <button onClick={onClose} className="chat-close-button">X</button>
        </div>
      </div>
      <div className="chat-body">
        <div className="chat-messages-area">
            {messages.map(msg => (
                <div key={msg.id} className="chat-message-item">
                    <strong>{msg.profiles?.username || 'Bilinmeyen'}: </strong>
                    <span>{msg.content}</span>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
        <div className="chat-online-users-area">
          <h5>Çevrimiçi ({onlineUsers.length})</h5>
          <ul>
            {onlineUsers.map(user => (
              <li 
                key={user.user_id} 
                onClick={() => user.user_id !== session?.user.id && onStartPrivateChat(user.user_id, user.username)}
                className={user.user_id === session?.user.id ? 'me' : 'other'}
                title={user.user_id !== session?.user.id ? `${user.username} ile özel sohbet başlat` : ''}
              >
                {user.username} {user.user_id === session?.user.id ? '(Siz)' : ''}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input 
          type="text" 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Mesajını yaz..."
        />
        <button type="submit">Gönder</button>
      </form>
    </div>
  );
};

export default GlobalChat;