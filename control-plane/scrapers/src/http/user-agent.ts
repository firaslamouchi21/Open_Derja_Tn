const DEFAULT_CONTACT_URL = 'https://github.com/opendarja-tn/opendarja_tn';

export function scraperUserAgent(): string {
  const contactUrl = process.env.SCRAPER_CONTACT_URL ?? DEFAULT_CONTACT_URL;
  return `OpenDerjaTN-Scraper/0.1 (+${contactUrl})`;
}
