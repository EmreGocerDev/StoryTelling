'use client';

import { useState, useEffect } from 'react';
import type { Session } from '@supabase/auth-helpers-nextjs';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Props {
  session: Session | null;
  onStartGame: (difficulty: string, customPrompt: string, selectedPlayers: string[], characterName: string) => void;
  onClose: () => void;
  className?: string;
}

const DndGameCreationModal: React.FC<Props> = ({ session, onStartGame, onClose, className }) => {
  const supabase = createClientComponentClient();
  const [difficulty, setDifficulty] = useState('normal');
  const [customPrompt, setCustomPrompt] = useState('');
  const [friends, setFriends] = useState<{ id: string; username: string }[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [characterName, setCharacterName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchFriends = async () => {
      if (!session) return;
      
      const { data, error } = await supabase.rpc('get_friends_for_user', {
        p_user_id: session.user.id
      });

      if (error) {
        console.error("Arkadaşlar çekilirken hata:", error);
        setFriends([]);
      } else if (data) {
        // RPC'den dönen 'user_id' alanını component'in beklediği 'id' olarak değiştiriyoruz.
        const friendsList = data.map((friend: { user_id: string; username: string; }) => ({
          id: friend.user_id,
          username: friend.username
        }));
        setFriends(friendsList);
      }
    };
    
    // Modal her açıldığında (veya session değiştiğinde) arkadaşları çek
    if (session) {
        fetchFriends();
    }
  }, [session, supabase]);

  const handlePlayerToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleStart = () => {
    if (!characterName.trim()) {
      alert('Lütfen karakterin için bir isim belirle.');
      return;
    }
    setIsLoading(true);
    onStartGame(difficulty, customPrompt, selectedUsers, characterName);
  };

  return (
    <div className={`modal-overlay ${className}`} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>DND Oyunu Başlat</h2>
        
        <label>Oyun Başlangıç Senaryosu (İsteğe bağlı):</label>
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Oyunun teması ve başlangıcı hakkında kısa bir açıklama yaz."
          rows={4}
        />

        <label>Karakter Adı/Unvanı:</label>
        <input
          type="text"
          value={characterName}
          onChange={(e) => setCharacterName(e.target.value)}
          placeholder="Örn: Savaşçı Geralt"
        />

        <hr className="modal-divider" />

        <label>Arkadaşlarını Davet Et:</label>
        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #555', padding: '0.5rem' }}>
          {friends.length === 0 ? (
            <p>Davet edilecek arkadaş bulunamadı.</p>
          ) : (
            friends.map((friend: { id: string; username: string }) => (
              <div key={friend.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(friend.id)}
                    onChange={() => handlePlayerToggle(friend.id)}
                  />
                  {friend.username}
                </label>
              </div>
            ))
          )}
        </div>

        <hr className="modal-divider" />

        <label>Zorluk Seviyesi:</label>
        <div className="difficulty-selection">
          <button className={`difficulty-button ${difficulty === 'easy' ? 'active' : ''}`} onClick={() => setDifficulty('easy')}>Kolay</button>
          <button className={`difficulty-button ${difficulty === 'normal' ? 'active' : ''}`} onClick={() => setDifficulty('normal')}>Normal</button>
          <button className={`difficulty-button ${difficulty === 'hard' ? 'active' : ''}`} onClick={() => setDifficulty('hard')}>Zor</button>
        </div>

        <div className="modal-actions">
          <button className="white-button" onClick={handleStart} disabled={isLoading || !characterName.trim()}>
            {isLoading ? 'Oluşturuluyor...' : 'Oyunu Başlat'}
          </button>
          <button className="close-button" onClick={onClose}>Vazgeç</button>
        </div>
      </div>
    </div>
  );
};

export default DndGameCreationModal;