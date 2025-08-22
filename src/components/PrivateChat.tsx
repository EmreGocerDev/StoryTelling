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
  profiles: { username: string; chat_color: string } | null;
}

interface Props {
  session: Session;
  conversationId: string;
  otherUser: { id: string; username: string };
  onClose: () => void;
  onDelete: () => void;
  className?: string;
}

const PrivateChat: React.FC<Props> = ({ session, conversationId, otherUser, onClose, onDelete, className }) => {
  const supabase = createClientComponentClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  useEffect(() => {
    // Başlangıçta özel sohbetin geçmişini çek
    const fetchMessages = async () => {
        const { data } = await supabase.from('private_messages')
            .select('*, profiles:user_id(username, chat_color)')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });
        if (data) setMessages(data as ChatMessage[]);
    }
    fetchMessages();

    // Bu sohbete ait yeni mesajları dinle
    const channel = supabase.channel(`private-chat-${conversationId}`);
    channel.on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'private_messages',
        filter: `conversation_id=eq.${conversationId}`
    }, async (payload) => {
        const newMessage = payload.new as ChatMessage;
        const { data: profileData } = await supabase.from('profiles').select('username, chat_color').eq('id', newMessage.user_id).single();
        setMessages(prev => [...prev, { ...newMessage, profiles: profileData as { username: string; chat_color: string } | null }]);
    }).subscribe();

    // Component kaldırıldığında kanaldan ayrıl
    return () => {
        supabase.removeChannel(channel);
    }
  }, [conversationId, supabase]);

  // Özel mesaj gönderme fonksiyonu
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const tempInput = input;
    setInput('');
    // Mesajı doğrudan Supabase'e kaydediyoruz, RLS kuralları güvenliği sağlıyor
    await supabase.from('private_messages').insert({
        conversation_id: conversationId,
        user_id: session.user.id,
        content: tempInput
    });
  };

  // Sohbeti kalıcı olarak silme fonksiyonu
  const handleDelete = () => {
    if (window.confirm(`${otherUser.username} ile olan tüm sohbet geçmişini kalıcı olarak silmek istediğinizden emin misiniz?`)) {
      onDelete();
    }
  };
  
  // Mesajın stilini dinamik olarak oluşturan fonksiyon
  const getMessageStyle = (msg: ChatMessage) => {
    return { color: msg.profiles?.chat_color || '#FFFFFF' };
  };

  return (
    <div className={`private-chat-container ${className || ''}`}>
      <div className="chat-header">
        <h4>{otherUser.username} ile Sohbet</h4>
        <div className="chat-header-buttons">
          <button onClick={handleDelete} className="chat-delete-button" title="Sohbeti Sil">Temizle</button>
          <button onClick={onClose} className="chat-close-button">X</button>
        </div>
      </div>
      <div className="chat-messages-area">
        {messages.map(msg => (
          <div key={msg.id} className={`chat-message-item ${msg.user_id === session.user.id ? 'sent' : 'received'}`}>
            <strong style={getMessageStyle(msg)}>
              {msg.profiles?.username || 'Bilinmeyen'}: 
            </strong>
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