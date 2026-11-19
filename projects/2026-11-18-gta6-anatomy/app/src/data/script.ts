/**
 * ЕДИНЫЙ ИСТОЧНИК ПРАВДЫ ДЛЯ РОЛИКА.
 *
 * Текст озвучки, сцены, точки синхронизации и SFX описываются здесь.
 * Из этого файла:
 *   - scripts/generate-voiceover.mjs генерирует озвучку (ElevenLabs, с таймстемпами);
 *   - scripts/build-timeline.mjs собирает src/data/timeline.generated.json
 *     (абсолютные тайминги слов, сцен, SFX, субтитров);
 *   - Remotion рендерит видео по timeline.generated.json.
 *
 * Разметка текста:  [что показать в субтитрах|как произнести диктору]
 *   пример: [212 ГБ|двести двенадцать гигабайт]
 * Эмоции (ElevenLabs eleven_v3): {excited}, {dramatic}, {serious}, {whispers}… — в субтитры не попадают.
 * Ударение для TTS: «+» перед ударной гласной — [Xbox Series|иксбокс с+ириес] или з+амок (в субтитрах «+» не видно).
 *
 * cue — фраза из ТЕКСТА СУБТИТРОВ (без учёта регистра/пунктуации/ё),
 *   в момент первого слова которой стартует сцена. Ищется после предыдущей сцены.
 *   "@start" — начало акта.
 * clip — имя файла B-roll в public/footage (без расширения); если файла нет — моушн-графика.
 * marks — дополнительные точки внутри сцены (фраза -> время), чтобы
 *   анимации внутри компонента попадали в слова диктора.
 *
 * Файл должен содержать только «стираемый» TypeScript (без enum/namespace),
 * т.к. его напрямую импортирует Node (type stripping).
 */

export type SfxName =
  | 'whoosh'
  | 'impact'
  | 'riser'
  | 'pop'
  | 'tick'
  | 'cash'
  | 'glitch'
  | 'scan'
  | 'siren'
  | 'bassdrop'
  | 'crowd'
  | 'coins'
  | 'typing'
  | 'notify'
  | 'stamp'
  | 'water'
  | 'heartbeat';

export type SfxCue = {
  name: SfxName;
  /** фраза-якорь; если не задана — старт сцены */
  cue?: string;
  /** смещение в секундах относительно якоря (может быть отрицательным) */
  offset?: number;
  /** 0..1 */
  volume?: number;
};

export type SceneType =
  | 'Countdown'
  | 'Hook'
  | 'YearsJump'
  | 'Generations'
  | 'Crowd'
  | 'OfficeClosed'
  | 'Question'
  | 'ActTitle'
  | 'BigNumber'
  | 'BudgetBars'
  | 'PriceTags'
  | 'RecordBadge'
  | 'Platforms'
  | 'Engine'
  | 'CopsAI'
  | 'SplitScreen'
  | 'MapPin'
  | 'ChaosTags'
  | 'Demand'
  | 'StockChart'
  | 'Views'
  | 'FinalPoll';

export type SceneDef = {
  id: string;
  type: SceneType;
  cue: string;
  props?: Record<string, unknown>;
  marks?: Record<string, string>;
  sfx?: SfxCue[];
};

export type ActDef = {
  id: 1 | 2 | 3 | 4;
  roman: string;
  title: string;
  /** план по ТЗ, сек */
  plannedStart: number;
  plannedEnd: number;
  /** пауза перед первым словом диктора внутри акта, сек */
  leadIn: number;
  /** «хвост» после последнего слова, сек */
  tail: number;
  /** текст на экране по ТЗ (для документации/проверки) */
  onScreen: string;
  /** слова, подсвечиваемые акцентным цветом в субтитрах */
  keywords: string[];
  text: string;
  scenes: SceneDef[];
};

export const PROJECT = {
  title: 'Анатомия главного релиза десятилетия: Вся правда о GTA 6',
  output: 'gta6_documentary.mp4',
  fps: 30,
  width: 1080,
  height: 1920,
};

