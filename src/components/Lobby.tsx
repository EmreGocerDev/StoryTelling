'use client';

import { useState } from 'react'; // Düzeltme: useState import edildi
import type { Session } from '@supabase/auth-helpers-nextjs';

interface GameParticipant {
  id: string;
  game_id: number;
  user_id: string;
  character_name: string | null;
  profiles: { username: string; chat_color: string } | null;
}

interface LobbyProps {
  gameId: number | undefined;
  participants: GameParticipant[];
  session: Session | null;
  onJoin: (gameId: number, characterName: string) => void;
  isHost: boolean;
  myCharacterName?: string | null;
  gameStatus: string | null;
  onStartMultiplayerGame: (gameId: number) => void;
}

const Lobby: React.FC<LobbyProps> = ({ gameId, participants, session, onJoin, isHost, myCharacterName, gameStatus, onStartMultiplayerGame }) => {
  const [characterNameInput, setCharacterNameInput] = useState(myCharacterName || '');

  if (!gameId || !session) return null;

  const handleJoin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (gameId && characterNameInput && characterNameInput.trim()) {
      onJoin(gameId, characterNameInput.trim());
    }
  };

  const handleStartGame = () => {
    if (gameId && isHost && gameStatus === 'pending') {
      onStartMultiplayerGame(gameId);
    }
  };

  const amIJoined = myCharacterName !== null && myCharacterName !== undefined;
  const allJoined = participants.length > 1 && participants.every(p => p.character_name !== null);

  return (
    <div className="game-wrapper">
      <div className="story-box" style={{ textAlign: 'center' }}>
        <h2>Oyun Lobisi</h2>
        {isHost ? (
          <p>Oyuncuların katılması bekleniyor...</p>
        ) : (
          <p>Oyunun başlaması için ev sahibini bekleyin.</p>
        )}

        <ul style={{ listStyle: 'none', padding: 0, marginTop: '2rem' }}>
          {participants.map((p) => (
            <li key={p.id} style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: p.character_name ? p.profiles?.chat_color : '#888' }}>
                {p.profiles?.username || 'Bilinmeyen Kullanıcı'}
              </span>
              {p.character_name ? ` - ${p.character_name}` : ' - Katılmadı'}
            </li>
          ))}
        </ul>

        {!amIJoined && (
          <form onSubmit={handleJoin} className="lobby-join-form" style={{ marginTop: '2rem' }}>
            <div className="lobby-join-input-group">
              <label htmlFor="characterName" style={{ marginBottom: '0.5rem' }}>Karakter Adı/Ünvanı:</label>
              <input
                id="characterName"
                type="text"
                value={characterNameInput}
                onChange={(e) => setCharacterNameInput(e.target.value)}
                placeholder="Örn: Büyücü Merlin"
              />
            </div>
            <button className="white-button" type="submit" disabled={!characterNameInput.trim()}>Oyuna Katıl</button>
          </form>
        )}

        {isHost && allJoined && (
          <div style={{ marginTop: '2rem' }}>
            <button className="white-button" onClick={handleStartGame}>
              Oyunu Başlat
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Lobby;