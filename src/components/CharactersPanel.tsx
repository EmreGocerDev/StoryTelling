'use client';

// NPC tipini dışa aktarmak için 'export' ekliyoruz.
export interface NPC {
  name: string;
  description: string;
  state: string;
}

// Oyuncu (participant) tipini tanımlıyoruz
interface Participant {
  user_id: string;
  character_name: string | null;
  profiles: { username: string } | null;
}

interface Props {
  npcs: NPC[];
  participants: Participant[]; // Yeni prop
  currentUserId?: string;      // Yeni prop
  isOpen: boolean;
  onToggle: () => void;
}

const CharactersPanel: React.FC<Props> = ({ npcs, participants, currentUserId, isOpen, onToggle }) => {
  const hasContent = npcs.length > 0 || participants.length > 0;

  return (
    <div className="characters-panel">
      <div className="panel-header" onClick={onToggle}>
        <h4>Kişiler</h4>
        <span className="panel-toggle-icon">{isOpen ? '▼' : '►'}</span>
      </div>
      {isOpen && (
        <div className="panel-content">
          {!hasContent ? (
            <p className="inventory-empty">Henüz kimseyle tanışmadın.</p>
          ) : (
            <ul>
              {/* Önce Oyuncuları Listele */}
              {participants.map((player) => (
                <li key={player.user_id} className="character-item">
                  {player.character_name || player.profiles?.username}
                  {player.user_id === currentUserId && " (Siz)"}
                  <div className="character-tooltip">
                    <p><strong>Durum:</strong> Oyuncu</p>
                  </div>
                </li>
              ))}

              {/* Sonra NPC'leri Listele */}
              {npcs.map((npc) => (
                <li key={npc.name} className="character-item">
                  {npc.name.replace(/_/g, ' ')}
                  <div className="character-tooltip">
                    <p><strong>Görünüm:</strong> {npc.description}</p>
                    <p><strong>Durum:</strong> {npc.state}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default CharactersPanel;