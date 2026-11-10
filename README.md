# Rejestr kontroli jakości

![RJK Preview](img/rkj-preview.png)

Aplikacja przeglądarkowa do ewidencji kontroli końcowej. Obsługuje kontrole jednej lub dwóch osób, wady wspólne i indywidualne, grafik zmian oraz zestawienia jakości.

HTML, CSS i JavaScript bez frameworków, zewnętrznych usług i zależności wykonawczych. Nie wymaga budowania ani instalacji pakietów.

## Uruchomienie

Otwórz `index.html` we współczesnej przeglądarce. Do prezentacji zalecany jest GitHub Pages lub lokalny serwer statyczny: zapis dla adresów `file:` zależy od przeglądarki.

Nowe wdrożenie uruchamia się z pustymi słownikami i bez kontroli. Aplikacja nie generuje danych przykładowych.

1. Dodaj pracowników i identyfikatory pieczątek.
2. Wprowadź referencje części oraz kody i nazwy wad.
3. Opcjonalnie przypisz pracownikom zmiany w grafiku.
4. Dodaj kontrolę, liczbę sprawdzonych sztuk i wykryte wady.
5. Przejdź do zestawień lub pobierz CSV.

## Funkcje

- Rejestr z filtrowaniem po okresie, zmianie, brygadzie, pracowniku, referencji i wadzie.
- Jedna wspólna liczba sprawdzonych sztuk na kontrolę; wady przypisane do osób lub całej obsady.
- Analiza Pareto, trendy, porównanie okresów i reguły dopuszczeń.
- Ręczny grafik od poniedziałku do piątku, trzy zmiany i cztery brygady linii.
- Archiwizacja słowników z zachowaniem historii.
- Eksport CSV, wydruk raportów oraz kopie zapasowe JSON.

Wskaźnik „wady / 100 szt.” opisuje liczbę wystąpień wad, nie procent wadliwych części. Jedna część może mieć kilka wad.

## Dane i reset

Dane są zapisywane wyłącznie w `localStorage` przeglądarki pod kluczem `lineflow.v1`. Nie są częścią repozytorium i nie są wysyłane do serwera. GitHub Pages udostępnia tylko pliki aplikacji; nie zapewnia wspólnej bazy ani synchronizacji.

Adres witryny, przeglądarka i profil określają dostęp do zapisu. Projektów Pages na tym samym originie nie należy traktować jako oddzielnych baz: korzystają z tego samego klucza. Zmiana adresu z pliku lokalnego na Pages nie przenosi danych. Do przenoszenia użyj kopii JSON.

Istniejący zapis jest zachowywany po aktualizacji aplikacji. Aby wyczyścić go przed prezentacją, wybierz **Ustawienia > Usuń wszystkie dane** i potwierdź. Reset usuwa kontrole, pracowników, referencje, katalog wad, grafik i dopuszczenia. Katalog nie odtwarza się po ponownym otwarciu aplikacji.

Import JSON zastępuje cały zapis. Przed importem lub resetem pobierz kopię. Kopie, eksporty i rzeczywiste dane pracowników nie powinny trafiać do publicznego repozytorium.

Nie używaj aplikacji równocześnie w kilku kartach. Usunięcie danych witryny lub zamknięcie trybu prywatnego może usunąć zapis. To narzędzie lokalne, bez uwierzytelniania i backendu; wdrożenie wielostanowiskowe wymaga osobnego rozwiązania.

## Publikacja na GitHub Pages

1. Utwórz repozytorium na GitHubie i dodaj pliki projektu, zachowując strukturę katalogów oraz `.gitignore`.
2. W repozytorium otwórz **Settings > Pages**.
3. Wybierz **Deploy from a branch**, gałąź `main` i katalog **/(root)**.
4. Po zakończeniu wdrożenia otwórz adres wskazany przez GitHub.

Ścieżki zasobów są względne, więc aplikacja działa również pod adresem projektu `https://<konto>.github.io/<repozytorium>/`. Nawigacja używa fragmentów adresu, np. `#records`, i nie wymaga przekierowań serwera.

## Testy

Wymagany Node.js 22 lub nowszy. Bez `npm install`:

```shell
npm run check
npm test
```

Testy korzystają z wbudowanego `node:test`. Obejmują m.in. rozliczanie wad, migrację zapisów, eksport, walidację, pusty start i trwałość resetu. GitHub Actions uruchamia te same polecenia przy pushach i pull requestach.

Jeśli PowerShell blokuje skrypt `npm.ps1`, użyj `npm.cmd run check` oraz `npm.cmd test`.

## Pliki

- [index.html](index.html): układ aplikacji.
- [styles.css](styles.css): wygląd i układy responsywne.
- [app.js](app.js): logika, walidacja i zapis lokalny.
- [app.test.cjs](app.test.cjs): testy regresji.
