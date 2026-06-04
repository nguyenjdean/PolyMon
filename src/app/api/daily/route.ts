import { NextResponse } from 'next/server';
import { getDailyMeta, getDailyDateString, getGameNumber } from '@/lib/daily';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const dateStr = dateParam || getDailyDateString();
    const meta = getDailyMeta(dateStr);
    
    if (!meta) {
        return NextResponse.json({ error: 'Daily puzzle not generated yet for this date.' }, { status: 404 });
    }
    
    // Do NOT return the pokemon name/id to prevent cheating
    return NextResponse.json({
        date: dateStr,
        gameNumber: getGameNumber(dateStr),
        maxGuesses: 20,
        shapeSettings: {
            circles: { start: 20, step: 10 },
            rectangles: { start: 20, step: 10 },
            triangles: { start: 20, step: 10 },
            lines: { start: 100, step: 25 },
        },
        modes: Object.keys(meta)
    });
}
