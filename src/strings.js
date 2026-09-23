export const LANGS = ['uk', 'en'];

export const STRINGS = {
  uk: {
    subtitle: 'Курка проти морквин і зомбі',
    play: 'Грати',
    resume: 'Продовжити',
    menu: 'Головне меню',
    next: 'Далі',
    tryAgain: 'Спробувати знову',
    playAgain: 'Грати знову',
    level: 'Рівень',
    paused: 'Пауза',
    levelComplete: 'Рівень пройдено!',
    gameOver: 'Кінець гри',
    victory: 'Перемога!',
    allLevelsDone: 'Усі рівні пройдено!',
    comingSoon: 'Скоро нові рівні!',
    crystals: 'Кристали',
    points: 'Бали',
    best: 'Рекорд',
    soundOn: 'Звук: увімк.',
    soundOff: 'Звук: вимк.',
    otherLanguage: 'English',
    keyboardNeeded: 'Для гри потрібна клавіатура',
    walk: 'йти',
    jump: 'стрибок',
    pause: 'пауза',
    sound: 'звук',
    language: 'мова',
    confirm: 'далі',
  },
  en: {
    subtitle: 'A chicken versus carrots and zombies',
    play: 'Play',
    resume: 'Continue',
    menu: 'Main menu',
    next: 'Next',
    tryAgain: 'Try again',
    playAgain: 'Play again',
    level: 'Level',
    paused: 'Paused',
    levelComplete: 'Level complete!',
    gameOver: 'Game over',
    victory: 'You win!',
    allLevelsDone: 'All levels done!',
    comingSoon: 'New levels coming soon!',
    crystals: 'Crystals',
    points: 'Points',
    best: 'Best',
    soundOn: 'Sound: on',
    soundOff: 'Sound: off',
    otherLanguage: 'Українська',
    keyboardNeeded: 'You need a keyboard to play',
    walk: 'walk',
    jump: 'jump',
    pause: 'pause',
    sound: 'sound',
    language: 'language',
    confirm: 'next',
  },
};

export function t(key, lang = 'uk') {
  return STRINGS[lang]?.[key] ?? STRINGS.uk[key] ?? key;
}

export function localized(text, lang = 'uk') {
  if (typeof text === 'string') return text;
  return text?.[lang] ?? text?.uk ?? '';
}

export function nextLang(lang) {
  return LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length];
}
