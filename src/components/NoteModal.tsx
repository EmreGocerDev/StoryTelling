'use client';

import { useState, useEffect } from 'react';

interface Props {
  initialNotes: string;
  onSave: (notes: string) => void;
  onClose: () => void;
  className?: string;
}

const NoteModal: React.FC<Props> = ({ initialNotes, onSave, onClose }) => {
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const handleSave = () => {
    onSave(notes);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Not Defteri</h2>
        <p>Bulduğun ipuçlarını, şüpheli isimleri ve teorilerini buraya kaydet.</p>
        <textarea
          className="notes-textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={10}
          placeholder="Örneğin: Kurbanın masasında yarısı içilmiş bir kahve vardı..."
        />
        <div className="modal-actions">
          <button className="white-button" onClick={handleSave}>
            Kaydet ve Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoteModal;