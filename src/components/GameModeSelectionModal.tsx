'use client';

import { useState, useMemo, useRef } from 'react';
import { legendsData, LegendCategory, Legend } from '@/lib/legendsData';

type GameMode = 'classic' | 'detective' | 'custom' | 'prison_escape' | 'legends';
type Difficulty = 'easy' | 'normal' | 'hard';

interface Props {
  onStartStory: (mode: GameMode, difficulty: Difficulty, customPrompt?: string, legendName?: string) => void;
  onClose: () => void;
  className?: string;
}

const GameModeSelectionModal: React.FC<Props> = ({ onStartStory, onClose }) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('normal');
  const [customPrompt, setCustomPrompt] = useState('');
  
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<LegendCategory | null>(null);
  const [selectedLegend, setSelectedLegend] = useState<Legend | null>(null);

  // ARAMA İÇİN YENİ STATE
  const [searchTerm, setSearchTerm] = useState('');

  const categoryTrackRef = useRef<HTMLDivElement>(null);
  const legendTrackRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'prev' | 'next', ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      const scrollAmount = ref.current.clientWidth;
      ref.current.scrollBy({ 
        left: direction === 'prev' ? -scrollAmount : scrollAmount, 
        behavior: 'smooth' 
      });
    }
  };

  // ARAMA MANTIĞI
  const allLegends = useMemo(() => 
    legendsData.flatMap(category => 
      category.legends.map(legend => ({ ...legend, categoryName: category.categoryName }))
    ), 
  []);

  const filteredLegends = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lowercasedTerm = searchTerm.toLowerCase();
    return allLegends.filter(legend =>
      legend.name.toLowerCase().includes(lowercasedTerm) ||
      legend.description.toLowerCase().includes(lowercasedTerm)
    );
  }, [searchTerm, allLegends]);

  const handleModeSelect = (mode: GameMode) => {
    setSelectedMode(mode);
    setStep(1);
    setSelectedCategory(null);
    setSelectedLegend(null);
    setSearchTerm(''); // Mod değiştiğinde aramayı sıfırla
  };

  const handleStart = () => {
    if (selectedMode === 'custom' && !customPrompt.trim()) { alert('Lütfen özel hikayeniz için bir başlangıç senaryosu yazın.'); return; }
    if (selectedMode === 'legends' && !selectedLegend) { alert('Lütfen bir efsane seçin.'); return; }
    onStartStory(selectedMode, selectedDifficulty, customPrompt, selectedLegend?.name);
  };

  const renderLegendsContent = () => {
    // Arama yapılıyorsa, carousel yerine arama sonuçlarını göster
    if (searchTerm.trim()) {
      return (
        <div className="search-results-list">
          {filteredLegends.length > 0 ? (
            filteredLegends.map(legend => (
              <button key={legend.name} className={`mode-button ${selectedLegend?.name === legend.name ? 'active' : ''}`} onClick={() => setSelectedLegend(legend)}>
                <h3>{legend.name} <span className="story-mode-badge">{legend.categoryName}</span></h3>
                <p>{legend.description}</p>
              </button>
            ))
          ) : <p style={{textAlign: 'center', color: '#888'}}>Aramanızla eşleşen bir efsane bulunamadı.</p>}
        </div>
      );
    }

    // Arama yoksa, normal carousel adımlarını göster
    if (step === 1) {
      return (
        <div className="legend-carousel-container">
          <button className="carousel-nav-button prev" onClick={() => handleScroll('prev', categoryTrackRef)}>&lt;</button>
          <div className="legend-carousel-track" ref={categoryTrackRef}>
            {legendsData.map(cat => (
              <div key={cat.categoryName} className="legend-carousel-item">
                <button className="mode-button" onClick={() => { setSelectedCategory(cat); setStep(2); }}>
                  <h3>{cat.categoryName} <span className="legend-count">({cat.legends.length})</span></h3>
                </button>
              </div>
            ))}
          </div>
          <button className="carousel-nav-button next" onClick={() => handleScroll('next', categoryTrackRef)}>&gt;</button>
        </div>
      );
    }
    if (step === 2 && selectedCategory) {
      return (
        <div className="legend-carousel-container">
          <button className="carousel-nav-button prev" onClick={() => handleScroll('prev', legendTrackRef)}>&lt;</button>
          <div className="legend-carousel-track" ref={legendTrackRef}>
            {selectedCategory.legends.map(legend => (
              <div key={legend.name} className="legend-carousel-item">
                <button className={`mode-button ${selectedLegend?.name === legend.name ? 'active' : ''}`} onClick={() => setSelectedLegend(legend)}>
                  <h3>{legend.name}</h3>
                  <p>{legend.description}</p>
                </button>
              </div>
            ))}
          </div>
          <button className="carousel-nav-button next" onClick={() => handleScroll('next', legendTrackRef)}>&gt;</button>
        </div>
      );
    }
    return null;
  };

  const renderContent = () => {
    if (selectedMode === 'legends') {
      return (
        <>
          <div className="legend-search-wrapper">
            <input 
              type="text" 
              className="legend-search-input" 
              placeholder="Efsaneler arasında ara..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          {renderLegendsContent()}
          <div className="modal-actions">
            <button className="white-button" onClick={handleStart} disabled={!selectedLegend}>Bu Efsaneyle Başla</button>
            {step === 2 && !searchTerm.trim() && <button className="close-button" onClick={() => setStep(1)}>Geri</button>}
          </div>
        </>
      );
    }

    return (
      <>
        <div className="custom-prompt-area" style={{display: selectedMode === 'custom' ? 'block' : 'none'}}>
          <label>Hikayenizin başlangıcını yazın:</label>
          <textarea value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)} placeholder="Hikayenizin geçeceği evreni, karakterinizi veya başlangıç senaryosunu buraya yazın..." rows={4} />
        </div>
        <label>Zorluk Seviyesi Seçin:</label>
        <div className="difficulty-selection">
            <button className={`difficulty-button ${selectedDifficulty === 'easy' ? 'active' : ''}`} onClick={() => setSelectedDifficulty('easy')}>Kolay</button>
            <button className={`difficulty-button ${selectedDifficulty === 'normal' ? 'active' : ''}`} onClick={() => setSelectedDifficulty('normal')}>Normal</button>
            <button className={`difficulty-button ${selectedDifficulty === 'hard' ? 'active' : ''}`} onClick={() => setSelectedDifficulty('hard')}>Zor</button>
        </div>
        <div className="modal-actions">
          <button className="white-button" onClick={handleStart}>Maceraya Başla</button>
        </div>
      </>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Yeni Bir Maceraya Başla</h2>
        <div className="mode-selection main-modes">
            <button className={`mode-button ${selectedMode === 'classic' ? 'active' : ''}`} onClick={() => handleModeSelect('classic')}><h3>Classic</h3><p>Yapay zekanın özgün bir macera yaratmasına izin ver.</p></button>
            <button className={`mode-button ${selectedMode === 'prison_escape' ? 'active' : ''}`} onClick={() => handleModeSelect('prison_escape')}><h3>Hapisten Kaçış</h3><p>Bir hücrede uyan, eşyaları topla ve kaçış yolunu bul.</p></button>
            <button className={`mode-button ${selectedMode === 'detective' ? 'active' : ''}`} onClick={() => handleModeSelect('detective')}><h3>Dedektif</h3><p>Bir cinayeti araştır, ipuçlarını topla ve katili bul.</p></button>
            <button className={`mode-button ${selectedMode === 'custom' ? 'active' : ''}`} onClick={() => handleModeSelect('custom')}><h3>Özelleştir</h3><p>Kendi evrenini ve kurallarını sen belirle.</p></button>
            <button className={`mode-button ${selectedMode === 'legends' ? 'active' : ''}`} onClick={() => handleModeSelect('legends')}><h3>Efsaneler</h3><p>Tarihten ve mitolojiden bir hikayeyi sen yaşa.</p></button>
        </div>
        <hr className="modal-divider" />
        {renderContent()}
        <button className="close-button" style={{marginTop: '1rem'}} onClick={onClose}>Vazgeç</button>
      </div>
    </div>
  );
};

export default GameModeSelectionModal;