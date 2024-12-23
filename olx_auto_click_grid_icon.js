// ==UserScript==
// @name         OLX Auto Click Grid Icon
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Clicks grid icon on OLX if it's inactive
// @author       puksh
// @match        https://www.olx.pl/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const targetColor = 'rgb(127, 151, 153)'; // #7F9799 in rgb format
    const targetColorDarkReader = 'rgb(159, 151, 139)';

    function simulateClick(element) {
        const event = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        element.dispatchEvent(event);
        console.log("Simulated click dispatched.");
    }

    function checkAndClick() {
        const gridIconParent = document.querySelector('[data-testid="grid-icon"]');
        if (gridIconParent) {
            const style = window.getComputedStyle(gridIconParent);
            if (style.color === targetColor || style.color === targetColorDarkReader) {
                console.log("Grid icon found with matching color. Clicking...");
                simulateClick(gridIconParent);
            }
        }
    }

    // Observe DOM changes for dynamically loaded elements
    const observer = new MutationObserver(() => checkAndClick());
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial check in case the element is already present
    checkAndClick();
})();
