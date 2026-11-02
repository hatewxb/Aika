// Cinematic page actions follow Steam's language instead of treating every
// language except Russian as English (GitHub #11). Native Steam text is kept.
const EN = {
  buy: "Buy", media: "Media", trailer: "Trailer", close: "Close", prev: "Previous", next: "Next",
  play: "Play", pause: "Pause", mute: "Mute", unmute: "Unmute", full: "Full screen",
  reel: "Trailer", seek: "Seek", volume: "Volume", options: "Options", quality: "Quality", speed: "Speed",
};
const PLAYER = {
  russian: {
    trailer: "Трейлер", close: "Закрыть", prev: "Назад", next: "Далее", play: "Смотреть", pause: "Пауза",
    mute: "Выключить звук", unmute: "Включить звук", full: "Во весь экран", reel: "Трейлер",
    seek: "Перемотка", volume: "Громкость", options: "Настройки", quality: "Качество", speed: "Скорость",
  },
  polish: {
    trailer: "Zwiastun", close: "Zamknij", prev: "Poprzedni", next: "Następny", play: "Odtwórz", pause: "Pauza",
    mute: "Wycisz", unmute: "Włącz dźwięk", full: "Pełny ekran", reel: "Zwiastun",
    seek: "Przewiń", volume: "Głośność", options: "Opcje", quality: "Jakość", speed: "Prędkość",
  },
};
// These are Aika's two primary actions, not a replacement of Steam strings.
export const STORE_ACTIONS = {
  english: ["Buy", "Media"], russian: ["Купить", "Медиа"], polish: ["Kup", "Multimedia"],
  arabic: ["شراء", "الوسائط"], brazilian: ["Comprar", "Mídia"], bulgarian: ["Купуване", "Медия"],
  czech: ["Koupit", "Média"], danish: ["Køb", "Medier"], dutch: ["Kopen", "Media"],
  finnish: ["Osta", "Media"], french: ["Acheter", "Médias"], german: ["Kaufen", "Medien"],
  greek: ["Αγορά", "Πολυμέσα"], hungarian: ["Vásárlás", "Média"], indonesian: ["Beli", "Media"],
  italian: ["Acquista", "Media"], japanese: ["購入", "メディア"], koreana: ["구매", "미디어"],
  latam: ["Comprar", "Multimedia"], malay: ["Beli", "Media"], norwegian: ["Kjøp", "Medier"],
  portuguese: ["Comprar", "Multimédia"], romanian: ["Cumpără", "Media"],
  schinese: ["购买", "媒体"], spanish: ["Comprar", "Multimedia"], swedish: ["Köp", "Media"],
  tchinese: ["購買", "媒體"], thai: ["ซื้อ", "สื่อ"], turkish: ["Satın al", "Medya"],
  ukrainian: ["Купити", "Медіа"], vietnamese: ["Mua", "Nội dung đa phương tiện"],
};
const ISO = {
  en: "english", ru: "russian", pl: "polish", ar: "arabic", bg: "bulgarian", cs: "czech", da: "danish",
  nl: "dutch", fi: "finnish", fr: "french", de: "german", el: "greek", hu: "hungarian",
  id: "indonesian", it: "italian", ja: "japanese", ko: "koreana", ms: "malay", no: "norwegian",
  nb: "norwegian", nn: "norwegian", ro: "romanian", es: "spanish", sv: "swedish", th: "thai",
  tr: "turkish", uk: "ukrainian", vi: "vietnamese",
};
export function storeLanguage(value) {
  const language = String(value || "english").trim().toLowerCase().replaceAll("_", "-");
  if (Object.hasOwn(STORE_ACTIONS, language)) return language;
  if (language === "sc-schinese") return "schinese";
  if (language.startsWith("zh")) return /(?:hant|tw|hk|mo)/.test(language) ? "tchinese" : "schinese";
  if (language.startsWith("pt")) return /(?:^|-)br(?:-|$)/.test(language) ? "brazilian" : "portuguese";
  if (language === "es-419") return "latam";
  return ISO[language.split("-")[0]] || "english";
}
export function storeText(language) {
  const key = storeLanguage(language);
  const [buy, media] = STORE_ACTIONS[key];
  return { ...EN, ...PLAYER[key], buy, media };
}
