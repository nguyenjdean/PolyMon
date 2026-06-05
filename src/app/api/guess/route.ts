import { NextResponse, NextRequest } from 'next/server';
import { getDailyMeta, getDailyDateString } from '@/lib/daily';

export async function POST(request: NextRequest) {
    let body;
    try {
        body = await request.json();
    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { guess, mode, date } = body;
    if (typeof guess !== 'string' || typeof mode !== 'string') {
        return NextResponse.json({ error: 'Guess and mode are required' }, { status: 400 });
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

    if (guess === '$$GIVE_UP$$') {
        return NextResponse.json({
            correct: false,
            pokemon: modeMeta
        });
    }

    // Compare guess (case-insensitive)
    const normalizedGuess = guess.trim().toLowerCase();
    const correctName = modeMeta.name.toLowerCase();
    
    const cleanStr = (str: string) => str.replace(/[^a-z0-9]/g, '');

    const isCorrect = cleanStr(normalizedGuess) === cleanStr(correctName);

    if (isCorrect) {
        return NextResponse.json({
            correct: true,
            pokemon: modeMeta
        });
    }

    return NextResponse.json({
        correct: false
    });
}
