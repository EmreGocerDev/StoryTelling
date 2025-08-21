'use client';

import { useState, useEffect, FormEvent } from 'react';

const KickChat = () => {
  // Input'a girilen kanal adını tutar
  const [channelInput, setChannelInput] = useState('');
  // Şu an gösterilen aktif kanal adını tutar
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  // Sayfa yüklendiğinde localStorage'dan kayıtlı kanalı çeker
  useEffect(() => {
    const savedChannel = localStorage.getItem('kickChannel');
    if (savedChannel) {
      setActiveChannel(savedChannel);
      setChannelInput(savedChannel);
    }
  }, []);

  // Kanalı ayarlama fonksiyonu
  const handleSetChannel = (e: FormEvent) => {
    e.preventDefault();
    const channelName = channelInput.trim().toLowerCase();
    if (channelName) {
      setActiveChannel(channelName);
      localStorage.setItem('kickChannel', channelName);
    }
  };

  // Kanalı temizleme fonksiyonu
  const handleClearChannel = () => {
    setActiveChannel(null);
    setChannelInput('');
    localStorage.removeItem('kickChannel');
  };

  return (
    <div className="kick-chat-panel">
      <div className="kick-chat-header">
        <h3>Kick Sohbeti</h3>
      </div>
      <div className="kick-chat-controls">
        <form onSubmit={handleSetChannel}>
          <input
            type="text"
            value={channelInput}
            onChange={(e) => setChannelInput(e.target.value)}
            placeholder="Kick kanal adı..."
            className="kick-channel-input"
          />
          <button type="submit" className="white-button kick-set-button">
            Ayarla
          </button>
        </form>
        {activeChannel && (
          <button onClick={handleClearChannel} className="kick-clear-button">
            Kapat
          </button>
        )}
      </div>

      {activeChannel ? (
        <div className="kick-iframe-wrapper">
          <iframe
            src={`https://kick.com/${activeChannel}?embed=true`}
            height="100%"
            width="100%"
            frameBorder="0"
            scrolling="no"
            allowFullScreen={true}
          ></iframe>
        </div>
      ) : (
        <div className="kick-no-channel">
          <p>Görüntülemek için bir Kick kanal adı girin.</p>
        </div>
      )}
    </div>
  );
};

export default KickChat;