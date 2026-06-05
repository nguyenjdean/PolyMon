import fs from 'fs';
import path from 'path';

export interface PokemonMeta {
    id: number;
    name: string;
    imageUrl: string;
    hints: string[];
}

export interface DailyMeta {
    circles?: PokemonMeta;
    rectangles?: PokemonMeta;
    triangles?: PokemonMeta;
    [mode: string]: PokemonMeta | undefined;
}

// Epoch Date for Game #1
export const EPOCH_DATE = '2026-05-30';

export function getDailyDateString(dateObj: Date = new Date()): string {
    // We want the puzzle to refresh at 3:00 AM EST (America/New_York)
    // Create a formatter for New York time
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: 'numeric',
        hour12: false,
    });
    
    // Get formatted string like "05/30/2026, 02"
    const parts = formatter.formatToParts(dateObj);
    const params: any = {};
    for (const p of parts) {
        if (p.type !== 'literal') params[p.type] = p.value;
    }
    
    // If before 3 AM, subtract 1 day
    const hour = parseInt(params.hour, 10);
    const adjustedDate = new Date(`${params.year}-${params.month}-${params.day}T12:00:00Z`);
    if (hour < 3) {
        adjustedDate.setUTCDate(adjustedDate.getUTCDate() - 1);
    }
    
    return adjustedDate.toISOString().split('T')[0];
}

export function getGameNumber(dateStr: string): number {
    const epoch = new Date(`${EPOCH_DATE}T00:00:00Z`).getTime();
    const target = new Date(`${dateStr}T00:00:00Z`).getTime();
    const diffDays = Math.floor((target - epoch) / (1000 * 60 * 60 * 24));
    return diffDays + 1;
}

export async function getDailyMeta(dateStr: string = getDailyDateString()): Promise<DailyMeta | null> {
    // 1. Try local filesystem (for local development)
    if (process.env.NODE_ENV === 'development') {
        const metaPath = path.join(process.cwd(), 'data', dateStr, 'meta.json');
        if (fs.existsSync(metaPath)) {
            const data = fs.readFileSync(metaPath, 'utf8');
            return JSON.parse(data);
        }
    }
    
    // 2. Fetch from GitHub raw content
    const url = `https://raw.githubusercontent.com/nguyenjdean/PolyMon/daily-data/data/${dateStr}/meta.json`;
    try {
        const res = await fetch(url, { next: { revalidate: 60 } });
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        return null;
    }
}

export async function getDailySvg(mode: string, guessCount: number, dateStr: string = getDailyDateString()): Promise<string | null> {
    const isLines = mode === 'lines';
    
    const startShapes = isLines ? 100 : 20;
    const stepShapes = isLines ? 25 : 10;
    
    const shapeCount = startShapes + (guessCount * stepShapes);
    const maxShapes = startShapes + (20 * stepShapes);
    
    // Cap at maxShapes
    const targetShapes = Math.min(shapeCount, maxShapes);
    
    // 1. Try local filesystem (for local development)
    if (process.env.NODE_ENV === 'development') {
        const svgPath = path.join(process.cwd(), 'data', dateStr, `${mode}_${targetShapes}.svg`);
        if (fs.existsSync(svgPath)) {
            return fs.readFileSync(svgPath, 'utf8');
        }
    }
    
    // 2. Fetch from GitHub raw content
    const url = `https://raw.githubusercontent.com/nguyenjdean/PolyMon/daily-data/data/${dateStr}/${mode}_${targetShapes}.svg`;
    try {
        const res = await fetch(url, { next: { revalidate: 60 } });
        if (!res.ok) return null;
        return await res.text();
    } catch (e) {
        return null;
    }
}
