import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Bu fonksiyonun adı BÜYÜK harflerle "POST" olmalı.
export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const { receiver_id } = await req.json();

    if (!receiver_id) {
      return NextResponse.json({ error: 'Alıcı ID\'si gerekli.' }, { status: 400 });
    }

    // Doğrudan veritabanı fonksiyonunu (RPC) çağırıyoruz.
    const { error } = await supabase.rpc('send_friend_request', { 
      p_receiver_id: receiver_id 
    });

    if (error) {
      // Veritabanından gelen hatayı doğrudan frontend'e gönderiyoruz.
      console.error('Arkadaşlık isteği RPC hatası:', error);
      return NextResponse.json({ error: error.message }, { status: 400 }); // 500 yerine 400 daha uygun
    }

    return NextResponse.json({ success: true });

  } catch (e) {
    console.error('API Rotasında beklenmedik hata:', e);
    return NextResponse.json({ error: 'Sunucuda bir hata oluştu.' }, { status: 500 });
  }
}