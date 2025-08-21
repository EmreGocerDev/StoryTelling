'use client';

interface Props {
  items: string[];
  isOpen: boolean;
  onToggle: () => void;
}

const InventoryPanel: React.FC<Props> = ({ items, isOpen, onToggle }) => {
  return (
    <div className="inventory-panel">
      <div className="panel-header" onClick={onToggle}>
        <h4>Eşyalar</h4>
        <span className="panel-toggle-icon">{isOpen ? '▼' : '►'}</span>
      </div>
      {isOpen && (
        <div className="panel-content">
          {items.length === 0 ? (
            <p className="inventory-empty">Envanterin boş.</p>
          ) : (
            <ul>
              {items.map((item, index) => (
                <li key={index} className="inventory-item">{item}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryPanel;