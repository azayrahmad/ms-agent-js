import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

const AGENTS_DIR = path.join(process.cwd(), 'public', 'agents');

function hasFFmpeg() {
    const result = spawnSync('ffmpeg', ['-version']);
    return result.status === 0;
}

function tryInstallFFmpeg() {
    console.log('ffmpeg not found. Attempting to install...');
    // This is a best effort and might fail depending on the environment
    const result = spawnSync('sudo', ['apt-get', 'update'], { stdio: 'inherit' });
    if (result.status !== 0) {
        console.warn('Failed to update package lists.');
    }
    const installResult = spawnSync('sudo', ['apt-get', 'install', '-y', 'ffmpeg'], { stdio: 'inherit' });
    return installResult.status === 0;
}

async function prepareAgents() {
    if (!fs.existsSync(AGENTS_DIR)) {
        console.warn(`Agents directory not found: ${AGENTS_DIR}`);
        return;
    }

    let ffmpegAvailable = hasFFmpeg();
    if (!ffmpegAvailable) {
        ffmpegAvailable = tryInstallFFmpeg();
    }

    if (!ffmpegAvailable) {
        console.warn('WARNING: ffmpeg is not installed and could not be installed. Audio optimization will be skipped.');
    }

    const agents = fs.readdirSync(AGENTS_DIR);

    for (const agentName of agents) {
        const agentPath = path.join(AGENTS_DIR, agentName);
        if (!fs.statSync(agentPath).isDirectory()) continue;

        const files = fs.readdirSync(agentPath);
        const hasAcd = files.some(f => f.toLowerCase().endsWith('.acd'));
        const hasJson = files.includes('agent.json');
        const hasWebp = files.includes('agent.webp');
        const hasWebm = files.includes('agent.webm');

        const needsOptimization = hasAcd && (!hasJson || !hasWebp || !hasWebm);

        if (needsOptimization) {
            console.log(`Agent "${agentName}" needs optimization.`);
            const result = spawnSync('npx', ['tsx', 'scripts/optimize-agent.ts', agentPath], { stdio: 'inherit' });
            if (result.status !== 0) {
                console.error(`Failed to optimize agent "${agentName}".`);
            }
        } else {
            if (hasJson && hasWebp && hasWebm) {
                console.log(`Agent "${agentName}" is already optimized.`);
            } else if (hasAcd) {
                 console.log(`Agent "${agentName}" has ACD but is already optimized (all output files exist).`);
            } else {
                console.warn(`Agent "${agentName}" is missing both ACD and optimized files. Skipping.`);
            }
        }
    }
}

prepareAgents().catch(console.error);
