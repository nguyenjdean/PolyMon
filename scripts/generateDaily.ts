import { ImageRunner, Bitmap, ShapeTypes, SvgExporter } from 'geometrizejs';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { getDailyDateString } from '../src/lib/daily';

function sfc32(a: number, b: number, c: number, d: number) {
    return function() {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
      var t = (a + b) | 0;
      a = b ^ b >>> 9;
      b = c + (c << 3) | 0;
      c = (c << 21 | c >>> 11);
      d = d + 1 | 0;
      t = t + d | 0;
      c = c + t | 0;
      return (t >>> 0) / 4294967296;
    }
}

function stringToSeed(str: string) {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
        k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [h1>>>0, h2>>>0, h3>>>0, h4>>>0];
}

async function fetchPokemon(id: number) {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch Pokemon ${id}`);
    const data = await res.json();
    
    const speciesRes = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`);
    if (!speciesRes.ok) throw new Error(`Failed to fetch Pokemon Species ${id}`);
    const speciesData = await speciesRes.json();

    const isMonotype = data.types.length === 1;
    const firstType = data.types[0].type.name;
    const generation = speciesData.generation.name; // e.g., "generation-i"

    return {
        id: data.id,
        name: data.name,
        imageUrl: data.sprites.other['official-artwork'].front_default,
        hints: [
            isMonotype ? "This Pokemon is a Monotype." : "This Pokemon is a Dual-type.",
            `The primary type is ${firstType.charAt(0).toUpperCase() + firstType.slice(1)}.`,
            `It was introduced in ${generation.replace('generation-', 'Generation ').toUpperCase()}.`
        ]
    };
}

async function processImage(buffer: Buffer) {
    const image = sharp(buffer);
    const targetWidth = 256;
    const resized = await image.resize(targetWidth).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    
    const width = resized.info.width;
    const height = resized.info.height;
    const pixelData = Array.from(resized.data);
    
    let bitmap;
    if ((Bitmap as any).createFromByteArray) {
        bitmap = (Bitmap as any).createFromByteArray(width, height, pixelData);
    } else {
        bitmap = new Bitmap();
    }
    return { bitmap, width, height };
}

const MODES = {
    circles: [ShapeTypes.CIRCLE, ShapeTypes.ELLIPSE, ShapeTypes.ROTATED_ELLIPSE],
    rectangles: [ShapeTypes.RECTANGLE, ShapeTypes.ROTATED_RECTANGLE],
    triangles: [ShapeTypes.TRIANGLE],
    lines: [ShapeTypes.LINE, ShapeTypes.QUADRATIC_BEZIER]
};

async function main() {
    // Optionally accept date string from command line args
    const dateStr = process.argv[2] || getDailyDateString();
    console.log(`Generating daily puzzle for ${dateStr}...`);

    const seeds = stringToSeed(dateStr + "_v3");
    const rand = sfc32(seeds[0], seeds[1], seeds[2], seeds[3]);
    
    const dataDir = path.join(process.cwd(), 'data', dateStr);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const meta: Record<string, any> = {};

    for (const [modeName, shapeTypes] of Object.entries(MODES)) {
        console.log(`\nProcessing mode: ${modeName}`);
        
        // Generate a new ID for each mode. 
        // The first call (circles) will match the original ID (Mightyena for today's seed).
        const pokemonId = Math.floor(rand() * 1025) + 1;
        console.log(`Selected Pokemon ID for ${modeName}: ${pokemonId}`);
        const pokemon = await fetchPokemon(pokemonId);
        console.log(`Fetched Pokemon: ${pokemon.name}`);
        
        meta[modeName] = pokemon;
        
        const res = await fetch(pokemon.imageUrl);
        const arrayBuffer = await res.arrayBuffer();
        const { bitmap, width, height } = await processImage(Buffer.from(arrayBuffer));

        const runner = new ImageRunner(bitmap);
        const options = {
            shapeTypes: shapeTypes,
            alpha: 255, // Shape Opacity
            candidateShapesPerStep: 10, // Shapes Per Update
            shapeMutationsPerStep: 500 // Max Shape Mutations
        };
        
        const shapes: any[] = [];
        const isLines = modeName === 'lines';
        const isTriangles = modeName === 'triangles';
        const isCircles = modeName === 'circles';
        
        const startShapes = isLines ? 100 : 20;
        const stepShapes = isLines ? 25 : 10;
        const maxShapes = startShapes + (20 * stepShapes); // 20 max guesses
        
        for (let count = 1; count <= maxShapes; count++) {
            const stepResults = runner.step(options);
            shapes.push(...stepResults);
            
            if (count >= startShapes && (count - startShapes) % stepShapes === 0) {
                const svgData = SvgExporter.export(shapes, width, height);
                const filename = `${modeName}_${count}.svg`;
                fs.writeFileSync(path.join(dataDir, filename), svgData);
                console.log(`  Saved ${filename}`);
            }
        }
    }
    
    // Save nested metadata
    fs.writeFileSync(path.join(dataDir, 'meta.json'), JSON.stringify(meta, null, 2));
    console.log('\nGeneration complete!');
}

main().catch(console.error);
