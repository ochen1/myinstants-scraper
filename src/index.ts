import * as cheerio from "cheerio";

export type Instant = {
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

export type ScrapeOptions = {
  maxPages?: number;
  stopOnDuplicatePage?: boolean;
};

export type ScraperConfig = {
  delayMs?: number;
  userAgent?: string;
  fetchImpl?: typeof fetch;
};

const DEFAULT_DELAY_MS = 1000;
const DEFAULT_MAX_PAGES = 1;
const DEFAULT_USER_AGENT = "myinstants-scraper/0.1.0";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePlayArgs(onclick = "") {
  const match = onclick.match(
    /play\('([^']+)',\s*'([^']+)',\s*'([^']+)'\)/
  );

  if (!match) {
    return null;
  }

  return {
    audioPath: match[1],
    loaderId: match[2] || null,
    slug: match[3]
  };
}

function parseFavoriteId(onclick = "") {
  const match = onclick.match(/favorite\('([^']+)'\)/);
  return match?.[1] ?? null;
}

function parseColor(style = "") {
  const match = style.match(/background-color:\s*([^;]+)/i);
  return match?.[1]?.trim() ?? null;
}

export function parseListingHtml(html: string, pageUrl: string): Instant[] {
  const $ = cheerio.load(html);
  const baseUrl = new URL(pageUrl);
  const cards = $("#instants_container .instant").toArray();

  return cards
    .map((element) => {
      const card = $(element);
      const link = card.find("a.instant-link").first();
      const button = card.find("button.small-button").first();
      const favoriteButton = card
        .find("button.instant-action-button")
        .first();

      const detailPath = link.attr("href");
      const title = link.text().trim();
      const onclick = button.attr("onclick") ?? "";
      const play = parsePlayArgs(onclick);

      if (!detailPath || !title || !play) {
        return null;
      }

      return {
        title,
        slug: play.slug,
        detailPath,
        detailUrl: new URL(detailPath, baseUrl).toString(),
        audioPath: play.audioPath,
        audioUrl: new URL(play.audioPath, baseUrl).toString(),
        loaderId: play.loaderId,
        color: parseColor(
          card.find(".small-button-background").attr("style") ?? ""
        ),
        favoriteId: parseFavoriteId(favoriteButton.attr("onclick") ?? "")
      } satisfies Instant;
    })
    .filter((value): value is Instant => value !== null);
}

export class MyinstantsScraper {
  private readonly delayMs: number;
  private readonly userAgent: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: ScraperConfig = {}) {
    this.delayMs = config.delayMs ?? DEFAULT_DELAY_MS;
    this.userAgent = config.userAgent ?? DEFAULT_USER_AGENT;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async fetchPage(pageUrl: string, pageNumber: number) {
    const url = new URL(pageUrl);

    if (pageNumber > 1) {
      url.searchParams.set("page", String(pageNumber));
    } else {
      url.searchParams.delete("page");
    }

    const response = await this.fetchImpl(url, {
      headers: {
        "user-agent": this.userAgent
      }
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch page ${pageNumber} (${response.status})`
      );
    }

    return response.text();
  }

  async scrape(pageUrl: string, options: ScrapeOptions = {}) {
    const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
    const stopOnDuplicatePage = options.stopOnDuplicatePage ?? true;
    const allResults: Instant[] = [];
    const seenSlugs = new Set<string>();

    for (let page = 1; page <= maxPages; page += 1) {
      const html = await this.fetchPage(pageUrl, page);
      const results = parseListingHtml(html, pageUrl);

      if (results.length === 0) {
        break;
      }

      let newItems = 0;

      for (const result of results) {
        if (seenSlugs.has(result.slug)) {
          continue;
        }

        seenSlugs.add(result.slug);
        allResults.push(result);
        newItems += 1;
      }

      if (stopOnDuplicatePage && newItems === 0) {
        break;
      }

      if (page < maxPages && this.delayMs > 0) {
        await sleep(this.delayMs);
      }
    }

    return allResults;
  }
}

export async function scrapeListing(
  pageUrl: string,
  options: ScrapeOptions = {},
  config: ScraperConfig = {}
) {
  const scraper = new MyinstantsScraper(config);
  return scraper.scrape(pageUrl, options);
}
