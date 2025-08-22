'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { Rnd } from 'react-rnd';
import type { Session } from '@supabase/auth-helpers-nextjs';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface ChatMessage { id: string; created_at: string; content: string; sender_id: string; profiles: { username: string } | null; }

interface Props {
  session: Session;
  conversationId: string;
  otherUser: { id: string; username: string };
  onClose: () => void;
  onDelete: () => void;
  defaultPosition: { x: number, y: number };
}

const PrivateChat: React.FC<Props> = ({ session, conversationId, otherUser, onClose, onDelete, defaultPosition }) => {
  const supabase = createClientComponentClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const fetchMessages = async () => {
        const { data } = await supabase.from('private_messages').select('*, profiles:sender_id(username)').eq('conversation_id', conversationId).order('created_at', { ascending: true });
        if (data) setMessages(data as ChatMessage[]);
    }
    fetchMessages();

    const channel = supabase.channel(`private-chat-${conversationId}`);
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'private_messages', filter: `conversation_id=eq.${conversationId}`}, async (payload) => {
        const newMessage = payload.new as ChatMessage;
        const { data: profileData } = await supabase.from('profiles').select('username').eq('id', newMessage.sender_id).single();
        setMessages(prev => [...prev, { ...newMessage, profiles: profileData }]);
    }).subscribe();

    return () => { supabase.removeChannel(channel); }
  }, [conversationId, supabase]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const tempInput = input;
    setInput('');
    await supabase.from('private_messages').insert({ conversation_id: conversationId, sender_id: session.user.id, content: tempInput });
  };

  const handleDelete = () => {
    if (window.confirm(`${otherUser.username} ile olan tüm sohbet geçmişini kalıcı olarak silmek istediğinizden emin misiniz?`)) {
      onDelete();
    }
  };

  return (
    <Rnd default={{ x: defaultPosition.x, y: defaultPosition.y, width: 350, height: 400 }} minWidth={250} minHeight={200} bounds="window" dragHandleClassName="chat-header">
      <div className="private-chat-container" style={{width: '100%', height: '100%'}}>
        <div className="chat-header">
          <h4>{otherUser.username}</h4>
          <div className="chat-header-buttons">
            <button onClick={handleDelete} className="chat-delete-button" title="Sohbeti Sil">🗑️</button>
            <button onClick={onClose} className="chat-close-button">X</button>
          </div>
        </div>
        <div className="chat-messages-area">
          {messages.map(msg => (
            <div key={msg.id} className={`chat-message-item ${msg.sender_id === session.user.id ? 'sent' : 'received'}`}>
              <strong>{msg.profiles?.username || 'Bilinmeyen'}: </strong><span>{msg.content}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="chat-input-form"><input value={input} onChange={e => setInput(e.target.value)} placeholder="Mesajını yaz..." /><button type="submit">Gönder</button></form>
      </div>
    </Rnd>
  );
};
export default PrivateChat;