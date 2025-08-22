import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  const { content } = await req.json();

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Mesaj içeriği boş olamaz.' }, { status: 400 });
  }
  
  // Gelen mesajı veritabanına ekle. Realtime bu değişikliği yakalayıp herkese yayınlayacak.
  const { error } = await supabase.from('chat_messages').insert({
    user_id: user.id,
    content: content.trim()
  });

  if (error) {
    console.error('Mesaj gönderme hatası:', error);
    return NextResponse.json({ error: 'Mesaj gönderilirken bir hata oluştu.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}