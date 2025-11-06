export const translations = {
  'cs-CZ': {
    lang_name: '🇨🇿 Čeština',
    project_name: 'Nářečí českých strnadů',
    project_description:
      'Projekt občanské vědy zaměřený na studium rozmanitosti ptačího zpěvu. Nahráváním zpěvu strnadů obecných po celém Česku můžete přispět k poznání, jak se v krajině udržují ptačí nářečí.',
    project_description_short: 'Projekt občanské vědy',
    development:
      'Web i aplikace stále procházejí velmi bouřlivým vývojem. Za chyby se omlouváme. Těšte se na časté aktualizace a vylepšování.',

    loading: 'Načítání',
    not_found: 'Nenalezeno',
    empty: 'Zatím zde nic není.',

    labels: {
      password: 'Heslo',
      email: 'E-mail',
      language: 'Jazyk',
      title: 'Název',
      description: 'Popis',
      categories: 'Kategorie',
      name: 'Jméno',
      surname: 'Příjmení',
      nickname: 'Přezdívka',
      nickname_optional: 'Přezdívka (nepovinné)',
      postal_code: 'PSČ',
      city: 'Město',
      note: 'Poznámka',
      password_confirm: 'Heslo znovu',
      user: 'Uživatel'
    },

    placeholders: {
      email: 'E-mail',
      password: 'Heslo',
      title: 'Nadpis',
      description: 'Popis',
      name: 'Jméno',
      surname: 'Příjmení',
      nickname: 'Přezdívka',
      postal_code: 'PSČ',
      city: 'Obec, město'
    },

    app: {
      qr_code:
        'Toto je "chytrý" QR kód, který vás přesměruje přímo na ten správný obchod s aplikacemi pro vaši platformu.',
      google_play:
        'Na obchodě Google Play se aplikace jmenuje Strnadi a je v předběžném přístupu.',
      apple:
        'V App Storu je aplikace dostupná pod jménem Strnadi.',
      development:
        'Aplikace, stejně jako web, stále prochází velmi bouřlivým vývojem. Za chyby se omlouváme. Těšte se na časté aktualizace a vylepšování.'
    },

    buttons: {
      enter: 'Vstoupit',
      app: 'Stáhnout aplikaci',
      contacts: 'Kontakty',
      supporters: 'Projekt podporují',
      about_us: 'O týmu',
      login: 'Přihlásit se',
      register: 'Registrovat se',
      continue_google: 'Pokračovat přes Google',
      continue_apple: 'Pokračovat přes Apple',
      back: 'Zpět',
      forgotten_password: 'Zapomenuté heslo',
      save: 'Uložit',
      cancel: 'Zrušit',
      delete: 'Smazat',
      restore: 'Obnovit',
      remove: 'Odebrat',
      logout: 'Odhlásit se',
      close: 'Zavřít',
      retry: 'Zkusit znovu',
      resend_verification: 'Odeslat ověřovací e-mail',
      send_code: 'Odeslat kód',
      back_to_app: 'Zpět do aplikace',
      complete_registration: 'Dokončit registraci',
      download_selected: 'Stáhnout vybrané',
      change_password: 'Změnit heslo',
      go_home: 'Přejít domů',
      delete_account: 'Smazat účet',
      add: 'Přidat',
      next: 'Další',
      edit: 'Upravit'
    },

    login: {
      title: 'Přihlášení',
      error: 'Chyba:',
      loading: 'Načítání...'
    },

    errors: {
      recordings: {
        loading: 'Nepodařilo se načíst nahrávky.',
        loading_single: 'Nelze získat nahrávku.',
        delete_failed: 'Nepodařilo se smazat nahrávku.',
        update_failed: 'Nepodařilo se uložit změny.'
      },

      auth: {
        not_logged_in: 'Nejste přihlášeni.'
      },

      location: 'Nepodařilo se načíst umístění.'
    },

    common: {
      or: 'Nebo',
      error_prefix: 'Chyba:',
      irreversible_action: 'Tato akce je nevratná.',
      buttons: {
        resume: 'Pokračovat',
        play: 'Přehrát',
        pause: 'Pozastavit',
        stop: 'Zastavit',
        rewind: 'Přehrát znovu'
      },
      playback_options: {
        play_in_viewport_only: 'Přehrát jen v zobrazené oblasti',
        play_in_selection_only: 'Přehrát jen v vybrané oblasti',
        loop_playback: 'Opakovat',
        auto_scroll: 'Automatický posun',
        pan_scrollbar_label: 'Posun',
        zoom_scrollbar_label: 'Zvětšení'
      }
    },

    states: {
      loading: 'Načítání...',
      saving: 'Ukládání...',
      deleting: 'Mazání...'
    },

    pages: {
      application: {
        title: 'Stažení aplikace',
        how_to_download: 'Jak stáhnout aplikaci?'
      },
      welcome: {
        contacts_heading: 'Kontakty'
      },
      information: {
        title: 'Informace'
      },
      map: {
        legend: {
          title: 'Nápověda k mapě'
        },
        square: {
          title: 'Čtverec'
        }
      },
      user_profile: {
        title: 'Profil uživatele',
        details_section: 'Podrobnosti',
        contact_section: 'Kontakt',
        location_label: 'Lokalita',
        role_label: 'Role',
        joined_label: 'Registrován',
        recordings_section: 'Nahrávky',
        roles: {
          user: 'Uživatel',
          admin: 'Administrátor'
        }
      },
      not_found: {
        description: 'Tato stránka bohužel nebyla nalezena.'
      }
    },

    upload: {
      title: 'Nahrát',
      login_required: 'Je potřeba se nejdříve přihlásit.',
      email_verification_required: 'Je potřeba si nejdříve ověřit svůj e-mail.',
      drop_files_here: 'Upusťte soubory sem pro nahrání',
      select_or_drag_files: 'Přetáhněte nebo klikněte sem pro vybrání',
      select_multiple_audio: 'jednoho nebo několika zvukových souborů',
      audio_formats: '(.wav, .mp3, .flac, .aac, .ogg)',
      delete: 'Smazat',
      select_or_drag_photos: 'Klikněte nebo přetáhněte fotky z místa dění',
      remove: 'Odebrat',
      location_not_set: 'Poloha zatím neurčena.',
      map_instructions:
        'Klikejte postupně do mapy pro přidání pozic. Zvýrazněná nahrávka je aktuálně vybraná.',
      title_label: 'Titulek',
      note_label: 'Poznámka',
      device_label: 'Nahrávací zařízení',
      bird_count_label: 'Počet strnadů',
      dialects: 'Nářečí',
      parts: 'Části nahrávky',
      confirm_upload_text:
        'Nahrávku jsem zkontroloval(a) a chci ji odeslat do databáze. Jsem si vědom(a) tím, že v ní zůstane i po smazání mého účtu a že smazána bude jen ve vyjimečných případech.',
      uploading: 'Odesílání vaší nahrávky do databáze...',
      uploaded: 'Nahrávka byla úspěšně odeslána.',
      next: 'Další',
      back: 'Zpět',
      steps: {
        file: 'Soubory',
        location: 'Poloha',
        info: 'Informace o nahrávce',
        photos: 'Fotky',
        submit: 'Odeslat'
      },
      errors: {
        no_valid_files: 'Žádné validní soubory nebyly vybrány.'
      },
      success: {
        queued: 'Nahrávka byla zařazena do fronty.',
        background:
          'Nahrávání probíhá na pozadí. Můžete pokračovat v používání aplikace.',
        track_status: 'Sledujte průběh v horní liště.'
      },
      preparing: 'Příprava nahrávky...'
    },

    admin: {
      dashboard: {
        title: 'Správa systému',
        users: 'Správa uživatelů',
        articles: 'Správa informací',
        recordings: 'Správa nahrávek',
        awards: 'Odměny',
        achievments: 'Úspěchy'
      },
      users: {
        title: 'Seznam uživatelů'
      },
      notifications: {
        title: 'Správa oznámení'
      },
      articles: {
        manage_title: 'Správa informací',
        new_title: 'Nový příspěvek',
        edit_title: 'Úprava příspěvku',
        select_categories: 'Vyberte kategorie',
        new_file_suffix: '(nový)',
        new_category: 'Nová kategorie',
        new_article: 'Nový příspěvek',
        categories_title: 'Kategorie',
        posts_title: 'Příspěvky',
        included_articles: 'Zahrnuté příspěvky',
        category_name_label: 'Název kategorie',
        category_description_label: 'Popis kategorie',
        edit_category_title: 'Úprava kategorie',
        delete_category_title: 'Smazání kategorie',
        delete_post_title: 'Smazání příspěvku',
        delete_post_prompt: 'Opravdu si přejete tento příspěvek smazat?',
        no_articles_in_category: 'Žádné příspěvky v této kategorii',
        uncategorized: {
          title: 'Nezařazené příspěvky',
          description: 'Příspěvky bez kategorie'
        }
      },
      recordings: {
        title: 'Všechny nahrávky',
        total_recordings_label: 'Celkový počet nahrávek:',
        total_parts_label: 'Celkový počet částí:',
        download_selected: 'Stáhnout vybrané',
        downloading: 'Stahování...',
        edit_dialects: 'Upravit dialekty',
        part_prefix: 'Část #',
        no_gps_data: '(GPS data chybí)',
        no_parts: 'Tato nahrávka nemá žádné části.',
        alerts: {
          no_part_selected: 'Nebyla vybrána žádná část nahrávky.',
          zip_failed: 'Došlo k chybě při vytváření ZIP souboru.'
        }
      }
    },

    recordings: {
      id_prefix: 'Nahrávka ID:',
      status: {
        uploaded: 'Nahráno'
      },
      detail: {
        editing_prefix: 'Upravování:',
        fallback_prefix: 'Nahrávka #',
        by_app_suffix: 'přes aplikaci',
        no_note: 'Žádná poznámka.',
        parts_heading: 'Části nahrávky',
        edit_dialects_title: 'Upravit dialekty nahrávky',
        edit_recording_title: 'Upravit nahrávku',
        delete_recording_title: 'Smazání nahrávky',
        delete_part: 'Smazat část',
        delete_recording: 'Smazat nahrávku',
        request_delete: 'Požádat o smazání',
        not_found: 'Nahrávka nebyla nalezena.'
      },
      messages: {
        updated: 'Nahrávka byla upravena.',
        deleted: 'Nahrávka byla smazána.'
      },
      confirm: {
        delete_prompt: 'Opravdu chcete smazat nahrávku'
      }
    },

    account: {
      profile: {
        title: 'Můj profil',
        email_verified_badge: 'Ověřený e-mail',
        email_unverified_badge: 'Neověřený e-mail',
        no_location: 'Není uvedeno místo',
        my_recordings: 'Moje nahrávky',
        my_recordings_description: 'Správa a přehled nahraných záznamů',
        achievements: 'Získané úspěchy',
        achievements_description: 'Zobrazit získané úspěchy',
        rewards: 'Získané odměny',
        rewards_description: 'Zobrazit získané odměny',
        personal_data: 'Osobní údaje',
        personal_data_description: 'Úprava osobních informací',
        administration: 'Administrace',
        administration_description: 'Správa systému'
      },
      settings: {
        title: 'Nastavení účtu',
        resend_verification: 'Odeslat znovu ověřovací e-mail',
        delete_account: 'Smazat účet'
      },
      personal_data: {
        title: 'Osobní údaje',
        password_section_title: 'Heslo'
      },
      delete: {
        title: 'Smazání účtu',
        prompt:
          'Opravdu si chcete smazat účet? Tuto akci nelze vrátit zpět.',
        confirmation_label:
          'Opravdu si chci smazat účet. Nahrávky zůstávají v databázi.'
      },
      verification: {
        resend_title: 'Znovuodeslání ověřovacího e-mailu'
      },
      return: {
        title: 'Návrat do aplikace',
        message: 'Nyní se můžete bezpečně vrátit zpět do aplikace.',
        auto_close: 'Toto okno se zavře automaticky za'
      },
      my_recordings: {
        title: 'Moje nahrávky'
      },
      users: {
        unknown_email: 'Neznámý e-mail',
        email_verified: 'Ověřený',
        email_unverified: 'Neověřený'
      }
    },

    auth: {
      welcome: {
        continue_without_account: 'Pokračovat bez účtu'
      },
      login: {
        title: 'Přihlášení'
      },
      register: {
        steps: {
          email: 'E-mail',
          personal_info: 'Osobní údaje',
          location: 'Umístění',
          password: 'Heslo',
          confirmation: 'Potvrzení',
          creating_account: 'Vytváření účtu',
          done: 'Hotovo'
        },
        email_exists: {
          prefix:
            'Tento e-mail je již registrován. Pokud si nepamatujete své heslo, můžete si ho',
          link: 'obnovit zde',
          suffix: '.'
        },
        agreement: {
          prefix: 'Zapojením do projektu občanské vědy',
          link: 'souhlasím s podmínkami',
          suffix: '.'
        },
        nickname_hint:
          'Pokud nevyplníte, na webu bude zobrazováno vaše celé jméno.',
        postal_code_hint:
          'Nepovinné; pokud vyplníte, budete dostávat aktuality z vaší lokality.',
        city_hint: 'Nepovinné, bude zobrazováno na vašem profilu.',
        password_hint:
          'Heslo musí mít minimálně 8 znaků, 1 velké písmeno a 1 číslici.',
        password_invalid: 'Heslo nesplňuje požadavky.',
        password_mismatch: 'Hesla nejsou stejná.',
        summary: {
          title: 'Je takto všechno správně?',
          email: 'E-mail:',
          name: 'Jméno:',
          surname: 'Příjmení:',
          nickname: 'Přezdívka:',
          postal_code: 'PSČ:',
          city: 'Město:',
          terms: 'S podmínkami použití souhlasím.'
        },
        status: {
          creating_account_wait: 'Vytváření vašeho účtu, prosím vyčkejte…',
          creating_account: 'Vytváření účtu…',
          success_title: 'Gratulace! Váš účet byl založen.',
          success_message:
            'Na vaši e-mailovou adresu vám krátce přijde odkaz, pomocí kterého si ověříte váš účet.'
        }
      },
      reset_password: {
        title: 'Zapomenuté heslo',
        success: 'E-mail úspěšně odeslán',
        reset_title: 'Reset hesla'
      }
    },

    verification: {
      email: {
        success_message: 'Váš e-mail byl úspěšně ověřen.',
        failure_message: 'Váš e-mail se bohužel nepodařilo ověřit.'
      }
    }
  },

  'en-US': {
    lang_name: '🇺🇸 English',
    project_name: "Yellowhammers' Dialects",
    project_description:
      'Citizen science project focused on the diversity of birdsong. By recording yellowhammer songs across the Czech Republic, you can help us understand how bird dialects persist in the landscape.',
    project_description_short: 'Citizen science project',
    development:
      'The website and the app are in heavy development. We apologise for any errors. Expect frequent updates and improvements.',

    loading: 'Loading',
    not_found: 'Not found',
    empty: 'Nothing here yet.',

    labels: {
      password: 'Password',
      email: 'Email',
      language: 'Language',
      title: 'Title',
      description: 'Description',
      categories: 'Categories',
      name: 'First name',
      surname: 'Last name',
      nickname: 'Nickname',
      nickname_optional: 'Nickname (optional)',
      postal_code: 'ZIP code',
      city: 'City',
      note: 'Note',
      password_confirm: 'Repeat password',
      user: 'User'
    },

    placeholders: {
      email: 'Email',
      password: 'Password',
      title: 'Title',
      description: 'Description',
      name: 'First name',
      surname: 'Last name',
      nickname: 'Nickname',
      postal_code: 'ZIP code',
      city: 'Town, city'
    },

    app: {
      qr_code:
        'This is a "smart" QR code that sends you directly to the correct app store for your platform.',
      google_play:
        'On Google Play the app is called Strnadi and is in early access.',
      apple:
        'In the App Store the app is available under the name Strnadi.',
      development:
        'The app, just like the website, is in heavy development. We apologise for any errors. Expect frequent updates and improvements.'
    },

    buttons: {
      enter: 'Enter',
      app: 'Download the app',
      contacts: 'Contacts',
      supporters: 'Who supports us',
      about_us: 'About the team',
      login: 'Log in',
      register: 'Register',
      continue_google: 'Continue with Google',
      continue_apple: 'Continue with Apple',
      back: 'Back',
      forgotten_password: 'Forgotten password',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      restore: 'Restore',
      remove: 'Remove',
      logout: 'Log out',
      close: 'Close',
      retry: 'Try again',
      resend_verification: 'Send verification e-mail',
      send_code: 'Send code',
      back_to_app: 'Back to the app',
      complete_registration: 'Complete registration',
      download_selected: 'Download selected',
      change_password: 'Change password',
      go_home: 'Go home',
      delete_account: 'Delete account',
      add: 'Add',
      next: 'Next',
      edit: 'Edit'
    },

    login: {
      title: 'Log in',
      error: 'Error:',
      loading: 'Loading...'
    },

    errors: {
      recordings: {
        loading: 'Failed to load recordings.',
        loading_single: 'Failed to load the recording.',
        delete_failed: 'Failed to delete the recording.',
        update_failed: 'Failed to save the changes.'
      },

      auth: {
        not_logged_in: 'You are not logged in.'
      },

      location: 'Failed to load location.'
    },

    common: {
      or: 'Or',
      error_prefix: 'Error:',
      irreversible_action: 'This action cannot be undone.',
      buttons: {
        resume: 'Resume',
        play: 'Play',
        pause: 'Pause',
        stop: 'Stop',
        rewind: 'Rewind'
      },
      playback_options: {
        play_in_viewport_only: 'Play in viewport only',
        play_in_selection_only: 'Play in selection only',
        loop_playback: 'Loop playback',
        auto_scroll: 'Auto scroll',
        pan_scrollbar_label: 'Pan',
        zoom_scrollbar_label: 'Zoom'
      }
    },

    states: {
      loading: 'Loading...',
      saving: 'Saving...',
      deleting: 'Deleting...'
    },

    pages: {
      application: {
        title: 'Download the app',
        how_to_download: 'How to download the app?'
      },
      welcome: {
        contacts_heading: 'Contacts'
      },
      information: {
        title: 'Information'
      },
      map: {
        legend: {
          title: 'Map guide'
        },
        square: {
          title: 'Square'
        }
      },
      user_profile: {
        title: 'User profile',
        details_section: 'Details',
        contact_section: 'Contact',
        location_label: 'Location',
        role_label: 'Role',
        joined_label: 'Joined',
        recordings_section: 'Recordings',
        roles: {
          user: 'User',
          admin: 'Admin'
        }
      },
      not_found: {
        description: 'This page could not be found.'
      }
    },

    upload: {
      title: 'Upload',
      login_required: 'You need to log in first.',
      email_verification_required: 'You need to verify your email first.',
      drop_files_here: 'Drop files here to upload',
      select_or_drag_files: 'Drag or click here to select',
      select_multiple_audio: 'one or more audio files',
      audio_formats: '(.wav, .mp3, .flac, .aac, .ogg)',
      delete: 'Delete',
      select_or_drag_photos: 'Click or drag photos from the event location',
      remove: 'Remove',
      location_not_set: 'Location not set yet.',
      map_instructions:
        'Click on the map step by step to add positions.<br> The highlighted recording is currently selected.',
      title_label: 'Title',
      note_label: 'Note',
      device_label: 'Recording device',
      bird_count_label: 'Number of yellowhammers',
      dialects: 'Dialects',
      parts: 'Recording parts',
      confirm_upload_text:
        'I have checked the recording and want to submit it to the<br> database. I am aware that it will remain there even after my<br> account is deleted and will only be removed in exceptional cases.',
      uploading: 'Uploading your recording to the database...',
      uploaded: 'The recording was successfully uploaded.',
      next: 'Next',
      back: 'Back',
      steps: {
        file: 'Files',
        location: 'Location',
        info: 'Recording details',
        photos: 'Photos',
        submit: 'Submit'
      },
      errors: {
        no_valid_files: 'No valid files were selected.'
      },
      success: {
        queued: 'The recording was added to the queue.',
        background:
          'Uploading runs in the background. You can continue using the app.',
        track_status: 'Track the progress in the top bar.'
      },
      preparing: 'Preparing the recording...'
    },

    admin: {
      dashboard: {
        title: 'Admin dashboard',
        users: 'User list',
        articles: 'Article management',
        recordings: 'All recordings',
        awards: 'Awards',
        achievments: 'Achievments'
      },
      notifications: {
        title: 'Notifications'
      },
      users: {
        title: 'User list'
      },
      articles: {
        manage_title: 'Information management',
        new_title: 'New article',
        edit_title: 'Edit article',
        select_categories: 'Select categories',
        new_file_suffix: '(new)',
        new_category: 'New category',
        new_article: 'New article',
        categories_title: 'Categories',
        posts_title: 'Articles',
        included_articles: 'Included articles',
        category_name_label: 'Category title',
        category_description_label: 'Category description',
        edit_category_title: 'Edit category',
        delete_category_title: 'Delete category',
        delete_post_title: 'Delete article',
        delete_post_prompt: 'Do you really want to delete this article?',
        no_articles_in_category: 'No articles in this category',
        uncategorized: {
          title: 'Uncategorized articles',
          description: 'Articles without a category'
        }
      },
      recordings: {
        title: 'All recordings',
        total_recordings_label: 'Total number of recordings:',
        total_parts_label: 'Total number of parts:',
        download_selected: 'Download selected',
        downloading: 'Downloading...',
        edit_dialects: 'Edit dialects',
        part_prefix: 'Part #',
        no_gps_data: '(Missing GPS data)',
        no_parts: 'This recording has no parts.',
        alerts: {
          no_part_selected: 'No recording part was selected.',
          zip_failed: 'An error occurred while creating the ZIP file.'
        }
      }
    },

    recordings: {
      id_prefix: 'Recording ID:',
      status: {
        uploaded: 'Uploaded'
      },
      detail: {
        editing_prefix: 'Editing:',
        fallback_prefix: 'Recording #',
        by_app_suffix: 'via the app',
        no_note: 'No note.',
        parts_heading: 'Recording parts',
        edit_dialects_title: 'Edit recording dialects',
        edit_recording_title: 'Edit recording',
        delete_recording_title: 'Delete recording',
        delete_part: 'Delete part',
        delete_recording: 'Delete recording',
        request_delete: 'Request deletion',
        not_found: 'Recording not found.'
      },
      messages: {
        updated: 'Recording was updated.',
        deleted: 'Recording was deleted.'
      },
      confirm: {
        delete_prompt: 'Do you really want to delete the recording'
      }
    },

    account: {
      profile: {
        title: 'My profile',
        email_verified_badge: 'Verified e-mail',
        email_unverified_badge: 'Unverified e-mail',
        no_location: 'No location provided',
        my_recordings: 'My recordings',
        my_recordings_description: 'Manage and review uploaded entries',
        achievements: 'Achievements',
        achievements_description: 'View achievements',
        rewards: 'Rewards',
        rewards_description: 'View rewards',
        personal_data: 'Personal data',
        personal_data_description: 'Edit personal information',
        administration: 'Administration',
        administration_description: 'System management'
      },
      settings: {
        title: 'Account settings',
        resend_verification: 'Resend verification e-mail',
        delete_account: 'Delete account'
      },
      personal_data: {
        title: 'Personal data',
        password_section_title: 'Password'
      },
      delete: {
        title: 'Delete account',
        prompt:
          'Do you really want to delete your account? This action cannot be undone.',
        confirmation_label:
          'I really want to delete my account. Recordings remain in the database.'
      },
      verification: {
        resend_title: 'Resend verification e-mail'
      },
      return: {
        title: 'Return to the app',
        message: 'You can now safely return to the app.',
        auto_close: 'This window will close automatically in'
      },
      my_recordings: {
        title: 'My recordings'
      },
      users: {
        unknown_email: 'Unknown e-mail',
        email_verified: 'Verified',
        email_unverified: 'Unverified'
      }
    },

    auth: {
      welcome: {
        continue_without_account: 'Continue without an account'
      },
      login: {
        title: 'Log in'
      },
      register: {
        steps: {
          email: 'E-mail',
          personal_info: 'Personal data',
          location: 'Location',
          password: 'Password',
          confirmation: 'Confirmation',
          creating_account: 'Creating account',
          done: 'Done'
        },
        email_exists: {
          prefix:
            'This e-mail is already registered. If you do not remember your password, you can',
          link: 'reset it here',
          suffix: '.'
        },
        agreement: {
          prefix: 'By joining the citizen-science project',
          link: 'I agree with the terms of use',
          suffix: '.'
        },
        nickname_hint:
          'If you leave it empty, your full name will be shown on the website.',
        postal_code_hint:
          'Optional; if you fill it in, you will receive updates from your area.',
        city_hint: 'Optional, it will be shown on your profile.',
        password_hint:
          'The password must have at least 8 characters, 1 uppercase letter and 1 number.',
        password_invalid: 'The password does not meet the requirements.',
        password_mismatch: 'Passwords do not match.',
        summary: {
          title: 'Does everything look correct?',
          email: 'E-mail:',
          name: 'First name:',
          surname: 'Last name:',
          nickname: 'Nickname:',
          postal_code: 'ZIP code:',
          city: 'City:',
          terms: 'I agree with the terms of use.'
        },
        status: {
          creating_account_wait: 'Creating your account, please wait…',
          creating_account: 'Creating account…',
          success_title: 'Congratulations! Your account has been created.',
          success_message:
            'A link to verify your account will arrive shortly at your e-mail address.'
        }
      },
      reset_password: {
        title: 'Forgotten password',
        success: 'E-mail successfully sent',
        reset_title: 'Reset password'
      }
    },

    verification: {
      email: {
        success_message: 'Your e-mail has been successfully verified.',
        failure_message: 'Unfortunately, your e-mail could not be verified.'
      }
    }
  },

  'de-DE': {
    lang_name: '🇩🇪 Deutsch',
    project_name: 'Dialekte der Goldammer',
    project_description:
      'Bürgerwissenschaftliches Projekt zur Erforschung der Vielfalt des Vogelgesangs. Durch die Aufnahme von Goldammerngesängen in der ganzen Tschechischen Republik können Sie dazu beitragen, zu verstehen, wie sich Vogeldialekte in der Landschaft erhalten.',
    project_description_short: 'Citizen-Science-Projekt',
    development:
      'Die Website und die App befinden sich in starker Entwicklung. Wir entschuldigen uns für eventuelle Fehler. Erwarten Sie häufige Updates und Verbesserungen.',

    loading: 'Wird geladen',
    not_found: 'Nicht gefunden',
    empty: 'Hier ist noch nichts.',

    labels: {
      password: 'Passwort',
      email: 'E-Mail',
      language: 'Sprache',
      title: 'Titel',
      description: 'Beschreibung',
      categories: 'Kategorien',
      name: 'Vorname',
      surname: 'Nachname',
      nickname: 'Spitzname',
      nickname_optional: 'Spitzname (optional)',
      postal_code: 'PLZ',
      city: 'Ort',
      note: 'Notiz',
      password_confirm: 'Passwort wiederholen',
      user: 'Benutzer'
    },

    placeholders: {
      email: 'E-Mail',
      password: 'Passwort',
      title: 'Titel',
      description: 'Beschreibung',
      name: 'Vorname',
      surname: 'Nachname',
      nickname: 'Spitzname',
      postal_code: 'PLZ',
      city: 'Ort, Stadt'
    },

    app: {
      qr_code:
        'Dies ist ein „intelligenter“ QR-Code, der Sie direkt in den richtigen App-Store für Ihre Plattform weiterleitet.',
      google_play:
        'Im Google Play Store heißt die App Strnadi und befindet sich im Vorabzugang.',
      apple:
        'Im App Store ist die App unter dem Namen Strnadi verfügbar.',
      development:
        'Die App befindet sich – genau wie die Website – in intensiver Entwicklung. Wir entschuldigen uns für mögliche Fehler. Freuen Sie sich auf häufige Updates und Verbesserungen.'
    },

    buttons: {
      enter: 'Eintreten',
      app: 'App herunterladen',
      contacts: 'Kontakte',
      supporters: 'Wer uns unterstützt',
      about_us: 'Über das Team',
      login: 'Anmelden',
      register: 'Registrieren',
      continue_google: 'Mit Google fortfahren',
      continue_apple: 'Mit Apple fortfahren',
      back: 'Zurück',
      forgotten_password: 'Passwort vergessen',
      save: 'Speichern',
      cancel: 'Abbrechen',
      delete: 'Löschen',
      restore: 'Wiederherstellen',
      remove: 'Entfernen',
      logout: 'Abmelden',
      close: 'Schließen',
      retry: 'Erneut versuchen',
      resend_verification: 'Bestätigungs-E-Mail senden',
      send_code: 'Code senden',
      back_to_app: 'Zurück zur App',
      complete_registration: 'Registrierung abschließen',
      download_selected: 'Auswahl herunterladen',
      change_password: 'Passwort ändern',
      go_home: 'Zur Startseite',
      delete_account: 'Konto löschen',
      add: 'Hinzufügen',
      next: 'Weiter',
      edit: 'Bearbeiten'
    },

    login: {
      title: 'Anmelden',
      error: 'Fehler:',
      loading: 'Wird geladen...'
    },

    errors: {
      recordings: {
        loading: 'Fehler beim Laden der Aufnahmen.',
        loading_single: 'Aufnahme konnte nicht geladen werden.',
        delete_failed: 'Aufnahme konnte nicht gelöscht werden.',
        update_failed: 'Änderungen konnten nicht gespeichert werden.'
      },

      auth: {
        not_logged_in: 'Sie sind nicht angemeldet.'
      },

      location: 'Fehler beim Laden des Standorts.'
    },

    common: {
      or: 'Oder',
      error_prefix: 'Fehler:',

      buttons: {
        resume: 'Fortsetzen',
        play: 'Wiedergabe',
        pause: 'Pausieren',
        stop: 'Anhalten',
        rewind: 'Zurückspulen'
      },

      irreversible_action: 'Diese Aktion kann nicht rückgängig gemacht werden.',
      playback_options: {
        play_in_viewport_only: 'Nur im sichtbaren Bereich abspielen',
        play_in_selection_only: 'Nur im ausgewählten Bereich abspielen',
        loop_playback: 'Wiederholung abspielen',
        auto_scroll: 'Automatischer Scroll',
        pan_scrollbar_label: 'Pan',
        zoom_scrollbar_label: 'Zoom'
      }
    },

    states: {
      loading: 'Wird geladen...',
      saving: 'Speichern...',
      deleting: 'Löschen...'
    },

    pages: {
      application: {
        title: 'App herunterladen',
        how_to_download: 'Wie lade ich die App herunter?'
      },
      welcome: {
        contacts_heading: 'Kontakte'
      },
      information: {
        title: 'Informationen'
      },
      map: {
        legend: {
          title: 'Kartenhilfe'
        },
        square: {
          title: 'Quadrat'
        }
      },
      not_found: {
        description: 'Diese Seite wurde leider nicht gefunden.'
      }
    },

    upload: {
      title: 'Hochladen',
      login_required: 'Sie müssen sich zuerst anmelden.',
      email_verification_required:
        'Sie müssen Ihre E-Mail-Adresse zuerst verifizieren.',
      drop_files_here: 'Dateien hier ablegen zum Hochladen',
      select_or_drag_files:
        'Ziehen Sie hierher oder klicken Sie hier, um auszuwählen',
      select_multiple_audio: 'eine oder mehrere Audiodateien',
      audio_formats: '(.wav, .mp3, .flac, .aac, .ogg)',
      delete: 'Löschen',
      select_or_drag_photos:
        'Klicken oder ziehen Sie Fotos vom Veranstaltungsort',
      remove: 'Entfernen',
      location_not_set: 'Standort noch nicht festgelegt.',
      map_instructions:
        'Klicken Sie nacheinander auf die Karte, um Positionen hinzuzufügen.<br> Die hervorgehobene Aufnahme ist derzeit ausgewählt.',
      title_label: 'Titel',
      note_label: 'Notiz',
      device_label: 'Aufnahmegerät',
      bird_count_label: 'Anzahl der Goldammern',
      dialects: 'Dialekte',
      parts: 'Aufnahmeteile',
      confirm_upload_text:
        'Ich habe die Aufnahme überprüft und möchte sie in die<br> Datenbank einreichen. Mir ist bewusst, dass sie dort auch nach der Löschung meines<br> Kontos verbleibt und nur in Ausnahmefällen entfernt wird.',
      uploading: 'Ihre Aufnahme wird in die Datenbank hochgeladen...',
      uploaded: 'Die Aufnahme wurde erfolgreich hochgeladen.',
      next: 'Weiter',
      back: 'Zurück',
      steps: {
        file: 'Dateien',
        location: 'Position',
        info: 'Aufnahmedetails',
        photos: 'Fotos',
        submit: 'Senden'
      },
      errors: {
        no_valid_files: 'Es wurden keine gültigen Dateien ausgewählt.'
      },
      success: {
        queued: 'Die Aufnahme wurde zur Warteschlange hinzugefügt.',
        background:
          'Der Upload läuft im Hintergrund. Sie können die App weiter nutzen.',
        track_status: 'Verfolgen Sie den Fortschritt in der oberen Leiste.'
      },
      preparing: 'Aufnahme wird vorbereitet...'
    },

    admin: {
      dashboard: {
        title: 'Admin-Dashboard',
        users: 'Benutzerliste',
        articles: 'Beitragsverwaltung',
        recordings: 'Alle Aufnahmen',
        awards: 'Preise',
        achievments: 'Erfolge'
      },
      notifications: {
        title: 'Benachrichtigungen'
      },
      users: {
        title: 'Benutzerliste'
      },
      articles: {
        manage_title: 'Informationsverwaltung',
        new_title: 'Neuer Beitrag',
        edit_title: 'Beitrag bearbeiten',
        select_categories: 'Kategorien auswählen',
        new_file_suffix: '(neu)',
        new_category: 'Neue Kategorie',
        new_article: 'Neuer Beitrag',
        categories_title: 'Kategorien',
        posts_title: 'Beiträge',
        included_articles: 'Enthaltene Beiträge',
        category_name_label: 'Kategoriename',
        category_description_label: 'Kategoriebeschreibung',
        edit_category_title: 'Kategorie bearbeiten',
        delete_category_title: 'Kategorie löschen',
        delete_post_title: 'Beitrag löschen',
        delete_post_prompt: 'Möchten Sie diesen Beitrag wirklich löschen?',
        no_articles_in_category: 'Keine Beiträge in dieser Kategorie',
        uncategorized: {
          title: 'Nicht zugeordnete Beiträge',
          description: 'Beiträge ohne Kategorie'
        }
      },
      recordings: {
        title: 'Alle Aufnahmen',
        total_recordings_label: 'Gesamtzahl der Aufnahmen:',
        total_parts_label: 'Gesamtzahl der Teile:',
        download_selected: 'Auswahl herunterladen',
        downloading: 'Herunterladen...',
        edit_dialects: 'Dialekte bearbeiten',
        part_prefix: 'Teil #',
        no_gps_data: '(Keine GPS-Daten)',
        no_parts: 'Diese Aufnahme hat keine Teile.',
        alerts: {
          no_part_selected: 'Es wurde kein Aufnahmeteil ausgewählt.',
          zip_failed:
            'Beim Erstellen der ZIP-Datei ist ein Fehler aufgetreten.'
        }
      }
    },

    recordings: {
      id_prefix: 'Aufnahme-ID:',
      status: {
        uploaded: 'Hochgeladen'
      },
      detail: {
        editing_prefix: 'Bearbeitung:',
        fallback_prefix: 'Aufnahme #',
        by_app_suffix: 'über die App',
        no_note: 'Keine Notiz.',
        parts_heading: 'Aufnahmeteile',
        edit_dialects_title: 'Dialekte der Aufnahme bearbeiten',
        edit_recording_title: 'Aufnahme bearbeiten',
        delete_recording_title: 'Aufnahme löschen',
        delete_part: 'Teil löschen',
        delete_recording: 'Aufnahme löschen',
        request_delete: 'Löschung anfordern',
        not_found: 'Aufnahme nicht gefunden.'
      },
      messages: {
        updated: 'Die Aufnahme wurde aktualisiert.',
        deleted: 'Die Aufnahme wurde gelöscht.'
      },
      confirm: {
        delete_prompt: 'Möchten Sie die Aufnahme wirklich löschen'
      }
    },

    account: {
      profile: {
        title: 'Mein Profil',
        email_verified_badge: 'E-Mail verifiziert',
        email_unverified_badge: 'E-Mail nicht verifiziert',
        no_location: 'Kein Ort angegeben',
        my_recordings: 'Meine Aufnahmen',
        my_recordings_description:
          'Verwaltung und Übersicht der hochgeladenen Einträge',
        achievements: 'Erreichte Erfolge',
        achievements_description: 'Erfolge anzeigen',
        rewards: 'Erhaltene Belohnungen',
        rewards_description: 'Belohnungen anzeigen',
        personal_data: 'Persönliche Daten',
        personal_data_description: 'Persönliche Informationen bearbeiten',
        administration: 'Administration',
        administration_description: 'Systemverwaltung'
      },
      settings: {
        title: 'Kontoeinstellungen',
        resend_verification: 'Bestätigungs-E-Mail erneut senden',
        delete_account: 'Konto löschen'
      },
      personal_data: {
        title: 'Persönliche Daten',
        password_section_title: 'Passwort'
      },
      delete: {
        title: 'Konto löschen',
        prompt:
          'Möchten Sie Ihr Konto wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
        confirmation_label:
          'Ich möchte mein Konto wirklich löschen. Die Aufnahmen bleiben in der Datenbank.'
      },
      verification: {
        resend_title: 'Bestätigungs-E-Mail erneut senden'
      },
      return: {
        title: 'Zurück zur App',
        message: 'Sie können nun sicher zur App zurückkehren.',
        auto_close: 'Dieses Fenster schließt sich automatisch in'
      },
      my_recordings: {
        title: 'Meine Aufnahmen'
      },
      users: {
        unknown_email: 'Unbekannte E-Mail',
        email_verified: 'Verifiziert',
        email_unverified: 'Nicht verifiziert'
      }
    },

    auth: {
      welcome: {
        continue_without_account: 'Ohne Konto fortfahren'
      },
      login: {
        title: 'Anmeldung'
      },
      register: {
        steps: {
          email: 'E-Mail',
          personal_info: 'Persönliche Daten',
          location: 'Ort',
          password: 'Passwort',
          confirmation: 'Bestätigung',
          creating_account: 'Konto wird erstellt',
          done: 'Fertig'
        },
        email_exists: {
          prefix:
            'Diese E-Mail ist bereits registriert. Wenn Sie Ihr Passwort vergessen haben, können Sie es',
          link: 'hier zurücksetzen',
          suffix: '.'
        },
        agreement: {
          prefix: 'Durch die Teilnahme am Citizen-Science-Projekt',
          link: 'stimme ich den Nutzungsbedingungen zu',
          suffix: '.'
        },
        nickname_hint:
          'Wenn Sie nichts angeben, wird Ihr voller Name auf der Website angezeigt.',
        postal_code_hint:
          'Optional; wenn Sie ihn ausfüllen, erhalten Sie Neuigkeiten aus Ihrer Region.',
        city_hint: 'Optional, wird in Ihrem Profil angezeigt.',
        password_hint:
          'Das Passwort muss mindestens 8 Zeichen, einen Großbuchstaben und eine Ziffer enthalten.',
        password_invalid: 'Das Passwort erfüllt nicht die Anforderungen.',
        password_mismatch: 'Die Passwörter stimmen nicht überein.',
        summary: {
          title: 'Ist so alles korrekt?',
          email: 'E-Mail:',
          name: 'Vorname:',
          surname: 'Nachname:',
          nickname: 'Spitzname:',
          postal_code: 'PLZ:',
          city: 'Ort:',
          terms: 'Ich stimme den Nutzungsbedingungen zu.'
        },
        status: {
          creating_account_wait: 'Ihr Konto wird erstellt, bitte warten…',
          creating_account: 'Konto wird erstellt…',
          success_title: 'Glückwunsch! Ihr Konto wurde erstellt.',
          success_message:
            'In Kürze erhalten Sie per E-Mail einen Link, mit dem Sie Ihr Konto verifizieren.'
        }
      },
      reset_password: {
        title: 'Passwort vergessen',
        success: 'E-Mail erfolgreich gesendet',
        reset_title: 'Passwort zurücksetzen'
      }
    },

    verification: {
      email: {
        success_message: 'Ihre E-Mail wurde erfolgreich verifiziert.',
        failure_message: 'Ihre E-Mail konnte leider nicht verifiziert werden.'
      }
    }
  }
};

type DotLeafPaths<T> =
  T extends Record<string, any>
    ? {
        [K in keyof T & string]: T[K] extends Record<string, any>
          ? `${K}.${DotLeafPaths<T[K]>}`
          : K;
      }[keyof T & string]
    : never;

type TranslationObjects = (typeof translations)[keyof typeof translations];
export type TranslationIdentifier = DotLeafPaths<TranslationObjects>;

