import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import sharp from 'sharp';
import { CharacterParser } from '../src/core/resources/CharacterParser';
import type { AgentCharacterDefinition, AudioAtlasEntry, AtlasEntry } from '../src/core/base/types';

// Mock some browser globals for CharacterParser
(global as any).fetch = async (url: string) => {
    const content = fs.readFileSync(url, 'utf-8');
    return {
        ok: true,
        text: async () => content
    };
};

interface ProcessedImage {
    filename: string;
    buffer: Buffer;
    width: number;
    height: number;
    trimX: number;
    trimY: number;
}

function decode8bppBmp(filePath: string) {
    const buffer = fs.readFileSync(filePath);
    const bitsOffset = buffer.readUInt32LE(10);
    const dibHeaderSize = buffer.readUInt32LE(14);
    const width = buffer.readInt32LE(18);
    const height = buffer.readInt32LE(22);
    const bpp = buffer.readUInt16LE(28);

    if (bpp !== 8) throw new Error(`Only 8bpp BMP supported, got ${bpp} in ${filePath}`);

    const paletteOffset = 14 + dibHeaderSize;
    const numColors = buffer.readUInt32LE(46) || 256;
    const palette = [];
    for (let i = 0; i < numColors; i++) {
        const offset = paletteOffset + i * 4;
        palette.push({
            b: buffer[offset],
            g: buffer[offset + 1],
            r: buffer[offset + 2]
        });
    }

    const absHeight = Math.abs(height);
    const rowSize = Math.floor((bpp * width + 31) / 32) * 4;
    const rgba = Buffer.alloc(width * absHeight * 4);

    for (let y = 0; y < absHeight; y++) {
        const rowIdx = height > 0 ? (absHeight - 1 - y) : y;
        const rowOffset = bitsOffset + rowIdx * rowSize;
        for (let x = 0; x < width; x++) {
            const paletteIdx = buffer[rowOffset + x];
            const color = palette[paletteIdx];
            const outOffset = (y * width + x) * 4;
            rgba[outOffset] = color.r;
            rgba[outOffset + 1] = color.g;
            rgba[outOffset + 2] = color.b;
            rgba[outOffset + 3] = 255;
        }
    }

    return { width, height: absHeight, data: rgba, palette };
}

