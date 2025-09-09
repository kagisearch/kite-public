import adapterNode from "@sveltejs/adapter-node";
import adapterStatic from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    // Avoid leading-underscore dir on GitHub Pages; prevents Jekyll conflicts
    appDir: 'app',
    adapter:
      process.env.KIT_ADAPTER === "static"
        ? adapterStatic({ fallback: "index.html" })
        : adapterNode(),
    prerender: {
      // Avoid failing preview/static builds due to dynamic routes not discovered during crawl
      handleUnseenRoutes: 'ignore',
      handleHttpError: 'warn'
    },
    // Narrow type of BASE_PATH to satisfy SvelteKit's template-literal type
    // "" | `/${string}` | undefined
    paths: {
      /** @type {"" | `/${string}` | undefined} */
      base: process.env.BASE_PATH
        ? `/${process.env.BASE_PATH.replace(/^\/+|\/$/g, "")}`
        : "",
    },
    csrf: {
      trustedOrigins: [
        "https://kagisearch.github.io",
        "https://xytronix.github.io"
      ],
    },
  },
};

export default config;
