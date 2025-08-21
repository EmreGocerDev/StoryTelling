'use client';

interface NPC {
  name: string;
  description: string;
  state: string;
}

interface Props {
  npcs: NPC[];
  isOpen: boolean;
  onToggle: () => void;
}

const CharactersPanel: React.FC<Props> = ({ npcs, isOpen, onToggle }) => {
  // ================== PANEL GİZLEME DÜZELTMESİ ==================
  // Panel sadece aktif bir hikaye varsa ve hiç karakter yoksa tamamen gizlensin.
  // Ama karakterler sonradan eklenebileceği için her zaman görünür olması daha iyi.
  // Bu yüzden bu component'i her zaman render ediyoruz, gizleme/gösterme mantığı CSS'de veya parent'ta olmalı.
  // Şimdilik, npc dizisi boş olsa bile başlığı göstereceğiz.

  return (
    <div className="characters-panel">
      <div className="panel-header" onClick={onToggle}>
        <h4>Kişiler</h4>
        <span className="panel-toggle-icon">{isOpen ? '▼' : '►'}</span>
      </div>
      {isOpen && (
        <div className="panel-content">
          {npcs.length === 0 ? (
            <p className="inventory-empty">Henüz kimseyle tanışmadın.</p>
          ) : (
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
          )}
        </div>
      )}
    </div>
  );
};

export default CharactersPanel;