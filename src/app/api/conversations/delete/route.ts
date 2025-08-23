// src/app/api/conversations/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
  }

  const { conversationId } = await request.json();

  if (!conversationId) {
    return NextResponse.json({ error: 'Sohbet ID\'si gerekli.' }, { status: 400 });
  }

  const { error } = await supabase.rpc('delete_conversation', { conv_id: conversationId });

  if (error) {
    console.error('Sohbet silme hatası:', error);
    return NextResponse.json({ error: 'Sohbet silinirken bir hata oluştu.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}