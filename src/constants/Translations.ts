export const translations = {
    "cs-CZ": {
        "project_name": "Nářečí českých strnadů",
        "development": "Web i aplikace stále procházejí velmi bouřlivým vývojem. Za chyby se omlouváme. Těšte se na časté aktualizace a vylepšování.",

        "loading": "Načítání",
        "empty": "Zatím zde nic není.",

        "labels": {
            "password": "Heslo",
        },

        "buttons": {
            "enter": "Vstoupit",
            "contacts": "Kontakty",
            "supporters": "Kdo nás podporuje",
            "about_us": "O týmu",
            "login": "Přihlásit se",
            "register": "Registrovat se",
            "continue_google": "Pokračovat přes Google",
            "continue_apple": "Pokračovat přes Apple",
            "back": "Zpět",
            "forgotten_password": "Zapomenuté heslo"
        },

        "errors": {
            "recordings": {
                "loading": "Nepodařilo se načíst nahrávky."
            },

            "location": "Nepodařilo se načíst umístění.",
        }
    },
    "en-US": {

    },
};

type DotLeafPaths<T> =
  T extends Record<string, any>
    ? {
        [K in keyof T & string]:
          T[K] extends Record<string, any>
            ? `${K}.${DotLeafPaths<T[K]>}`    // descend and prepend "K."
            : K                               // leaf key (string value)
      }[keyof T & string]
    : never;


type TranslationObjects = (typeof translations)[keyof typeof translations];
export type TranslationIdentifier = DotLeafPaths<TranslationObjects>;
