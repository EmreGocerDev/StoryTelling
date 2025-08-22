'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  children: React.ReactNode;
}

const Portal: React.FC<Props> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // mounted true ise, yani component tarayıcıda yüklendiyse portalı oluştur.
  // Bu, sunucu tarafında (server-side) render hatası almamızı engeller.
  return mounted
    ? createPortal(children, document.body)
    : null;
};

export default Portal;