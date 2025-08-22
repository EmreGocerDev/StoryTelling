import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// POST /api/conversations/delete
export async function POST(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  // ID'yi artık URL'den bir sorgu parametresi olarak alıyoruz (örn: ?id=...)
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('id');

  if (!conversationId) {
    return NextResponse.json({ error: 'Sohbet ID\'si gerekli.' }, { status: 400 });
  }

  // Güvenli silme fonksiyonunu çağır
  const { error } = await supabase.rpc('delete_conversation', { conv_id: conversationId });

  if (error) {
    console.error('Sohbet silme hatası:', error);
    return NextResponse.json({ error: 'Sohbet silinirken bir hata oluştu.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}