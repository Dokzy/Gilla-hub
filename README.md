# GillaHub 🇭🇺

Magyar, mobilbarát Gilla VR rajongói közösségi oldal. Egyszerű HTML/CSS/JavaScript, GitHub Pages és Supabase.

## Mi van kész?

- Sötét, modern, neon-lila/türkiz gamer felület, mobilra optimalizálva
- E-mailes regisztráció és belépés
- Google OAuth belépés (Supabase Google provider beállítás szükséges)
- Profil: megjelenített név, játékbeli név, bemutatkozás
- Valós idejű általános chat
- Lobby létrehozása és lobbykérés küldése
- Közösségi posztok és posztjelentés
- Alap RLS adatbázis-szabályok

## 1. Supabase beállítás

1. Szülő/gondviselő segítségével hozz létre egy Supabase projektet: https://supabase.com/
2. Nyisd meg a projektben az **SQL Editor** részt.
3. Másold be a `schema.sql` teljes tartalmát, majd futtasd.
4. Nyisd meg **Project Settings → API**.
5. Másold ki a Project URL és `anon` / publishable public key értékeket.
6. Nyisd meg a `config.js` fájlt, és cseréld le a két `IDE_...` értéket a saját értékeidre.

**Fontos:** kizárólag a publikus anon/publishable kulcsot használd a böngészőben. `service_role` vagy secret kulcsot SOHA ne tegyél GitHubra.

## 2. E-mail bejelentkezés

Supabase Dashboard → Authentication → Providers → Email. Állítsd be az e-mail megerősítést. Éles használat előtt konfigurálj saját SMTP szolgáltatást, különben a tesztküldési korlátok érvényesek.

## 3. Google belépés

Supabase Dashboard → Authentication → Providers → Google:
1. Engedélyezd a Google providert.
2. A Google Cloud Console-ban készíts OAuth Client ID-t.
3. A Supabase által megadott callback URL-t add meg a Google OAuth kliensnél.
4. A Client ID és Client Secret értékeket a Supabase Dashboardon add meg.
5. Authentication → URL Configuration alatt add hozzá a GitHub Pages címedet a Site URL / Redirect URLs listához, például `https://FELHASZNALONEV.github.io/gillahub/`.

A Google OAuth beállítása külön fejlesztői konzolos lépéseket igényel; a weboldal gombja a Supabase OAuth folyamatát indítja.

## 4. GitHub Pages közzététel

1. Hozz létre egy GitHub repositoryt `gillahub` néven.
2. Töltsd fel a ZIP-ben lévő fájlokat (a mappán belüli fájlokat, ne egy újabb mappába csomagolva).
3. Repository → Settings → Pages.
4. Source: **Deploy from a branch**, Branch: `main`, Folder: `/ (root)`, Save.
5. Várd meg, amíg a GitHub Pages közzéteszi az oldalt.
6. A pontos Pages URL-t add hozzá a Supabase Authentication URL Configuration részéhez.

## 5. Helyi teszt

A fájlokat ne `file://` módban nyisd meg. Használj helyi webszervert, vagy töltsd fel GitHub Pages-re.

## Fontos hiányzó következő fejlesztések

Ez egy működő MVP-alap, nem kész, nagyüzemi közösségi platform. A következő körben érdemes megvalósítani:
- Barátkérelmek és barátlista teljes felülete
- Host felület a beérkező lobbykérések elfogadására/elutasítására
- Privát üzenetek, tiltás és felhasználójelentés
- Moderátori dashboard, spamvédelem és rate limit
- Adatvédelmi tájékoztató, felhasználási feltételek és fióktörlés

Kiskorú felhasználók esetén a nyilvános chat és a Google/e-mail fiókok élesítése előtt kérj szülői segítséget. Ne gyűjts lakcímet, telefonszámot, pontos helyadatot vagy más szükségtelen személyes adatot. A közösségi oldalt ne állítsd be úgy, hogy idegenek automatikusan privát kapcsolatba léphessenek veled.
