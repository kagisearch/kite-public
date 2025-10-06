# Kagi News - News. Elevated.

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)

This repository contains public files for [Kagi News](https://kite.kagi.com), news app for people who want a healthy news diet, developed by [Kagi](https://kagi.com).

Kagi News is designed for people who want to stay informed without getting overwhelmed. We provide daily updates of the most important news stories, from carefully curated sources and summarized by advanced language models to give you the essential information you need. We strive for diversity and transparency of resources and welcome your contributions to widen perspectives. This multi-source approach helps reveal the full picture beyond any single viewpoint.

Most of what powers Kagi News is open sourced and is found in this repository.

This includes

- Kagi News web app
- Community curated feeds
- Media information

## Core Principles

- Updated only once per day - no endless scrolling (12PM UTC)
- Facts and perspectives, opinion-free
- Zero tracking, zero ads
- Pure signal, no noise
- Quality over quantity
- Complete news diet in 5 minutes

You can read more about core principles behind Kagi News

- [Avoid News: Towards a Healthy News Diet](https://www.gwern.net/docs/culture/2010-dobelli.pdf) ([HN discussion](https://news.ycombinator.com/item?id=21430337))
- [News is bad for you](http://www.theguardian.com/media/2013/apr/12/news-is-bad-rolf-dobelli) ([HN discussion](https://news.ycombinator.com/item?id=6894244))
- [Stop reading news](https://fs.blog/2013/12/stop-reading-news/) ([HN discussion](https://news.ycombinator.com/item?id=19084099))

If you prefer to watch a short video, check this Ted talk: [Four reasons you should stop watching the news | Rolf Dobelli](https://www.youtube.com/watch?v=-miTTiaqFlI).

# Install & run Kagi News front-end

Kagi News front end is a statically served app and is fully open source.

Here is how to run it locally:

```bash
# Clone the repository
git clone https://github.com/kagisearch/kite-public.git
cd kite-public

# Make sure you have the Node.js LTS version installed.
node -v

# Install dependencies
npm install

# Run development server
npm run dev
```

Check out the Vite documentation on how a production build works: https://vite.dev/guide/static-deploy.html

Kagi News front-end uses Kagi News application data that can be found at [kite.kagi.com/kite.json](https://kite.kagi.com/kite.json) (explore other files from there). Note that kite.json and files referenced by it are licensed under [CC BY-NC license](https://creativecommons.org/licenses/by-nc/4.0/). This means that this data can be used free of charge (with attribution and for non-commercial use). If you would like to license this data for commercial use let us know through support@kagi.com.

Kagi News web app is just one example front-end that one can run on top of the Kagi News data. We encourage others to contribute improvements to the Kagi News frontend.

**We would also love to see what kind of custom front-ends you can create on top of Kagi News data!** Feel free to share them with us and others by editing this Readme file.

## Editing categories

To edit community curated categories, submit a pull request editing `kite_feeds.json`. If you do not know how to do that, you can [open an issue](https://github.com/kagisearch/kite-public/issues/new/choose) and share the feeds you want to add there.

This file contains RSS feeds for various categories.

To add a new category or modify existing ones, follow this structure:

```jsonc
{
  "Category Name": {
    "feeds": [
      "https://example.com/rss-feed-1",
      "https://example.com/rss-feed-2",
      // ...
    ],
  },
  "Another Category": {
    "feeds": [
      "https://another-example.com/rss-feed-1",
      "https://another-example.com/rss-feed-2",
      // ...
    ],
  },
}
```

### Adding a new category

1. Create a new object with the category name as the key
2. Add a "feeds" array containing the RSS feed URLs for that category
3. Ensure proper JSON formatting (commas between objects, no trailing comma)

All categories are created equal and will appear as top level categories in the Kagi News app.

Ideas for categories:

- Local news (city/state level)
- Regional news (country/region)
- Topical news (health, machine learning, aviation ...)

### Guidelines for adding RSS feeds

Kagi News does not scrape websites, but only publicly available RSS feeds.

When adding an RSS feed make sure to:

- Check that feed is working and has recent (daily) content.
- Choose sources that have high quality content. Do not use low quality/gossip/SEO content.
- Feeds should be in the same language as the rest of the feeds in that category (do not mix languages)

### Important

We require at least **25 feeds** for a category in order to surface it in Kagi News. This is to make sure we maintain high level of quality of events covered in the app. The more high quality feeds exist for a category, the better Kagi News coverage will be. The feeds should be using the same language.

Kagi News does not scrape news websites, it only uses publicly available information in RSS feeds.

## Core Feeds

Kagi News's official core feeds are fully open source and available in `core_feeds.py`. These feeds cover essential news categories and form the foundation of Kagi News's coverage. While primarily maintained by the Kagi team for quality and consistency, they are open to community contributions - you can submit pull requests to suggest improvements or additions to these core feeds.

Core categories include:
- World News
- Business
- Technology
- Science
- Sports
- Culture
- Politics
- And many more specialized topics

The combination of these core feeds and community-curated feeds ensures comprehensive, diverse news coverage from multiple perspectives.

## Guidelines for editing Media information

Kagi News uses contents of `media_data.json` to show additional information about sources of information. Initial information has been sources from https://statemediamonitor.com/ and the classification methodology is explained here https://statemediamonitor.com/methodology/

Feel free to add additional information (by editing `media_data.json`) both for privately owned and state funded media organization. Add your sources of information in the pull request.

## Guidelines for editing Content Filters

Kagi News allows users to blur or hide articles on topics they prefer not to see. These personal content filters are defined in `src/lib/data/contentFilters.json` and are open source and community editable.

To edit content filters, submit a pull request editing `contentFilters.json`. Each filter follows this structure:

```json
{
  "id": "filter_id",
  "label": "Display Name",
  "keywords": {
    "default": ["keyword1", "keyword2"],
    "en": ["keyword1", "keyword2"],
    "pt": ["palavra1", "palavra2"],
    // ... other languages
  }
}
```

When adding or modifying filters:
- Use lowercase for all keywords
- Include translations for all supported languages
- Choose descriptive, clear labels for filter categories
- Test that keywords accurately match the intended topic

Feel free to add new filter categories or improve existing ones by adding relevant keywords in multiple languages.