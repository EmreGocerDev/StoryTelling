'use client';

import { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
import type { Session } from '@supabase/auth-helpers-nextjs';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Tipler
interface Friend {
  user_id: string;
  username: string;
  chat_color: string;
}
interface FriendRequest {
  id: string;
  sender_id: string;
  status: 'pending' | 'accepted' | 'decline';
  profiles: { username: string; } | null;
}
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
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [activeTab, setActiveTab] = useState<'chat' | 'friends' | 'manage'>('chat');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [settingsInput, setSettingsInput] = useState('');
  const [settingsColor, setSettingsColor] = useState('');

  const fetchMyProfile = useCallback(async () => {
    if (!session) return;
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (profileData) {
      setMyProfile(profileData);
      setSettingsInput(profileData.username);
      setSettingsColor(profileData.chat_color || '#FFFFFF');
    }
  }, [session, supabase]);

  const fetchFriendsAndRequests = useCallback(async () => {
    if (!session) return;
    const { data: friendsData, error: rpcError } = await supabase.rpc('get_friends_for_user', { p_user_id: session.user.id });
    if (rpcError) console.error('RPC get_friends_for_user hatası:', rpcError);
    else if (friendsData) setFriends(friendsData);
    
    const { data: requestsData, error: requestsError } = await supabase
      .from('friend_requests')
      .select('id, sender_id, status, profiles:sender_id(username)')
      .eq('receiver_id', session.user.id)
      .eq('status', 'pending');
    
    if (requestsError) console.error('Arkadaşlık istekleri çekilirken hata:', requestsError.message);
    else if (requestsData) {
      const formattedRequests = requestsData.map(req => ({
          ...req,
          profiles: Array.isArray(req.profiles) ? req.profiles[0] : req.profiles
      }));
      setFriendRequests(formattedRequests as FriendRequest[]);
    }
  }, [session, supabase]);

  useEffect(() => {
    if (!session) return;
    
    const fetchInitialData = async () => {
      const { data: messagesData } = await supabase.from('chat_messages').select('*, profiles(username, chat_color)').order('created_at', { ascending: false }).limit(50);
      if (messagesData) setMessages(messagesData.reverse() as ChatMessage[]);
      fetchMyProfile();
      fetchFriendsAndRequests();
    };
    
    fetchInitialData();

    const chatChannel = supabase.channel('global-chat');
    chatChannel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, async (payload) => {
        const newMessage = payload.new as ChatMessage;
        const { data: profileData } = await supabase.from('profiles').select('username, chat_color').eq('id', newMessage.user_id).single();
        setMessages(prev => [...prev.slice(-100), { ...newMessage, profiles: profileData as { username: string; chat_color: string } | null }]);
      }
    ).subscribe();

    const friendChannel = supabase.channel('friend-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friends',
        filter: `or(user1_id.eq.${session.user.id},user2_id.eq.${session.user.id})`
      }, () => fetchFriendsAndRequests())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friend_requests',
        filter: `or(sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id})`
      }, () => fetchFriendsAndRequests())
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(friendChannel);
    };
  }, [session, supabase, fetchFriendsAndRequests, fetchMyProfile]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSettingsSave = async () => {
    if (!session || !myProfile) return;
    const { error } = await supabase.from('profiles').update({ username: settingsInput, chat_color: settingsColor }).eq('id', session.user.id);
    if (error) {
      console.error("Ayarlar kaydedilirken bir hata oluştu:", error);
      alert("Ayarlar kaydedilirken bir hata oluştu.");
    } else {
      setIsSettingsOpen(false);
      await fetchMyProfile();
    }
  };

  const handleAddFriend = async (receiverId: string) => {
    if (receiverId === session?.user.id) {
        alert("Kendinizi arkadaş olarak ekleyemezsiniz.");
        return;
    }
    const response = await fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiver_id: receiverId }),
    });
    if (response.ok) {
        alert('Arkadaşlık isteği gönderildi.');
    } else {
        const errorData = await response.json();
        alert(`Hata: ${errorData.error}`);
    }
  };

  const handleRequest = async (requestId: string, action: 'accept' | 'decline') => {
    const response = await fetch('/api/friends/handle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId, action: action }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      alert(`Hata: ${errorData.error}`);
    }
    fetchFriendsAndRequests();
  };
  
  const handleRemoveFriend = async (friendId: string) => {
    if (!window.confirm("Bu arkadaşı silmek istediğinizden emin misiniz?")) return;
    const response = await fetch('/api/friends/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friend_id: friendId }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        alert(`Hata: ${errorData.error}`);
    }
    fetchFriendsAndRequests();
  };
  
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
  
  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length < 3) {
        setSearchError('Arama için en az 3 karakter girmelisiniz.');
        return;
    }
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    const response = await fetch(`/api/users/search?query=${encodeURIComponent(searchQuery)}`);
    const data = await response.json();

    if(response.ok) {
        setSearchResults(data);
    } else {
        setSearchError(data.error || 'Arama sırasında bir hata oluştu.');
    }
    setIsSearching(false);
  };

  return (
    <div className={`global-chat-container ${className || ''}`}>
      <div className="chat-header">
        <h4>Sohbet</h4>
        <button onClick={onClose} className="chat-close-button">X</button>
      </div>
      <div className="chat-body">
        <div className="chat-main-panel">
          {activeTab === 'chat' && (
            <div className="chat-messages-area">
              {messages.map(msg => (
                  <div key={msg.id} className="chat-message-item">
                    <strong style={{ color: msg.profiles?.chat_color || '#fff' }}>
                      {msg.profiles?.username || 'Bilinmeyen'}: 
                    </strong>
                    <span>{msg.content}</span>
                  </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {activeTab === 'friends' && (
             <div className="chat-management-panel">
                <h4>Arkadaşlar ({friends.length})</h4>
                <ul className="chat-users-list">
                  {friends.length > 0 ? friends.map(friend => (
                     <li key={friend.user_id} className="chat-user-item">
                        <span className="chat-user-item-name" style={{ color: friend.chat_color || '#fff' }}>{friend.username}</span>
                        <div className="chat-user-item-actions">
                            <button onClick={() => onStartPrivateChat(friend.user_id, friend.username)} className="chat-toggle-button">Sohbet</button>
                            <button onClick={() => handleRemoveFriend(friend.user_id)} className="delete-button">Sil</button>
                        </div>
                     </li>
                  )) : <p className='panel-info-text'>Henüz hiç arkadaşınız yok.</p>}
                </ul>
             </div>
          )}

          {activeTab === 'manage' && (
             <div className="chat-management-panel">
                <h4>İstekler ({friendRequests.length})</h4>
                <ul className="chat-requests-list">
                   {friendRequests.length > 0 ? friendRequests.map(req => (
                     <li key={req.id} className="chat-request-item">
                        <span><strong>{req.profiles?.username}</strong> size istek gönderdi.</span>
                        <div className="chat-request-item-actions">
                           <button onClick={() => handleRequest(req.id, 'accept')} className="white-button">Kabul Et</button>
                           <button onClick={() => handleRequest(req.id, 'decline')} className="close-button">Reddet</button>
                        </div>
                     </li>
                   )) : <p className='panel-info-text'>Yeni arkadaşlık isteğiniz yok.</p>}
                </ul>
                <hr className='modal-divider' />
                <h4>Arkadaş Ekle</h4>
                <form className="chat-search-form" onSubmit={handleSearch}>
                    <input 
                        type="text" 
                        placeholder='Kullanıcı adı yazın...'
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="chat-search-input"
                    />
                    <button type="submit" disabled={isSearching} className='white-button'>
                        {isSearching ? '...' : 'Ara'}
                    </button>
                </form>
                <ul className="chat-search-results">
                    {searchError && <p className='panel-info-text error'>{searchError}</p>}
                    {searchResults.length > 0 && searchResults.map(user => (
                        <li key={user.id} className="chat-user-item">
                           <span className="chat-user-item-name">{user.username}</span>
                           <div className="chat-user-item-actions">
                              <button onClick={() => handleAddFriend(user.id)} className="chat-toggle-button">Ekle</button>
                           </div>
                        </li>
                    ))}
                </ul>
             </div>
          )}
        </div>
        
        <div className="chat-sidebar">
            <button className={`chat-sidebar-button ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>Sohbet</button>
            <button className={`chat-sidebar-button ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>Arkadaşlar</button>
            <button className={`chat-sidebar-button ${activeTab === 'manage' ? 'active' : ''}`} onClick={() => setActiveTab('manage')}>Yönet</button>
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