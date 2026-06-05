import { NextResponse, NextRequest } from 'next/server';
import { getDailyMeta, getDailyDateString } from '@/lib/daily';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('mode');
    const level = parseInt(searchParams.get('level') || '1', 10);
    const date = searchParams.get('date');

    if (!mode) {
        return NextResponse.json({ error: 'Mode is required' }, { status: 400 });
    }

    if (level < 1 || level > 3) {
        return NextResponse.json({ error: 'Invalid hint level' }, { status: 400 });
    }

    const dateStr = date || getDailyDateString();
    const meta = await getDailyMeta(dateStr);

    if (!meta) {
        return NextResponse.json({ error: 'Daily puzzle not generated yet.' }, { status: 404 });
    }

    const modeMeta = meta[mode];
    if (!modeMeta) {
        return NextResponse.json({ error: `Invalid mode: ${mode}` }, { status: 400 });
    }

    if (!modeMeta.hints || modeMeta.hints.length < level) {
         return NextResponse.json({ error: 'Hint not available' }, { status: 404 });
    }

    return NextResponse.json({
        hint: modeMeta.hints[level - 1]
    });
}
