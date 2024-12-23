// ==UserScript==
// @name         OLX Open in New Tabs
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adds a button to open all new favourites links in new tabs on OLX observed search page.
// @author       puksh
// @match        https://www.olx.pl/obserwowane/search/
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Function to wait for the page to load
    function waitForElement(selector, callback) {
        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                callback(element);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Create a button
    function createButton(targetDiv) {
        const button = document.createElement('button');
        button.textContent = 'Open All Links';
        button.style.position = 'fixed';
        button.style.bottom = '10px';
        button.style.right = '10px';
        button.style.zIndex = '1000';
        button.style.padding = '10px';
        button.style.backgroundColor = '#007bff';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.cursor = 'pointer';

        // Append the button to the specified div
        targetDiv.appendChild(button);

        // Add click event to the button
        button.addEventListener('click', () => {
            const elements = document.querySelectorAll('.css-145nzzq');
            elements.forEach((element, index) => {
                setTimeout(() => {
                    const link = element.closest('a');
                    if (link) {
                        const url = new URL(link.href);
                        url.searchParams.set('view', 'grid');
                        window.open(url.href, '_blank');
                    }
                }, index * 500); // 500ms delay between each tab opening
            });
        });
    }

    // Wait for the target div to load and create the button
    waitForElement('.css-1u6y1sg', createButton);
})();
