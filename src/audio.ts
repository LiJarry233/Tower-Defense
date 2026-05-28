// Audio Manager — Web Audio API, preloaded MP3
const cache = new Map<string, AudioBuffer>();
let audioCtx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

export async function preloadSounds() {
  const files = [
    "bgm", "fire", "bomb", "equipment", "leve_up", "attatchment", "far_attatchment", "normaldeath",
  ];
  for (const name of files) {
    const resp = await fetch(`/bgm/${name}.mp3`);
    const buf = await resp.arrayBuffer();
    const decoded = await ctx().decodeAudioData(buf);
    cache.set(name, decoded);
  }
  console.log("Audio preloaded:", cache.size, "sounds");
}

export function playSound(name: string, loop = false, volume = 0.5) {
  const buf = cache.get(name);
  if (!buf) return;
  const source = ctx().createBufferSource();
  source.buffer = buf;
  source.loop = loop;
  const gain = ctx().createGain();
  gain.gain.value = volume;
  source.connect(gain).connect(ctx().destination);
  source.start();
  return source;
}

let _bgmSource: AudioBufferSourceNode | null = null;
export function startBGM() {
  stopBGM();
  _bgmSource = playSound("bgm", true, 0.3) as AudioBufferSourceNode;
}

export function stopBGM() {
  if (_bgmSource) { _bgmSource.stop(); _bgmSource = null; }
}
