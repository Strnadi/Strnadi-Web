export const translations = {
  "cs-CZ": {
    "project_name": "Nářečí českých strnadů",
    "project_description": "Projekt občanské vědy zaměřený na studium rozmanitosti ptačího zpěvu. Nahráváním zpěvu strnadů obecných po celém Česku můžete přispět k poznání, jak se v krajině udržují ptačí nářečí.",
    "development": "Web i aplikace stále procházejí velmi bouřlivým vývojem. Za chyby se omlouváme. Těšte se na časté aktualizace a vylepšování.",

    "loading": "Načítání",
    "empty": "Zatím zde nic není.",

    "labels": {
      "password": "Heslo",
      "email": "E-mail"
    },

    "placeholders": {
      "email": "E-mail",
      "password": "Heslo"
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

    "login": {
      "title": "Přihlášení",
      "error": "Chyba:",
      "loading": "Načítání..."
    },

    "errors": {
      "recordings": {
        "loading": "Nepodařilo se načíst nahrávky."
      },

      "location": "Nepodařilo se načíst umístění."
    }
  },
  "en-US": {
    "project_name": "Czech Yellowhammers' Dialects",
    "project_description": "Citizen science project focused on the diversity of birdsong. By recording yellowhammer songs across the Czech Republic, you can help us understand how bird dialects persist in the landscape.",
    "development": "The website and the app are in heavy development. We apologise for any errors. Expect frequent updates and improvements.",

    "loading": "Loading",
    "empty": "Nothing here yet.",

    "labels": {
      "password": "Password",
      "email": "E-mail"
    },

    "placeholders": {
      "email": "E-mail",
      "password": "Password"
    },

    "buttons": {
      "enter": "Enter",
      "contacts": "Contacts",
      "supporters": "Who supports us",
      "about_us": "About the team",
      "login": "Log in",
      "register": "Register",
      "continue_google": "Continue with Google",
      "continue_apple": "Continue with Apple",
      "back": "Back",
      "forgotten_password": "Forgotten password"
    },

    "login": {
      "title": "Log in",
      "error": "Error:",
      "loading": "Loading..."
    },

    "errors": {
      "recordings": {
        "loading": "Failed to load recordings."
      },

      "location": "Failed to load location."
    }
  }
};

type DotLeafPaths<T> =
  T extends Record<string, any>
    ? {
        [K in keyof T & string]:
          T[K] extends Record<string, any>
            ? `${K}.${DotLeafPaths<T[K]>}`
            : K
      }[keyof T & string]
    : never;

type TranslationObjects = (typeof translations)[keyof typeof translations];
export type TranslationIdentifier = DotLeafPaths<TranslationObjects>;

