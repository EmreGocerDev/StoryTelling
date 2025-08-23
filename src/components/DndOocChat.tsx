'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import type { Session } from '@supabase/auth-helpers-nextjs';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface ChatMessage {
  id: number;
  created_at: string;
  game_id: string;
  user_id: string;
  content: string;
  profiles: { username: string; chat_color: string } | null;
}

interface Props {
  gameId: string;
  onClose: () => void;
}

const DndOocChat: React.FC<Props> = ({ gameId, onClose }) => {
  const supabase = createClientComponentClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!gameId) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('game_ooc_messages')
        .select('*, profiles(username, chat_color)')
        .eq('game_id', gameId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('OOC mesaj geçmişi çekilirken hata:', error);
      } else if (data) {
        setMessages(data as ChatMessage[]);
      }
    };

    fetchMessages();

    const channel = supabase.channel(`ooc-chat-${gameId}`);

    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'game_ooc_messages',
      filter: `game_id=eq.${gameId}`
    }, async (payload) => {
      const newMessage = payload.new as ChatMessage;
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, chat_color')
        .eq('id', newMessage.user_id)
        .single();

      setMessages(prev => [...prev, { ...newMessage, profiles: profileData }]);
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, supabase]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !gameId) return;

    const tempInput = input;
    setInput('');

    await fetch('/api/dnd/ooc-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, content: tempInput }),
    });
  };

  const getMessageStyle = (msg: ChatMessage) => {
    return { color: msg.profiles?.chat_color || '#FFFFFF' };
  };

  return (
    <div className="dnd-ooc-chat-container">
      <div className="chat-header">
        <h4>Oyun Dışı Sohbet</h4>
        <button onClick={onClose} className="chat-close-button">X</button>
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
      </div>
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="OOC mesajını yaz..."
        />
        <button type="submit">Gönder</button>
      </form>
    </div>
  );
};

export default DndOocChat;