async function optimizeAgent(agentDir: string) {
    const agentName = path.basename(agentDir);
    let acdPath = path.join(agentDir, `${agentName.toUpperCase()}.acd`);
    if (!fs.existsSync(acdPath)) {
        acdPath = path.join(agentDir, `${agentName.toLowerCase()}.acd`);
    }
    if (!fs.existsSync(acdPath)) {
        acdPath = path.join(agentDir, `${agentName}.acd`);
    }

    console.log(`Optimizing agent: ${agentName}`);

    // 1. Load existing agent.json if it exists to preserve audioAtlas
    let existingDefinition: any = {};
    const jsonPath = path.join(agentDir, 'agent.json');
    if (fs.existsSync(jsonPath)) {
        existingDefinition = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    }

    // 2. Parse ACD
    const definition = await CharacterParser.load(acdPath);

    // 3. Collect all unique images
    const imagesToProcess = new Set<string>();
    Object.values(definition.animations).forEach(anim => {
        anim.frames.forEach(frame => {
            frame.images.forEach(img => {
                const normalized = img.filename.replace(/\\/g, '/').toLowerCase();
                img.filename = normalized; // Normalize in definition too
                imagesToProcess.add(normalized);
            });
            if (frame.mouths) {
                Object.values(frame.mouths).forEach(mouth => {
                    const normalized = mouth.filename.replace(/\\/g, '/').toLowerCase();
                    mouth.filename = normalized;
                    imagesToProcess.add(normalized);
                });
            }
        });
    });

    const imageList = Array.from(imagesToProcess).sort();
    console.log(`Found ${imageList.length} unique images.`);

    // 4. Load transparency color
    let colorTablePath = path.join(agentDir, definition.character.colorTable.replace(/\\/g, '/'));
    if (!fs.existsSync(colorTablePath)) {
        colorTablePath = path.join(agentDir, 'images', 'colortable.bmp');
    }
    if (!fs.existsSync(colorTablePath)) {
        colorTablePath = path.join(agentDir, 'Images', 'ColorTable.bmp');
    }

    const { palette } = decode8bppBmp(colorTablePath);
    const transIdx = definition.character.transparency;
    const { r, g, b } = palette[transIdx];
    console.log(`Transparency color: RGB(${r}, ${g}, ${b}) at index ${transIdx}`);

    // 5. Process and Trim Images
    const processedImages: ProcessedImage[] = [];
    for (const filename of imageList) {
        let imgPath = path.join(agentDir, filename);
        if (!fs.existsSync(imgPath)) {
            imgPath = path.join(agentDir, 'Images', path.basename(filename));
        }
        if (!fs.existsSync(imgPath)) {
             imgPath = path.join(agentDir, 'images', path.basename(filename).toLowerCase());
        }

        try {
            const { width: w, height: h, data } = decode8bppBmp(imgPath);

            // Apply transparency
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] === r && data[i + 1] === g && data[i + 2] === b) {
                    data[i + 3] = 0;
                } else {
                    data[i + 3] = 255;
                }
            }

            let processed;
            try {
                processed = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
                    .trim()
                    .toBuffer({ resolveWithObject: true });
            } catch (trimErr) {
                // If trim fails (e.g. image too small), use original
                processed = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
                    .toBuffer({ resolveWithObject: true });
            }

            processedImages.push({
                filename,
                buffer: processed.data,
                width: processed.info.width,
                height: processed.info.height,
                trimX: processed.info.trimOffsetLeft !== undefined ? -processed.info.trimOffsetLeft : 0,
                trimY: processed.info.trimOffsetTop !== undefined ? -processed.info.trimOffsetTop : 0
            });
        } catch (e) {
            console.error(`Failed to process ${filename}: ${e}`);
        }
    }

    // 6. Pack Sprites (Simple Shelf Packing)
    processedImages.sort((a, b) => b.height - a.height); // Sort by height descending

    const atlas: Record<string, AtlasEntry> = {};
    const maxWidth = 2048; // Common max texture size
    const padding = 2; // Padding to prevent bleeding during scaling
    let currentX = 0;
    let currentY = 0;
    let shelfHeight = 0;
    let totalHeight = 0;

    // First pass to determine total height
    for (const img of processedImages) {
        if (currentX + img.width + padding > maxWidth) {
            currentY += shelfHeight + padding;
            currentX = 0;
            shelfHeight = 0;
        }
        currentX += img.width + padding;
        shelfHeight = Math.max(shelfHeight, img.height);
    }
    totalHeight = currentY + shelfHeight;

    // Reset for actual packing
    currentX = 0;
    currentY = 0;
    shelfHeight = 0;
    const composites: any[] = [];

    for (const img of processedImages) {
        if (currentX + img.width + padding > maxWidth) {
            currentY += shelfHeight + padding;
            currentX = 0;
            shelfHeight = 0;
        }

        composites.push({
            input: img.buffer,
            raw: {
                width: img.width,
                height: img.height,
                channels: 4
            },
            left: currentX,
            top: currentY
        });

        atlas[img.filename] = {
            x: currentX,
            y: currentY,
            w: img.width,
            h: img.height,
            trimX: img.trimX,
            trimY: img.trimY
        };

        currentX += img.width + padding;
        shelfHeight = Math.max(shelfHeight, img.height);
    }

    const sheetPath = path.join(agentDir, 'agent.webp');
    await sharp({
        create: {
            width: maxWidth,
            height: totalHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
    .composite(composites)
    .webp({ lossless: true })
    .toFile(sheetPath);

    console.log(`Saved optimized sprite sheet to ${sheetPath}`);

    // 7. Audio Spritesheet (Original logic kept, but preserving existing audioAtlas)
    let audioAtlas = existingDefinition.audioAtlas || {};
    if (Object.keys(audioAtlas).length === 0) {
        const audioToProcess = new Set<string>();
        Object.values(definition.animations).forEach(anim => {
            anim.frames.forEach(frame => {
                if (frame.soundEffect) {
                    const soundName = frame.soundEffect.split(/[\\/]/).pop() || frame.soundEffect;
                    audioToProcess.add(soundName.toLowerCase().endsWith('.wav') ? soundName.toLowerCase() : `${soundName.toLowerCase()}.wav`);
                }
            });
        });

        const audioList = Array.from(audioToProcess).sort();
        if (audioList.length > 0) {
            const tempDir = path.join(agentDir, 'temp_audio');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

            const audioPaths: string[] = [];
            try {
                const silencePath = path.join(tempDir, 'silence.wav');
                const silenceResult = spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', '0.5', silencePath]);
                if (silenceResult.status !== 0) {
                    throw new Error(`ffmpeg failed to create silence: ${silenceResult.stderr?.toString() || 'unknown error'}`);
                }

                let currentTime = 0;
                const silenceDuration = 0.5;

                for (const sound of audioList) {
                    let soundPath = path.join(agentDir, 'Audio', sound);
                    if (!fs.existsSync(soundPath)) {
                        soundPath = path.join(agentDir, 'audio', sound);
                    }
                    if (!fs.existsSync(soundPath)) {
                        const base = sound.replace(/\.wav$/, '');
                        soundPath = path.join(agentDir, 'Audio', base);
                        if (!fs.existsSync(soundPath)) soundPath = path.join(agentDir, 'audio', base);
                    }

                    if (fs.existsSync(soundPath)) {
                        const ffprobeResult = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', soundPath]);
                        if (ffprobeResult.status !== 0) {
                            console.warn(`ffprobe failed for ${soundPath}: ${ffprobeResult.stderr?.toString() || 'unknown error'}`);
                            continue;
                        }

                        const durationStr = ffprobeResult.stdout.toString().trim();
                        const duration = parseFloat(durationStr);

                        audioAtlas[sound] = {
                            start: currentTime,
                            end: currentTime + duration
                        };

                        audioPaths.push(soundPath);
                        audioPaths.push(silencePath);
                        currentTime += duration + silenceDuration;
                    } else {
                        console.warn(`Could not find audio file: ${sound}`);
                    }
                }

                if (audioPaths.length > 0) {
                    const filterComplex = audioPaths.map((_, i) => `[${i}:a]`).join('') + `concat=n=${audioPaths.length}:v=0:a=1[a]`;
                    const args = ['-y'];
                    audioPaths.forEach(p => {
                        args.push('-i', p);
                    });
                    args.push('-filter_complex', filterComplex, '-map', '[a]', '-c:a', 'libvorbis');
                    const outputWebm = path.join(agentDir, 'agent.webm');
                    args.push(outputWebm);

                    const ffmpegResult = spawnSync('ffmpeg', args);
                    if (ffmpegResult.status !== 0) {
                        throw new Error(`ffmpeg failed to create spritesheet: ${ffmpegResult.stderr?.toString() || 'unknown error'}`);
                    }
                    console.log(`Saved audio spritesheet to ${outputWebm}`);
                }
            } catch (e) {
                console.warn(`Skipping audio spritesheet generation: ${e instanceof Error ? e.message : 'ffmpeg not found or failed.'}`);
            }
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    }

    // 8. Save agent.json
    (definition as any).atlas = atlas;
    (definition as any).audioAtlas = audioAtlas;
    fs.writeFileSync(jsonPath, JSON.stringify(definition, null, 2));
    console.log(`Saved agent definition to ${jsonPath}`);
}

const targetDir = process.argv[2];
if (!targetDir) {
    console.error('Usage: npx tsx scripts/optimize-agent.ts <agent_directory>');
    process.exit(1);
}

optimizeAgent(targetDir).catch(console.error);
