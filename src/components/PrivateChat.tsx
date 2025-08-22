'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import type { Session } from '@supabase/auth-helpers-nextjs';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Tipleri tanımlayalım
interface ChatMessage {
    id: string;
    created_at: string;
    content: string;
    sender_id: string;
    profiles: { username: string } | null;
}

interface Props {
  session: Session;
  conversationId: string;
  otherUser: { id: string; username: string };
  onClose: () => void;
}

const PrivateChat: React.FC<Props> = ({ session, conversationId, otherUser, onClose }) => {
  const supabase = createClientComponentClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  useEffect(() => {
    const fetchMessages = async () => {
        const { data } = await supabase.from('private_messages')
            .select('*, profiles:sender_id(username)')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
        if (data) setMessages(data as ChatMessage[]);
    }
    fetchMessages();

    const channel = supabase.channel(`private-chat-${conversationId}`);
    channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'private_messages',
        filter: `conversation_id=eq.${conversationId}`
    }, async (payload) => {
        const newMessage = payload.new as ChatMessage;
        const { data: profileData } = await supabase.from('profiles').select('username').eq('id', newMessage.sender_id).single();
        setMessages(prev => [...prev, { ...newMessage, profiles: profileData }]);
    }).subscribe();

    return () => {
        supabase.removeChannel(channel);
    }
  }, [conversationId, supabase]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const tempInput = input;
    setInput('');
    await supabase.from('private_messages').insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        content: tempInput
    });
  };

  return (
    <div className="private-chat-container">
      <div className="chat-header">
        <h4>{otherUser.username} ile Sohbet</h4>
        <button onClick={onClose} className="chat-close-button">X</button>
      </div>
      <div className="chat-messages-area">
        {messages.map(msg => (
          <div key={msg.id} className={`chat-message-item ${msg.sender_id === session.user.id ? 'sent' : 'received'}`}>
            <strong>{msg.profiles?.username || 'Bilinmeyen'}: </strong>
            <span>{msg.content}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Mesajını yaz..." 
        />
        <button type="submit">Gönder</button>
      </form>
    </div>
  );
};

export default PrivateChat;