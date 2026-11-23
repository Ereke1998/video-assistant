// Единый источник данных: тайминги сцен, тексты озвучки, список SFX.
// Используется и Remotion-композицией, и скриптами генерации аудио (scripts/*.ts).

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const DURATION_IN_FRAMES = 1200; // 40 секунд

// Безопасная зона: верхние и нижние 250 px без текста.
export const SAFE_TOP = 250;
export const SAFE_BOTTOM = 250;

export type SceneId = 1 | 2 | 3 | 4 | 5 | 6;

export type SceneDef = {
  id: SceneId;
  name: string;
  from: number; // первый кадр
  durationInFrames: number;
};

export const SCENES: SceneDef[] = [
  {id: 1, name: 'Зацепка', from: 0, durationInFrames: 180}, // 0:00–0:06
  {id: 2, name: 'Факт 1', from: 180, durationInFrames: 210}, // 0:06–0:13
  {id: 3, name: 'Роботы', from: 390, durationInFrames: 210}, // 0:13–0:20
  {id: 4, name: 'Факт 2', from: 600, durationInFrames: 210}, // 0:20–0:27
  {id: 5, name: 'Поворот', from: 810, durationInFrames: 180}, // 0:27–0:33
  {id: 6, name: 'Финал', from: 990, durationInFrames: 210}, // 0:33–0:40
];

export type VoiceSettings = {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
};

export type VoiceLine = {
  scene: SceneId;
  file: string; // относительно public/
  /** Текст, который уходит в TTS (может содержать теги вроде [whispers] для eleven_v3). */
  ttsText: string;
  /** Чистый текст для субтитров. Фразы разделены «|» — каждая часть станет отдельным экраном субтитров. */
  subtitle: string;
  modelId: string;
  voiceSettings: VoiceSettings;
  /** Сдвиг старта реплики от начала сцены, кадры. */
  offset: number;
};

const DEFAULT_SETTINGS: VoiceSettings = {stability: 0.5, similarity_boost: 0.75};

// TODO: проверить факты по оригиналам
// (сцена 2 — исследование MIT 2025 про эссе с ChatGPT;
//  сцена 4 — опрос Microsoft и Carnegie Mellon 2025 про доверие к ИИ и критическое мышление)
export const VOICE_LINES: VoiceLine[] = [
  {
    scene: 1,
    file: 'audio/voice-1.mp3',
    // Шёпот: проверено на практике (см. отчёт). eleven_multilingual_v2 с низкой stability шёпот не даёт,
    // eleven_v3 с тегом [whispers] — слабо и дольше (8,2 c). Лучший результат для голоса Gleb —
    // eleven_v4 с тегом [whispers] перед каждой фразой: заметно больше «воздуха», 6,2 c.
    ttsText:
      '[whispers] Ты только что хотел что-то спросить. [whispers] Но ещё не решил, что думаешь. [whispers] Ты всё ещё думаешь сам?',
    subtitle:
      'Ты только что хотел|что-то спросить.|Но ещё не решил,|что думаешь.|Ты всё ещё|думаешь сам?',
    modelId: 'eleven_v4',
    voiceSettings: {stability: 0.5, similarity_boost: 0.75},
    offset: 2,
  },
  {
    scene: 2,
    file: 'audio/voice-2.mp3',
    // TODO: проверить факты по оригиналам
    // Исходный текст сценария (11,5 c при сцене 7 c) сокращён по решению автора:
    // «В небольшом исследовании MIT 2025 года те, кто писал эссе с ChatGPT, показали самую низкую
    //  активность мозга, а текст потом не смогли пересказать». Год 2025 вынесен в экранный текст.
    ttsText:
      'Исследование MIT: с ChatGPT мозг работал слабее всех, а свой текст потом не могли пересказать.',
    subtitle:
      'Исследование MIT:|с ChatGPT мозг|работал слабее всех,|а свой текст потом|не могли пересказать.',
    modelId: 'eleven_multilingual_v2',
    voiceSettings: DEFAULT_SETTINGS,
    offset: 4,
  },
  {
    scene: 3,
    file: 'audio/voice-3.mp3',
    ttsText: 'Иногда ты не выбираешь, а просто нажимаешь «принять».',
    subtitle: 'Иногда ты не выбираешь,|а просто нажимаешь|«принять».',
    modelId: 'eleven_multilingual_v2',
    voiceSettings: DEFAULT_SETTINGS,
    offset: 20,
  },
  {
    scene: 4,
    file: 'audio/voice-4.mp3',
    // TODO: проверить факты по оригиналам
    // Исходный текст сценария (10,4 c при сцене 7 c) сокращён по решению автора:
    // «Опрос Microsoft и Carnegie Mellon 2025 года показал: чем больше люди доверяют ИИ, тем меньше
    //  усилий они тратят на критическое мышление». Год 2025 вынесен в экранный текст.
    ttsText:
      'Опрос Microsoft и Carnegie Mellon: чем больше люди доверяют ИИ, тем меньше думают критически.',
    subtitle:
      'Опрос Microsoft|и Carnegie Mellon:|чем больше люди|доверяют ИИ,|тем меньше думают|критически.',
    modelId: 'eleven_multilingual_v2',
    voiceSettings: DEFAULT_SETTINGS,
    offset: 4,
  },
  {
    scene: 5,
    file: 'audio/voice-5.mp3',
    ttsText: 'Мышление похоже на мышцу. Не тренируешь — слабеет. Тренируешь — растёт.',
    subtitle: 'Мышление похоже|на мышцу.|Не тренируешь —|слабеет.|Тренируешь —|растёт.',
    modelId: 'eleven_multilingual_v2',
    voiceSettings: DEFAULT_SETTINGS,
    offset: 6,
  },
  {
    scene: 6,
    file: 'audio/voice-6.mp3',
    ttsText:
      'Сегодня ответь на один вопрос без ИИ. Напиши в комментариях, что получилось.',
    subtitle:
      'Сегодня ответь|на один вопрос|без ИИ.|Напиши в комментариях,|что получилось.',
    modelId: 'eleven_multilingual_v2',
    voiceSettings: DEFAULT_SETTINGS,
    offset: 6,
  },
];

