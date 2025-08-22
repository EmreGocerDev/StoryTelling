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
  profiles: { username: string } | null; // Bu yapı artık doğru çalışacak
}
interface OnlineUser {
  user_id: string;
  username: string;
}
interface PresenceState {
  [key: string]: { user_id: string, username: string }[];
}
interface Props {
  session: Session | null;
  onClose: () => void;
}

const GlobalChat: React.FC<Props> = ({ session, onClose }) => {
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

    // ================== GÜNCELLEME 1: İLK MESAJLARI ÇEKME ==================
    // Veritabanı ilişkisi artık doğru olduğu için bu sorgu düzgün çalışacak.
    const fetchInitialMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*, profiles(username)') // Bu join artık çalışır
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
      config: { presence: { key: session.user.id } },
    });

    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, 
      async (payload) => {
        const newMessage = payload.new as ChatMessage;
        // Yeni gelen mesajın profil bilgisini de ekleyerek state'i güncelliyoruz
        const { data: profileData } = await supabase.from('profiles').select('username').eq('id', newMessage.user_id).single();
        setMessages(prev => [...prev.slice(-100), { ...newMessage, profiles: profileData }]);
      }
    );

    // ================== GÜNCELLEME 2: ÇEVRİMİÇİ KULLANICI LİSTESİ ==================
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState: PresenceState = channel.presenceState();
      
      const users = Object.keys(presenceState).map(presenceId => {
        const pres = presenceState[presenceId][0] as any;
        return { user_id: pres.key, username: pres.username };
      })
      .filter((user, index, self) => 
        user.user_id && user.username && index === self.findIndex((u) => u.user_id === user.user_id)
      );
      setOnlineUsers(users);
    });

    // ================== GÜNCELLEME 3: KANALA ABONE OLMA VE PROFİL KONTROLÜ ==================
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const { data: profile } = await supabase.from('profiles').select('username').eq('id', session.user.id).single();
        const username = profile?.username || session.user.email?.split('@')[0] || `kullanici-${session.user.id.substring(0, 5)}`;
        
        // Kullanıcının profili veya kullanıcı adı yoksa, oluştur/güncelle
        // Bu, diğer kullanıcıların sizin adınızı görebilmesi için kritiktir.
        if (!profile || !profile.username) {
            await supabase.from('profiles').upsert({ id: session.user.id, username: username });
        }
        await channel.track({ username: username });
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
    // Mesajı Vercel'deki API rotamıza gönderiyoruz, o da veritabanına kaydediyor.
    // Realtime sayesinde bu kayıt otomatik olarak herkese yayınlanıyor.
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: tempInput }),
    });
  };

  return (
    <div className="global-chat-container">
      <div className="chat-header">
        <h4>Global Sohbet</h4>
        <button onClick={onClose} className="chat-close-button">X</button>
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
            {onlineUsers.map(user => <li key={user.user_id}>{user.username}</li>)}
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