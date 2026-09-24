export const LANGS = ['pl', 'uk', 'en'];

export const DEFAULT_LANG = 'pl';

export const STRINGS = {
  pl: {
    subtitle: 'Kurka kontra marchewki i zombie',
    play: 'Graj',
    chooseLevel: 'Wybierz poziom',
    resume: 'Kontynuuj',
    menu: 'Menu główne',
    next: 'Dalej',
    tryAgain: 'Spróbuj ponownie',
    playAgain: 'Zagraj jeszcze raz',
    level: 'Poziom',
    paused: 'Pauza',
    levelComplete: 'Poziom ukończony!',
    gameOver: 'Koniec gry',
    victory: 'Zwycięstwo!',
    allLevelsDone: 'Wszystkie poziomy ukończone!',
    comingSoon: 'Wkrótce nowe poziomy!',
    crystals: 'Kryształy',
    points: 'Punkty',
    best: 'Rekord',
    soundOn: 'Dźwięk: wł.',
    soundOff: 'Dźwięk: wył.',
    langName: 'Polski',
    keyboardNeeded: 'Do gry potrzebna jest klawiatura',
    walk: 'idź',
    jump: 'skok',
    pause: 'pauza',
    sound: 'dźwięk',
    language: 'język',
    confirm: 'dalej',
  },
  uk: {
    subtitle: 'Курка проти морквин і зомбі',
    play: 'Грати',
    chooseLevel: 'Обери рівень',
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
    langName: 'Українська',
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
    chooseLevel: 'Choose a level',
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
    langName: 'English',
    keyboardNeeded: 'You need a keyboard to play',
    walk: 'walk',
    jump: 'jump',
    pause: 'pause',
    sound: 'sound',
    language: 'language',
    confirm: 'next',
  },
};

export function t(key, lang = DEFAULT_LANG) {
  return STRINGS[lang]?.[key] ?? STRINGS[DEFAULT_LANG][key] ?? key;
}

export function localized(text, lang = DEFAULT_LANG) {
  if (typeof text === 'string') return text;
  return text?.[lang] ?? text?.[DEFAULT_LANG] ?? '';
}

export function nextLang(lang) {
  return LANGS[(LANGS.indexOf(lang) + 1) % LANGS.length];
}

export function nextLangName(lang) {
  return t('langName', nextLang(lang));
}

export function resolveLang(saved) {
  return LANGS.includes(saved) ? saved : DEFAULT_LANG;
}
