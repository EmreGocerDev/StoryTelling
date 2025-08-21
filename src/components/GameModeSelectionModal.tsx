'use client';

import { useState } from 'react';

type GameMode = 'classic' | 'detective' | 'custom' | 'prison_escape';
type Difficulty = 'easy' | 'normal' | 'hard';

interface Props {
  onStartStory: (mode: GameMode, difficulty: Difficulty, prompt?: string) => void;
  onClose: () => void;
}

const GameModeSelectionModal: React.FC<Props> = ({ onStartStory, onClose }) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>('prison_escape');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('normal');
  const [customPrompt, setCustomPrompt] = useState('');

  const handleStart = () => {
    if (selectedMode === 'custom' && !customPrompt.trim()) {
      alert('Lütfen özel hikayeniz için bir başlangıç senaryosu yazın.');
      return;
    }
    onStartStory(selectedMode, selectedDifficulty, customPrompt);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Yeni Bir Maceraya Başla</h2>
        
        <label>Oyun Modu Seçin:</label>
        <div className="mode-selection">
          <button className={`mode-button ${selectedMode === 'classic' ? 'active' : ''}`} onClick={() => setSelectedMode('classic')}>
            <h3>Classic Mod</h3>
            <p>Yapay zekanın tamamen özgün bir macera yaratmasına izin ver.</p>
          </button>
          <button className={`mode-button ${selectedMode === 'prison_escape' ? 'active' : ''}`} onClick={() => setSelectedMode('prison_escape')}>
            <h3>Hapishaneden Kaçış</h3>
            <p>Bir hücrede uyan, etrafı araştır, eşyaları topla ve kaç!</p>
          </button>
          <button className={`mode-button ${selectedMode === 'detective' ? 'active' : ''}`} onClick={() => setSelectedMode('detective')}>
            <h3>Dedektif Modu</h3>
            <p>Bir cinayeti araştır, ipuçlarını topla ve katili bul.</p>
          </button>
          <button className={`mode-button ${selectedMode === 'custom' ? 'active' : ''}`} onClick={() => setSelectedMode('custom')}>
            <h3>Özelleştirilmiş</h3>
            <p>Kendi evrenini ve kurallarını yaz, macera oradan başlasın.</p>
          </button>
        </div>

        {selectedMode === 'custom' && (
          <div className="custom-prompt-area">
            <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Hikayenizin geçeceği evreni, karakterinizi veya başlangıç senaryosunu buraya yazın..." rows={4} />
          </div>
        )}

        <label>Zorluk Seviyesi Seçin:</label>
        <div className="difficulty-selection">
            <button className={`difficulty-button ${selectedDifficulty === 'easy' ? 'active' : ''}`} onClick={() => setSelectedDifficulty('easy')}>Kolay</button>
            <button className={`difficulty-button ${selectedDifficulty === 'normal' ? 'active' : ''}`} onClick={() => setSelectedDifficulty('normal')}>Normal</button>
            <button className={`difficulty-button ${selectedDifficulty === 'hard' ? 'active' : ''}`} onClick={() => setSelectedDifficulty('hard')}>Zor</button>
        </div>

        <div className="modal-actions">
          <button className="white-button" onClick={handleStart}>Maceraya Başla</button>
          <button className="close-button" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
};

export default GameModeSelectionModal;