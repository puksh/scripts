// ==UserScript==
// @name         YouTube Redirect to Subscriptions
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Always redirect YouTube homepage to Subscriptions feed, including internal navigation (logo/home clicks)
// @author       pukash
// @match        *://m.youtube.com/*
// @match        *://www.youtube.com/*
// @match        *://youtube.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const redirectIfNeeded = () => {
        const path = location.pathname;
        const isHome = path === '/' || path === '/index.html';
        const isSubs = path.startsWith('/feed/subscriptions');

        if (isHome && !isSubs) {
            location.replace('https://www.youtube.com/feed/subscriptions');
        }
    };

    // Initial redirect
    redirectIfNeeded();

    // Observe SPA navigation changes (URL change without full reload)
    let lastUrl = location.href;
    new MutationObserver(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            redirectIfNeeded();
        }
    }).observe(document, { subtree: true, childList: true });
})();