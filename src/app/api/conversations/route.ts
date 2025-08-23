// src/app/api/conversations/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const { other_user_id } = await req.json();

    if (!other_user_id) {
        return NextResponse.json({ error: 'Diğer kullanıcı ID\'si gerekli.' }, { status: 400 });
    }

    const { data: existingData, error: rpcError } = await supabase.rpc('get_conversation_between_users', {
        user1_id: user.id,
        user2_id: other_user_id,
    });

    if (rpcError) {
        console.error("RPC Hatası:", rpcError);
        if (rpcError.code === '42883') {
            return NextResponse.json({ error: 'Veritabanı fonksiyonu eksik: `get_conversation_between_users`' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Sohbet kontrol edilirken bir hata oluştu.' }, { status: 500 });
    }

    if (existingData && existingData.length > 0) {
        return NextResponse.json({ conversation_id: existingData[0].id });
    }

    const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

    if (convError || !newConversation) {
        console.error("Sohbet oluşturma hatası:", convError);
        return NextResponse.json({ error: 'Sohbet oluşturulamadı.' }, { status: 500 });
    }

    const { error: participantsError } = await supabase.from('conversation_participants').insert([
        { conversation_id: newConversation.id, user_id: user.id },
        { conversation_id: newConversation.id, user_id: other_user_id },
    ]);

    if (participantsError) {
        console.error("Katılımcı ekleme hatası:", participantsError);
        return NextResponse.json({ error: 'Katılımcılar eklenemedi.' }, { status: 500 });
    }

    return NextResponse.json({ conversation_id: newConversation.id });
}