export const ACTS: ActDef[] = [
  {
    id: 1,
    roman: 'I',
    title: 'НУЛЕВОЙ ПАЦИЕНТ',
    plannedStart: 0,
    plannedEnd: 18,
    leadIn: 1.3,
    tail: 0.35,
    onScreen: 'GTA 6 ВЫШЛА. 13 ЛЕТ ОЖИДАНИЯ.',
    keywords: ['планету', '13', 'лет', 'два', 'поколения', 'logitech', 'выходной', 'датой'],
    text:
      '{dramatic} Этот день... остановил планету! {dramatic tone} Между выходом пятой части в [13-м|тринадцатом] году ' +
      'и релизом шестой прошло ровно [13|тринадцать] лет. Сменилось два поколения консолей, ' +
      'выросло целое поколение геймеров, а компании вроде [Logitech|Логитек] {dramatic} официально дали ' +
      'сотрудникам выходной, просто чтобы те играли! {suspenseful} Но что на самом деле скрывается за этой датой?',
    scenes: [
      {id: 'countdown', type: 'Countdown', cue: '@start', props: {from: 3}, sfx: [
        {name: 'tick', offset: 0.0}, {name: 'tick', offset: 0.42}, {name: 'tick', offset: 0.84},
      ]},
      {id: 'hook', type: 'Hook', cue: 'этот день',
        props: {title: 'GTA 6', accent: 'ВЫШЛА', sub: '13 ЛЕТ ОЖИДАНИЯ'},
        sfx: [{name: 'impact', volume: 1}, {name: 'bassdrop', volume: 0.9}]},
      {id: 'years', type: 'YearsJump', cue: 'в 13-м',
        props: {from: 2013, to: 2026, label: 'ЛЕТ ОЖИДАНИЯ'},
        marks: {big: '13 лет'},
        sfx: [{name: 'whoosh'}, {name: 'impact', cue: '13 лет', volume: 0.8}]},
      {id: 'generations', type: 'Generations', cue: 'сменилось',
        props: {label: '2 ПОКОЛЕНИЯ КОНСОЛЕЙ', items: [
          {name: 'PS3 / X360', year: '2013', old: true},
          {name: 'PS4 / XBOX ONE', year: '2013+'},
          {name: 'PS5 / SERIES', year: '2020+'},
        ]},
        sfx: [{name: 'whoosh'}, {name: 'pop', offset: 0.25}, {name: 'pop', offset: 0.5}, {name: 'pop', offset: 0.75}]},
      {id: 'crowd', type: 'Crowd', cue: 'выросло',
        props: {label: 'ЦЕЛОЕ ПОКОЛЕНИЕ ГЕЙМЕРОВ', clip: 'crowd'},
        sfx: [{name: 'whoosh'}, {name: 'crowd', offset: 0.1, volume: 0.45}, {name: 'notify', offset: 0.4, volume: 0.5}]},
      {id: 'office', type: 'OfficeClosed', cue: 'компании',
        props: {company: 'LOGITECH', note: 'ВЫХОДНОЙ — ЧТОБЫ ИГРАТЬ', clip: 'office'},
        marks: {stamp: 'выходной'},
        sfx: [{name: 'whoosh'}, {name: 'stamp', cue: 'выходной', volume: 0.9}, {name: 'impact', cue: 'выходной', volume: 0.5}]},
      {id: 'question', type: 'Question', cue: 'но что',
        props: {text: 'ЧТО СКРЫВАЕТСЯ', accent: 'ЗА ДАТОЙ?'},
        sfx: [{name: 'glitch'}, {name: 'heartbeat', offset: 0.2, volume: 0.6}]},
    ],
  },
  {
    id: 2,
    roman: 'II',
    title: 'ЦЕНА ВОПРОСА',
    plannedStart: 18,
    plannedEnd: 38,
    leadIn: 0.15,
    tail: 0.35,
    onScreen: 'БЮДЖЕТ $2,000,000,000 | 212 ГБ НА ДИСКЕ',
    keywords: ['$2 млрд', 'мстителей', 'аватаров', '212 гб', '$80', '$100', 'рекорд', 'пк', 'ps5', 'xbox series'],
    text:
      '{dramatic tone} Акт второй: цена вопроса. Бюджет разработки перевалил за [$2 млрд|два миллиарда долларов] — ' +
      '{dramatic} это дороже любых «Мстителей» и «Аватаров» вместе взятых. Игра весит чудовищные ' +
      '[212 ГБ|двести двенадцать гигабайт], ст+оит [$80|восемьдесят баксов] за базу и [$100|сто] за ультимейт-версию. ' +
      '{dramatic} При этом предзаказы побили абсолютный мировой рекорд индустрии ещё за сутки до старта. ' +
      '{ominous} Но купить — полбеды. Полноценного порта на [ПК|пэ-ка] нет и в помине: играют только владельцы ' +
      '[PS5|пи-эс пять] и [Xbox Series|иксбокс с+ириес].',
    scenes: [
      {id: 'title2', type: 'ActTitle', cue: '@start', props: {title: 'ЦЕНА ВОПРОСА'},
        sfx: [{name: 'riser', offset: -1.6, volume: 0.6}, {name: 'impact'}]},
      {id: 'budget', type: 'BigNumber', cue: 'бюджет',
        props: {prefix: '$', value: 2000000000, label: 'БЮДЖЕТ РАЗРАБОТКИ', note: 'оценка СМИ', format: 'full'},
        marks: {land: '$2 млрд'},
        sfx: [{name: 'whoosh'}, {name: 'cash', cue: '$2 млрд'}, {name: 'coins', cue: '$2 млрд', offset: 0.1, volume: 0.6}]},
      {id: 'bars', type: 'BudgetBars', cue: 'это дороже',
        props: {unit: 'млн $', note: 'бюджеты производства, оценки СМИ', items: [
          {label: 'МСТИТЕЛИ: ФИНАЛ', value: 356},
          {label: 'АВАТАР: ПУТЬ ВОДЫ', value: 400},
          {label: 'GTA VI', value: 2000, highlight: true},
        ]},
        marks: {hero: 'вместе взятых'},
        sfx: [{name: 'pop'}, {name: 'pop', offset: 0.3}, {name: 'impact', cue: 'вместе взятых', volume: 0.8}]},
      {id: 'size', type: 'BigNumber', cue: 'игра весит',
        props: {value: 212, suffix: ' ГБ', label: 'НА ДИСКЕ', bar: true},
        marks: {land: '212 ГБ'},
        sfx: [{name: 'whoosh'}, {name: 'impact', cue: '212 ГБ', volume: 0.7}]},
      {id: 'price', type: 'PriceTags', cue: 'стоит',
        props: {items: [{price: '$79.99', label: 'STANDARD'}, {price: '$99.99', label: 'ULTIMATE'}]},
        marks: {second: '$100'},
        sfx: [{name: 'cash'}, {name: 'cash', cue: '$100', volume: 0.6}]},
      {id: 'record', type: 'RecordBadge', cue: 'при этом',
        props: {title: 'МИРОВОЙ РЕКОРД', sub: 'ПРЕДЗАКАЗОВ', note: 'ЗА 24 ЧАСА ДО СТАРТА'},
        marks: {land: 'рекорд'},
        sfx: [{name: 'whoosh'}, {name: 'impact', cue: 'рекорд'}]},
      {id: 'platforms', type: 'Platforms', cue: 'но купить',
        props: {items: [{name: 'PS5', ok: true}, {name: 'XBOX SERIES', ok: true}, {name: 'ПК', ok: false}]},
        marks: {pc: 'ПК', consoles: 'играют только'},
        sfx: [{name: 'whoosh'}, {name: 'glitch', cue: 'нет и в помине', volume: 0.7},
          {name: 'pop', cue: 'PS5'}, {name: 'pop', cue: 'Xbox Series'}]},
    ],
  },
  {
    id: 3,
    roman: 'III',
    title: 'ТЕХНОЛОГИИ',
    plannedStart: 38,
    plannedEnd: 55,
    leadIn: 0.15,
    tail: 0.35,
    onScreen: 'ДВИЖОК RAGE 9 | УМНЫЙ ИИ КОПОВ',
    keywords: ['rage', 'с нуля', 'камерам', 'свидетелям', 'пугающе', 'леонида', 'флоридой', 'аллигаторами'],
    text:
      '{dramatic tone} Акт третий: технологии. [Rockstar|Рокстар] переписали движок [RAGE|рейдж] с нуля. ' +
      '{ominous} Полиция теперь не просто стреляет — она анализирует твои действия по камерам и свидетелям, ' +
      'а физика вод+ы и поведение толп+ы выглядят пугающе реально! {dramatic} Штат Леонида, вдохновлённый Флоридой, ' +
      'живёт своей жизнью: пока одни штурмуют магазины, другие устраивают безумие на болотах с аллигаторами.',
    scenes: [
      {id: 'title3', type: 'ActTitle', cue: '@start', props: {title: 'ТЕХНОЛОГИИ'},
        sfx: [{name: 'riser', offset: -1.6, volume: 0.6}, {name: 'impact'}]},
      {id: 'engine', type: 'Engine', cue: 'rockstar',
        props: {name: 'RAGE 9', tag: 'ПЕРЕПИСАН С НУЛЯ'},
        marks: {tag: 'с нуля'},
        sfx: [{name: 'glitch'}, {name: 'typing', offset: 0.15, volume: 0.5}, {name: 'impact', cue: 'с нуля', volume: 0.6}]},
      {id: 'cops', type: 'CopsAI', cue: 'полиция',
        props: {title: 'УМНЫЙ ИИ КОПОВ'},
        marks: {cams: 'камерам', witnesses: 'свидетелям'},
        sfx: [{name: 'siren', volume: 0.35}, {name: 'scan', cue: 'камерам'}, {name: 'scan', cue: 'свидетелям'}]},
      {id: 'split', type: 'SplitScreen', cue: 'а физика',
        props: {
          caption: 'ФИЗИКА ВОДЫ И ТОЛПЫ',
          left: {title: 'GTA V', year: '2013', clip: 'gta5'},
          right: {title: 'GTA VI', year: '2026', clip: 'gta6'},
        },
        marks: {crowd: 'поведение толпы'},
        sfx: [{name: 'whoosh'}, {name: 'impact', offset: 0.1, volume: 0.5}, {name: 'water', offset: 0.2, volume: 0.45}]},
      {id: 'leonida', type: 'MapPin', cue: 'штат',
        props: {title: 'LEONIDA', sub: '≈ ФЛОРИДА', city: 'VICE CITY'},
        sfx: [{name: 'whoosh'}, {name: 'pop', offset: 0.3}]},
      {id: 'chaos', type: 'ChaosTags', cue: 'пока одни',
        props: {items: ['ШТУРМ МАГАЗИНОВ', 'БЕЗУМИЕ НА БОЛОТАХ', 'АЛЛИГАТОРЫ']},
        marks: {a: 'штурмуют', b: 'безумие', c: 'аллигаторами'},
        sfx: [{name: 'pop', cue: 'штурмуют'}, {name: 'pop', cue: 'безумие'}, {name: 'impact', cue: 'аллигаторами', volume: 0.6}]},
    ],
  },
  {
    id: 4,
    roman: 'IV',
    title: 'ЭКОНОМИКА ХАЙПА',
    plannedStart: 55,
    plannedEnd: 75,
    leadIn: 0.15,
    tail: 2.6,
    onScreen: 'КТО ПОДНИМЕТ НА РЕЛИЗЕ?',
    keywords: ['зарабатывает', 'последние', 'состояния', 'дефиците', 'миллионниках', 'разделился', 'лагере', 'пк', 'комментариях'],
    text:
      '{dramatic tone} Акт четвёртый: кто зарабатывает на релизе? Пока одни отдают последние деньги за консоли, ' +
      'другие делают состояния на дефиците железа и роликах-миллионниках с разбором пасх+алок. ' +
      '{dramatic} Мир... разделился! {suspenseful} А ты в каком лагере? Уж+е запускаешь шестёрку или ждёшь порт на [ПК|пэ-ка]? ' +
      'Пиши в комментариях!',
    scenes: [
      {id: 'title4', type: 'ActTitle', cue: '@start',
        props: {title: 'ЭКОНОМИКА ХАЙПА', question: 'КТО ПОДНИМЕТ НА РЕЛИЗЕ?'},
        sfx: [{name: 'riser', offset: -1.6, volume: 0.6}, {name: 'impact'}]},
      {id: 'demand', type: 'Demand', cue: 'пока одни',
        props: {label: 'ПОСЛЕДНИЕ ДЕНЬГИ', sub: 'НА КОНСОЛИ'},
        sfx: [{name: 'whoosh'}, {name: 'coins', offset: 0.3, volume: 0.6}, {name: 'stamp', offset: 1.6, volume: 0.8}]},
      {id: 'stocks', type: 'StockChart', cue: 'другие делают',
        props: {ticker: 'TAKE-TWO', label: 'АКЦИИ', tag: 'ДЕФИЦИТ ЖЕЛЕЗА'},
        marks: {tag: 'дефиците'},
        sfx: [{name: 'riser', volume: 0.4}, {name: 'cash', cue: 'дефиците', volume: 0.6}]},
      {id: 'views', type: 'Views', cue: 'роликах',
        props: {value: 1000000, label: 'ПРОСМОТРОВ', tag: 'РАЗБОР ПАСХАЛОК'},
        sfx: [{name: 'whoosh'}, {name: 'notify', offset: 0.3, volume: 0.6}, {name: 'notify', offset: 0.9, volume: 0.45}, {name: 'pop', offset: 1.4}]},
      {id: 'poll', type: 'FinalPoll', cue: 'мир разделился',
        props: {
          headline: 'МИР РАЗДЕЛИЛСЯ',
          question: 'А ТЫ В КАКОМ ЛАГЕРЕ?',
          a: {icon: 'pad', label: 'ИГРАЮ НА КОНСОЛИ'},
          b: {icon: 'pc', label: 'ЖДУ ПОРТ НА ПК'},
          cta: 'ПИШИ В КОММЕНТАРИЯХ',
        },
        marks: {question: 'а ты', a: 'уже запускаешь', b: 'или ждешь', cta: 'пиши'},
        sfx: [{name: 'impact'}, {name: 'bassdrop', volume: 0.7}, {name: 'pop', cue: 'уже запускаешь'}, {name: 'pop', cue: 'или ждешь'},
          {name: 'whoosh', cue: 'пиши'}]},
    ],
  },
];

