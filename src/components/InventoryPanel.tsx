'use client';

interface Props {
  items: string[];
}

const InventoryPanel: React.FC<Props> = ({ items }) => {
  return (
    <div className="inventory-panel">
      <h4>Eşyalar</h4>
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
  );
};

export default InventoryPanel;