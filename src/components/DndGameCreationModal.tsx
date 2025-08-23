'use client';

import { useState, useEffect } from 'react';
import type { Session } from '@supabase/auth-helpers-nextjs';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Props {
  session: Session | null;
  onStartGame: (mode: 'dnd' | 'dnd_vs', difficulty: string, customPrompt: string, selectedPlayers: string[], characterName: string, aiRoleId?: string) => void;
  onClose: () => void;
  className?: string;
}

const DndGameCreationModal: React.FC<Props> = ({ session, onStartGame, onClose, className }) => {
  const supabase = createClientComponentClient();
  const [gameMode, setGameMode] = useState<'dnd' | 'dnd_vs'>('dnd');
  const [difficulty, setDifficulty] = useState('normal');
  const [customPrompt, setCustomPrompt] = useState('');
  const [allUsers, setAllUsers] = useState<{ id: string; username: string }[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [characterName, setCharacterName] = useState('');
  const [aiRoleId, setAiRoleId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('id, username');
      if (data) {
        setAllUsers(data.filter(u => u.id !== session?.user.id));
      }
    };
    fetchUsers();
  }, [session, supabase]);

  const handlePlayerToggle = (userId: string) => {
    setSelectedUsers(prev => {
      const newSelection = prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId];
      if (aiRoleId && !newSelection.includes(aiRoleId)) {
        setAiRoleId(undefined);
      }
      return newSelection;
    });
  };

  const handleStart = () => {
    if (!characterName.trim()) {
      alert('Lütfen karakterin için bir isim belirle.');
      return;
    }
    if (gameMode === 'dnd_vs' && !aiRoleId) {
      alert('DND VS modu için bir "Canavar" oyuncu seçmelisiniz.');
      return;
    }
    setIsLoading(true);
    onStartGame(gameMode, difficulty, customPrompt, selectedUsers, characterName, aiRoleId);
  };

  const potentialAiPlayers = allUsers.filter(u => selectedUsers.includes(u.id));

  return (
    <div className={`modal-overlay ${className}`} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>DND Oyunu Başlat</h2>
        <div className="mode-selection main-modes">
          <button
            className={`mode-button ${gameMode === 'dnd' ? 'active' : ''}`}
            onClick={() => setGameMode('dnd')}
          >
            <h3>DND Klasik</h3>
            <p>Yapay zeka anlatıcıyla arkadaşlarınla birlikte bir hikaye oluştur.</p>
          </button>
          <button
            className={`mode-button ${gameMode === 'dnd_vs' ? 'active' : ''}`}
            onClick={() => setGameMode('dnd_vs')}
          >
            <h3>DND VS</h3>
            <p>Yapay zeka hakemliğinde arkadaşlarınla birbirine karşı mücadele et.</p>
          </button>
        </div>

        <hr className="modal-divider" />

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

        <label>Katılımcıları Seç:</label>
        <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #555', padding: '0.5rem' }}>
          {allUsers.length === 0 ? (
            <p>Davet edilecek başka kullanıcı yok.</p>
          ) : (
            allUsers.map(user => (
              <div key={user.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => handlePlayerToggle(user.id)}
                  />
                  {user.username}
                </label>
              </div>
            ))
          )}
        </div>

        {gameMode === 'dnd_vs' && (
          <>
            <hr className="modal-divider" />
            <label>&apos;Canavar&apos; Rolünü Oynayacak Kişiyi Seçin:</label>
            <select
              value={aiRoleId || ''}
              onChange={(e) => setAiRoleId(e.target.value || undefined)}
              disabled={potentialAiPlayers.length === 0}
              style={{ backgroundColor: 'transparent', border: '1px solid #555', color: 'white', padding: '0.5rem', width: '100%' }}
            >
              <option value="">-- Canavar Seç --</option>
              {potentialAiPlayers.map(user => (
                <option key={user.id} value={user.id}>{user.username}</option>
              ))}
            </select>
          </>
        )}

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