# myinstants-scraper

A small open source JavaScript library for scraping Myinstants pages by using the
same model the site uses in the browser: fetch the first HTML page, then follow
`?page=N` HTML pagination and parse `#instants_container`.

This is designed for:

- country index pages like `/en/index/ca/`
- search pages like `/en/search/?name=fart`
- category pages like `/en/categories/memes/`
- similar HTML-first pages that expose sound cards inside `#instants_container`

## Install

```bash
npm install myinstants-scraper
```

## Usage

```ts
import { scrapeListing, MyinstantsScraper } from "myinstants-scraper";

const sounds = await scrapeListing("https://www.myinstants.com/en/index/ca/", {
  maxPages: 3
});

console.log(sounds[0]);

const scraper = new MyinstantsScraper({
  delayMs: 1000,
  userAgent: "myinstants-scraper/0.1.0"
});

const results = await scraper.scrape("https://www.myinstants.com/en/search/?name=fart", {
  maxPages: 2
});
```

## Returned shape

```ts
type Instant = {
  title: string;
  slug: string;
  detailPath: string;
  detailUrl: string;
  audioPath: string;
  audioUrl: string;
  loaderId: string | null;
  color: string | null;
  favoriteId: string | null;
};
```

## Notes

- The library parses HTML, not a private JSON API.
- Myinstants loads additional results with `?page=N`, so this library follows
  the same pattern.
- Respect the target site's terms, robots rules, and rate limits.

## Development

```bash
npm install
npm run build
```

## License

MIT
