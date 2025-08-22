'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { Rnd } from 'react-rnd';
import type { Session } from '@supabase/auth-helpers-nextjs';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface ChatMessage { id: string; created_at: string; content: string; user_id: string; profiles: { username: string } | null; }
interface OnlineUser { user_id: string; username: string; }
interface SupabasePresence { key: string; username: string; }
interface PresenceState { [key: string]: SupabasePresence[]; }

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
  
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!session) return;
    const fetchInitialMessages = async () => { /* ... */ };
    fetchInitialMessages();
    const channel = supabase.channel('global-chat', { config: { presence: { key: session.user.id } } });
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => { /* ... */ });
    channel.on('presence', { event: 'sync' }, () => {
      const presenceState: PresenceState = channel.presenceState();
      const users = Object.keys(presenceState).map(presenceId => {
        const pres = presenceState[presenceId][0] as SupabasePresence;
        return { user_id: presenceId, username: pres.username };
      }).filter((user, index, self) => user.user_id && user.username && index === self.findIndex((u) => u.user_id === user.user_id));
      setOnlineUsers(users);
    });
    channel.subscribe(async (status) => { /* ... */ });
    return () => { supabase.removeChannel(channel); };
  }, [session, supabase]);
  
  const handleSubmit = async (e: FormEvent) => { /* ... */ };

  return (
    <Rnd default={{ x: 20, y: window.innerHeight - 450, width: 500, height: 400 }} minWidth={300} minHeight={250} bounds="window" dragHandleClassName="chat-header">
      <div className="global-chat-container" style={{width: '100%', height: '100%'}}>
        <div className="chat-header">
          <h4>Global Sohbet</h4>
          <div className="chat-header-buttons">
            <button onClick={onClose} className="chat-close-button">X</button>
          </div>
        </div>
        <div className="chat-body">
          <div className="chat-messages-area">
              {messages.map(msg => (<div key={msg.id} className="chat-message-item"><strong>{msg.profiles?.username || 'Bilinmeyen'}: </strong><span>{msg.content}</span></div>))}
              <div ref={messagesEndRef} />
          </div>
          <div className="chat-online-users-area">
            <h5>Çevrimiçi ({onlineUsers.length})</h5>
            <ul>
              {onlineUsers.map(user => (
                <li key={user.user_id} onClick={() => user.user_id !== session?.user.id && onStartPrivateChat(user.user_id, user.username)} className={user.user_id === session?.user.id ? 'me' : 'other'} title={user.user_id !== session?.user.id ? `${user.username} ile özel sohbet başlat` : ''}>
                  {user.username} {user.user_id === session?.user.id ? '(Siz)' : ''}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="chat-input-form">
          <input value={input} onChange={e => setInput(e.target.value)} placeholder="Mesajını yaz..." />
          <button type="submit">Gönder</button>
        </form>
      </div>
    </Rnd>
  );
};
export default GlobalChat;