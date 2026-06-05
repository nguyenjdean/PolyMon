import { NextResponse, NextRequest } from 'next/server';
import { getDailySvg, getDailyDateString } from '@/lib/daily';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('mode') || 'circles';
    
    // Parse guesses count (0 to 20)
    let guesses = parseInt(searchParams.get('guesses') || '0', 10);
    if (isNaN(guesses) || guesses < 0) guesses = 0;
    if (guesses > 20) guesses = 20;

    const dateParam = searchParams.get('date');
    const dateStr = dateParam || getDailyDateString();
    const svgData = await getDailySvg(mode, guesses, dateStr);

    if (!svgData) {
        return new NextResponse('Daily puzzle mode not found.', { status: 404 });
    }

    // Return the SVG with appropriate Content-Type
    return new NextResponse(svgData, {
        headers: {
            'Content-Type': 'image/svg+xml',
            // Cache control to prevent browsers from repeatedly requesting same SVG
            'Cache-Control': 'public, max-age=86400'
        }
    });
}