/** Настройки озвучки (переопределяются env-переменными в scripts/generate-voiceover.mjs) */
export const VOICE = {
  /**
   * piper      — локальный нативный русский голос (бесплатно), тайминги через forced alignment ElevenLabs.
   * elevenlabs — ElevenLabs TTS. На free-тарифе доступны только англоязычные premade-голоса (акцент!);
   *              русские голоса из библиотеки (Mark Rubins – Facts, Nikolay, Alexandr Vlasov) — с тарифа Starter.
   */
  provider: 'elevenlabs' as 'piper' | 'elevenlabs',
  /** ускорение ffmpeg atempo без смены тона; 1 — естественный темп */
  tempo: 1.25,
  /** паузы длиннее (сек) сжимаются до этой длины — плотный темп Reels; 0 — не трогать */
  maxPause: 0.25,
  piper: {
    model: 'ru-irinia-medium',
    url: 'https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-ru-irinia-medium.tar.gz',
    /** >1 — медленнее */
    lengthScale: 0.87,
    noiseScale: 0.5,
    noiseW: 0.7,
    /** паузы после . ! / ? / :  (сек) */
    pause: 0.3,
    pauseQuestion: 0.45,
    pauseColon: 0.22,
  },
  elevenlabs: {
    // Mark Rubins – Facts and Life Hacks (русский, с тарифа Starter). Альтернативы:
    // Nikolay 3EuKHIEZbSzrHGNmdYsx, Alexandr Vlasov txnCCHHGKmYIwrn7HfHQ
    voiceId: 'LmV7j80HF5QYSKe3sDtR',
    // eleven_v3 понимает теги эмоций {excited} и т.п.; stability: 0 = Creative (макс. эмоции), 0.5 = Natural
    modelId: 'eleven_v3',
    settings: {stability: 0.0, similarity_boost: 0.8, speed: 1.2},
  },
};

