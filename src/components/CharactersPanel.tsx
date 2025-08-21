'use client';

// Gerekli tipleri doğrudan bu dosyada tanımlıyoruz
interface NPC {
  name: string;
  description: string;
  state: string;
}

interface Props {
  npcs: NPC[];
}

const CharactersPanel: React.FC<Props> = ({ npcs }) => {
  if (npcs.length === 0) {
    return null; // Kimseyle tanışılmadıysa paneli gösterme
  }

  return (
    <div className="characters-panel">
      <h4>Kişiler</h4>
      <ul>
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
    </div>
  );
};

export default CharactersPanel;