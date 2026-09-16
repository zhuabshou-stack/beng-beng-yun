// 《蹦蹦云》基础音频生成脚本
// 全部音效与 BGM 由本脚本程序化合成（正弦波 + 包络），无任何第三方素材来源，规避版权与平台合规风险。
// 运行：node tools/generate-audio.js
// 输出：assets/resources/audio/*.wav（16bit 单声道 22050Hz）

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 22050;
const OUTPUT_DIR = path.join(__dirname, '..', 'assets', 'resources', 'audio');

// 把 [-1,1] 浮点样本写为 16bit PCM WAV
function writeWav(name, samples) {
  const dataLength = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataLength);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // 单声道
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, name), buffer);
  console.log(`生成 ${name}：${(dataLength / 1024).toFixed(1)} KB`);
}

const seconds = (s) => Math.round(s * SAMPLE_RATE);

// 单个音符：频率、起止时间、峰值、attack/release 时长、波形混合
function tone(buf, freq, start, dur, peak = 0.6, attack = 0.008, release = 0.09, blend = 0) {
  const startIdx = seconds(start);
  const length = seconds(dur);
  for (let i = 0; i < length; i += 1) {
    const t = i / SAMPLE_RATE;
    const idx = startIdx + i;
    if (idx >= buf.length) break;
    const envelope = Math.min(1, t / attack) * Math.min(1, Math.max(0, (dur - t)) / release);
    const sine = Math.sin(2 * Math.PI * freq * t);
    const square = Math.sign(sine) * 0.35 + sine * 0.65; // 柔化方波
    buf[idx] += (sine * (1 - blend) + square * blend) * envelope * peak;
  }
}

// 指数衰减的扫频音（跳跃 / 弹簧）
function sweep(buf, from, to, dur, peak = 0.6, wobble = 0) {
  const length = seconds(dur);
  let phase = 0;
  for (let i = 0; i < length; i += 1) {
    const t = i / SAMPLE_RATE;
    const progress = i / length;
    const freq = from + (to - from) * progress * progress;
    phase += (2 * Math.PI * freq) / SAMPLE_RATE;
    const envelope = Math.exp(-3.2 * progress);
    const vibrato = wobble ? 1 + Math.sin(2 * Math.PI * wobble * t) * 0.18 : 1;
    buf[i] = Math.sin(phase * vibrato) * envelope * peak;
  }
}

function silence(dur) {
  return new Float64Array(seconds(dur));
}

const generators = {
  // 轻点击
  'ui.wav': () => {
    const buf = silence(0.09);
    tone(buf, 660, 0, 0.08, 0.42, 0.004, 0.06);
    return buf;
  },
  // 起跳上扬
  'jump.wav': () => {
    const buf = silence(0.16);
    sweep(buf, 320, 640, 0.15, 0.5);
    return buf;
  },
  // 弹簧"啵英"
  'spring.wav': () => {
    const buf = silence(0.28);
    sweep(buf, 170, 780, 0.26, 0.55, 11);
    return buf;
  },
  // 金币双音
  'coin.wav': () => {
    const buf = silence(0.2);
    tone(buf, 988, 0, 0.09, 0.45, 0.003, 0.05);
    tone(buf, 1319, 0.07, 0.12, 0.5, 0.003, 0.1);
    return buf;
  },
  // 星光琶音
  'star.wav': () => {
    const buf = silence(0.3);
    [1319, 1568, 1976].forEach((freq, i) => tone(buf, freq, i * 0.08, 0.14, 0.4, 0.004, 0.1));
    return buf;
  },
  // 连击两连音
  'combo.wav': () => {
    const buf = silence(0.16);
    tone(buf, 523, 0, 0.07, 0.45, 0.003, 0.04);
    tone(buf, 784, 0.06, 0.1, 0.5, 0.003, 0.08);
    return buf;
  },
  // 里程碑小号角
  'milestone.wav': () => {
    const buf = silence(0.56);
    [523, 659, 784, 1047].forEach((freq, i) => tone(buf, freq, i * 0.12, 0.2, 0.42, 0.01, 0.12, i === 3 ? 0.25 : 0));
    return buf;
  },
  // 温和下落收尾
  'gameOver.wav': () => {
    const buf = silence(0.66);
    [659, 523, 440, 349].forEach((freq, i) => tone(buf, freq, i * 0.15, 0.24, 0.42, 0.01, 0.16));
    return buf;
  },
  // 爆炸：低频冲击 + 白噪碎裂（0.5s，休闲游戏爆炸音标准结构）
  'explode.wav': () => {
    const length = seconds(0.5);
    const buf = new Float64Array(length);
    let seed = 7;
    const noise = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return (seed / 2147483648) * 2 - 1;
    };
    for (let i = 0; i < length; i += 1) {
      const t = i / SAMPLE_RATE;
      const progress = i / length;
      const boom = Math.sin(2 * Math.PI * (95 - 55 * progress) * t) * Math.exp(-6 * progress);
      const crackle = noise() * Math.exp(-9 * progress);
      buf[i] = (boom * 0.8 + crackle * 0.4) * 0.75;
    }
    return buf;
  },
  // BGM：C-Am-F-G 四和弦垫 + 柔和琶音，和弦窗口首尾相接可无缝循环
  'bgm.wav': () => {
    const chordDur = 2.4;
    const chords = [
      [130.81, 196.0, 261.63, 329.63, 392.0],  // C:  C3 G3 C4 E4 G4
      [110.0, 164.81, 220.0, 261.63, 329.63],  // Am: A2 E3 A3 C4 E4
      [87.31, 174.61, 220.0, 261.63, 349.23],  // F:  F2 F3 A3 C4 F4
      [98.0, 196.0, 246.94, 293.66, 392.0],    // G:  G2 G3 B3 D4 G4
    ];
    const buf = silence(chordDur * chords.length);
    chords.forEach((chord, chordIndex) => {
      const start = chordIndex * chordDur;
      chord.forEach((freq, noteIndex) => {
        tone(buf, freq, start + 0.02, chordDur - 0.06, noteIndex === 0 ? 0.16 : 0.1, 0.3, 0.4);
      });
      // 每个和弦窗口内 4 个上行琶音点缀
      [2, 3, 4, 3].forEach((noteIndex, i) => {
        tone(buf, chords[chordIndex][noteIndex] * 2, start + 0.3 + i * 0.5, 0.22, 0.06, 0.01, 0.16);
      });
    });
    return buf;
  },
};

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
for (const [name, generate] of Object.entries(generators)) {
  writeWav(name, generate());
}
console.log('全部音频生成完毕。');