/** Генерация SFX через ElevenLabs Sound Effects. Можно заменить своими файлами в public/sfx/<name>.mp3 */
export const SFX_PROMPTS: Record<SfxName | 'music', {prompt: string; duration: number; loop?: boolean}> = {
  whoosh: {prompt: 'fast cinematic whoosh swipe transition, clean, no reverb tail', duration: 0.8},
  impact: {prompt: 'deep cinematic sub boom impact hit with short tail, trailer style', duration: 1.6},
  riser: {prompt: 'tension riser building up, synth noise sweep, ends abruptly', duration: 1.6},
  pop: {prompt: 'short UI pop click, bubbly, clean', duration: 0.5},
  tick: {prompt: 'single loud digital countdown beep tick, clean', duration: 0.5},
  cash: {prompt: 'cash register cha-ching with coins, short', duration: 1.0},
  glitch: {prompt: 'short digital glitch stutter, data corruption sound', duration: 0.7},
  scan: {prompt: 'futuristic UI scanning beep sweep, short', duration: 0.8},
  siren: {prompt: 'distant american police siren whoop, short', duration: 1.5},
  bassdrop: {prompt: 'massive 808 bass drop sub boom, trap style, deep', duration: 2},
  crowd: {prompt: 'huge stadium crowd cheering and screaming with excitement', duration: 3},
  coins: {prompt: 'pile of gold coins falling and jingling', duration: 1.5},
  typing: {prompt: 'fast mechanical keyboard typing burst, hacker', duration: 1.5},
  notify: {prompt: 'short bright smartphone notification ping', duration: 0.5},
  stamp: {prompt: 'heavy rubber stamp slam on desk, punchy', duration: 0.6},
  water: {prompt: 'ocean wave splash, short and clean', duration: 2},
  heartbeat: {prompt: 'two deep tense heartbeats, cinematic', duration: 1.5},
  music: {
    prompt: 'dark synthwave trap instrumental beat loop, 100 bpm, punchy drums, deep 808 bass, retro 80s synth pads, no vocals',
    duration: 22,
    loop: true,
  },
};
