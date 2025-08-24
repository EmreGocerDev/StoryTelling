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

    const { friend_id } = await req.json();

    if (!friend_id) {
        return NextResponse.json({ error: 'Arkadaş ID\'si gerekli.' }, { status: 400 });
    }

    const { error } = await supabase.rpc('remove_friend', { p_friend_id: friend_id });

    if (error) {
        console.error('Arkadaş silme hatası:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}