export type SfxDef = {
  file: string;
  /** Промпт для POST /v1/sound-generation (до 3 вариантов: каждая следующая попытка — уточнённый текст). */
  prompts: string[];
  durationSeconds: number;
  scene: SceneId;
  /** Абсолютный кадр старта в ролике. */
  at: number;
  volume: number;
};

export const SFX: SfxDef[] = [
  {
    file: 'audio/sfx-cursor.mp3',
    prompts: [
      'Soft quiet single computer mouse click, then faint blinking text cursor ticks in a silent dark room',
      'Very quiet soft UI click, gentle digital tick, minimal, clean, no music',
      'Single gentle computer click sound, close mic, quiet, isolated',
    ],
    durationSeconds: 2,
    scene: 1,
    at: 10,
    volume: 0.45,
  },
  {
    file: 'audio/sfx-typing.mp3',
    prompts: [
      'Typing on a laptop keyboard, soft keystrokes, quiet room, close up',
      'Gentle typing on a low-profile keyboard, steady soft key presses, isolated',
      'Quiet laptop keyboard typing, clean, no background noise',
    ],
    durationSeconds: 3,
    scene: 1,
    at: 34,
    volume: 0.5,
  },
  {
    file: 'audio/sfx-hologram.mp3',
    prompts: [
      'Sci-fi hologram flickering on with electric crackle and a low steady hum',
      'Futuristic holographic display activating, electric static crackle, deep hum',
      'Electric buzzing hum with crackling sparks, sci-fi hologram projector',
    ],
    durationSeconds: 2,
    scene: 2,
    at: 260,
    volume: 0.5,
  },
  {
    file: 'audio/sfx-crowd.mp3',
    prompts: [
      'Quiet distant crowd murmur in a city square at night, soft traffic ambience',
      'Low indistinct crowd walla and urban plaza ambience, muffled, calm',
      'Soft city square ambience with distant people murmuring, low volume',
    ],
    durationSeconds: 5,
    scene: 3,
    at: 392,
    volume: 0.45,
  },
  {
    file: 'audio/sfx-glitch.mp3',
    prompts: [
      'Short digital glitch, quick data corruption stutter, electronic',
      'Brief sharp digital distortion glitch with bit-crush stutter',
      'Quick electronic glitch zap, short and clean',
    ],
    durationSeconds: 1,
    scene: 3,
    at: 528,
    volume: 0.55,
  },
  {
    file: 'audio/sfx-paper.mp3',
    prompts: [
      'Single sheet of paper gently rustling and fluttering in the air',
      'Soft paper rustle, a page moving slowly, close up, quiet',
      'Gentle rustling of one paper sheet, isolated',
    ],
    durationSeconds: 2,
    scene: 4,
    at: 606,
    volume: 0.45,
  },
  {
    file: 'audio/sfx-pulse.mp3',
    prompts: [
      'Deep low pulsating heartbeat-like bass throb, cinematic, slow rhythm',
      'Low sub-bass pulse, slow rhythmic throbbing, dark cinematic tension',
      'Slow deep bass pulse beats, cinematic, ominous',
    ],
    durationSeconds: 3,
    scene: 5,
    at: 828,
    volume: 0.55,
  },
  {
    file: 'audio/sfx-pen.mp3',
    prompts: [
      'Ballpoint pen writing on paper, scratching handwriting sounds, close up, quiet room',
      'Pen scribbling on a paper notebook, soft scratching strokes, isolated',
      'Close up handwriting with a pen on paper, gentle scratching',
    ],
    durationSeconds: 4,
    scene: 6,
    at: 1000,
    volume: 0.5,
  },
];

export const MUSIC_FILE = 'audio/music.mp3';
