/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-b1bafff1'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "pwa-maskable-512x512.png",
    "revision": "b59ae9712be7b988fb252882e1b26025"
  }, {
    "url": "pwa-512x512.png",
    "revision": "c3b0ef88e9f9b45908a15f4201e72f51"
  }, {
    "url": "pwa-192x192.png",
    "revision": "241a20d1dfee75f03b9894e2e2a12d87"
  }, {
    "url": "index.html",
    "revision": "115626c7828fd4e2041ff6bf330b503c"
  }, {
    "url": "icon.svg",
    "revision": "6852bccab39e77938f6c7fe9f742e427"
  }, {
    "url": "icon-maskable.svg",
    "revision": "7b148507a27267bf5a4e40f7a6fbf580"
  }, {
    "url": "favicon.ico",
    "revision": "cb99c3eaca4e989cba5c374078409a29"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "f430ef143e307968446a9ced8827afa1"
  }, {
    "url": "assets/workbox-window.prod.es5-Bd17z0YL.js",
    "revision": null
  }, {
    "url": "assets/web-hlJnDahv.js",
    "revision": null
  }, {
    "url": "assets/web-gwPA9A_v.js",
    "revision": null
  }, {
    "url": "assets/web-D_v9y4Wp.js",
    "revision": null
  }, {
    "url": "assets/web-CoBhynh6.js",
    "revision": null
  }, {
    "url": "assets/scheherazade-new-latin-700-normal-BRBC5bke.woff2",
    "revision": null
  }, {
    "url": "assets/scheherazade-new-latin-700-normal-BLgVC2Z_.woff",
    "revision": null
  }, {
    "url": "assets/scheherazade-new-latin-400-normal-X_aqx3In.woff2",
    "revision": null
  }, {
    "url": "assets/scheherazade-new-latin-400-normal-DSpaYQ48.woff",
    "revision": null
  }, {
    "url": "assets/scheherazade-new-arabic-700-normal-BgseUfDr.woff2",
    "revision": null
  }, {
    "url": "assets/scheherazade-new-arabic-700-normal-B_V_WvY8.woff",
    "revision": null
  }, {
    "url": "assets/scheherazade-new-arabic-400-normal-BusZfw6j.woff",
    "revision": null
  }, {
    "url": "assets/scheherazade-new-arabic-400-normal-BQFftFrr.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-vietnamese-700-normal-CV6qDkkj.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-vietnamese-700-normal-BCh_uG_5.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-vietnamese-600-normal-Y4VTTRme.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-vietnamese-600-normal-5YsyKbU1.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-vietnamese-500-normal-DiU8zqi-.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-vietnamese-500-normal-CvE5C8T-.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-ext-700-normal-BajbvANd.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-ext-700-normal-8-d-IyIQ.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-ext-600-normal-DQgPU_Cg.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-ext-600-normal-B0WRRYJ1.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-ext-500-normal-CqEEAICU.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-ext-500-normal-9VZagAe1.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-700-normal-DqEcQeE5.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-700-normal-CfpNZvy6.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-600-normal-DLTa1BUW.woff2",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-600-normal-BR_Ojra4.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-500-normal-DYtqi0QS.woff",
    "revision": null
  }, {
    "url": "assets/plus-jakarta-sans-latin-500-normal-Bf-nb4oT.woff2",
    "revision": null
  }, {
    "url": "assets/mode_work-CSbvkw8Y.webp",
    "revision": null
  }, {
    "url": "assets/mode_study-Btox0RT4.webp",
    "revision": null
  }, {
    "url": "assets/mode_sleep-CQ0Yl1bO.webp",
    "revision": null
  }, {
    "url": "assets/index-Ds_Lu5sM.js",
    "revision": null
  }, {
    "url": "assets/index-BleHNXly.css",
    "revision": null
  }, {
    "url": "assets/dm-sans-latin-ext-700-normal-CJIcxD6K.woff2",
    "revision": null
  }, {
    "url": "assets/dm-sans-latin-ext-700-normal-BLI3TTWz.woff",
    "revision": null
  }, {
    "url": "assets/dm-sans-latin-ext-500-normal-DR84L5F-.woff",
    "revision": null
  }, {
    "url": "assets/dm-sans-latin-ext-500-normal-BJfUCQsA.woff2",
    "revision": null
  }, {
    "url": "assets/dm-sans-latin-ext-400-normal-BtiwyxMk.woff2",
    "revision": null
  }, {
    "url": "assets/dm-sans-latin-ext-400-normal-BjWJ59Pq.woff",
    "revision": null
  }, {
    "url": "assets/dm-sans-latin-700-normal-DvUfVpUG.woff2",
    "revision": null
  }, {
    "url": "assets/dm-sans-latin-700-normal-CUSSCpQX.woff",
    "revision": null
  }, {
    "url": "assets/dm-sans-latin-500-normal-Dr3UlScf.woff",
    "revision": null
  }, {
    "url": "assets/dm-sans-latin-500-normal-B9HHJjqV.woff2",
    "revision": null
  }, {
    "url": "assets/dm-sans-latin-400-normal-CW0RaeGs.woff2",
    "revision": null
  }, {
    "url": "assets/dm-sans-latin-400-normal-BwCSEQnW.woff",
    "revision": null
  }, {
    "url": "assets/amiri-quran-latin-400-normal-w9exIk9i.woff2",
    "revision": null
  }, {
    "url": "assets/amiri-quran-latin-400-normal-mk44s-1k.woff",
    "revision": null
  }, {
    "url": "assets/amiri-quran-arabic-400-normal-wRcqfVJx.woff2",
    "revision": null
  }, {
    "url": "assets/amiri-quran-arabic-400-normal-CZ144KtP.woff",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "f430ef143e307968446a9ced8827afa1"
  }, {
    "url": "favicon.ico",
    "revision": "cb99c3eaca4e989cba5c374078409a29"
  }, {
    "url": "icon-maskable.svg",
    "revision": "7b148507a27267bf5a4e40f7a6fbf580"
  }, {
    "url": "icon.svg",
    "revision": "6852bccab39e77938f6c7fe9f742e427"
  }, {
    "url": "pwa-192x192.png",
    "revision": "241a20d1dfee75f03b9894e2e2a12d87"
  }, {
    "url": "pwa-512x512.png",
    "revision": "c3b0ef88e9f9b45908a15f4201e72f51"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "b59ae9712be7b988fb252882e1b26025"
  }, {
    "url": "manifest.json",
    "revision": "3c08d6a5f95186337b4fb86b2883ee56"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/\/sounds\/.*\.(mp3|ogg)$/i, new workbox.CacheFirst({
    "cacheName": "ambient-sounds-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 20,
      maxAgeSeconds: 7776000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/api\.alquran\.cloud\/v1\/.*/i, new workbox.StaleWhileRevalidate({
    "cacheName": "alquran-api-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 250,
      maxAgeSeconds: 2592000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/mp3quran\.net\/api\/.*/i, new workbox.StaleWhileRevalidate({
    "cacheName": "mp3quran-api-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 20,
      maxAgeSeconds: 604800
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
