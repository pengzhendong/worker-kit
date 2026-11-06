// Developer machines use Chrome; the pinned Playwright container provides Chromium.
export const browserOptions =
  process.env.WORKERKIT_BROWSER_CHANNEL === 'chromium'
    ? { headless: true }
    : {
        headless: true,
        channel: process.env.WORKERKIT_BROWSER_CHANNEL || 'chrome',
      };
