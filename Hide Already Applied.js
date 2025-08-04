// ==UserScript==
// @name         Pracuj.pl Hide Already Applied
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Give an option to remove already applied to company offers on pracuj.pl
// @author       pukash
// @match        https://www.pracuj.pl/praca/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'hiddenCompaniesPracuj';

    function safeGetHiddenCompanies() {
        try {
            const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(data) ? data : [];
        } catch (e) {
            console.error('[Pracuj Hider] Failed to parse hidden company list:', e);
            localStorage.removeItem(STORAGE_KEY);
            return [];
        }
    }

    function saveHiddenCompanies(companies) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
    }

    function addCompanyToHidden(name) {
        const hidden = safeGetHiddenCompanies();
        if (!hidden.includes(name)) {
            hidden.push(name);
            saveHiddenCompanies(hidden);
            refreshUI();
        }
    }

    function removeCompanyFromHidden(name) {
        const hidden = safeGetHiddenCompanies().filter(c => c !== name);
        saveHiddenCompanies(hidden);
        refreshUI();
    }

    function createUIPanel() {
        if (document.getElementById('gpt-hidden-companies-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'gpt-hidden-companies-panel';
        panel.style.position = 'fixed';
        panel.style.bottom = '20px';
        panel.style.right = '20px';
        panel.style.backgroundColor = '#fff';
        panel.style.border = '1px solid #ccc';
        panel.style.borderRadius = '8px';
        panel.style.padding = '10px';
        panel.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
        panel.style.zIndex = '10000';
        panel.style.fontSize = '14px';
        panel.style.maxHeight = '300px';
        panel.style.overflowY = 'auto';
        panel.style.width = '220px';

        const title = document.createElement('div');
        title.textContent = 'Hidden Companies';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '6px';

        const list = document.createElement('ul');
        list.id = 'gpt-company-list';
        list.style.listStyle = 'none';
        list.style.padding = '0';
        list.style.margin = '0';

        panel.appendChild(title);
        panel.appendChild(list);
        document.body.appendChild(panel);

        refreshUI();
    }

    function refreshUI() {
        const list = document.getElementById('gpt-company-list');
        if (!list) return;

        list.innerHTML = '';
        const hidden = safeGetHiddenCompanies();

        hidden.forEach(name => {
            const item = document.createElement('li');
            item.style.marginBottom = '6px';

            const label = document.createElement('span');
            label.textContent = name;

            const unhideBtn = document.createElement('button');
            unhideBtn.textContent = 'Unhide';
            unhideBtn.style.marginLeft = '10px';
            unhideBtn.style.cursor = 'pointer';
            unhideBtn.style.fontSize = '12px';

            unhideBtn.onclick = () => {
                removeCompanyFromHidden(name);
                location.reload();
            };

            item.appendChild(label);
            item.appendChild(unhideBtn);
            list.appendChild(item);
        });
    }

    function addHideButtonToOffer(offer) {
        const nameElem = offer.querySelector('[data-test="text-company-name"]');
        if (!nameElem) return;

        const companyName = nameElem.textContent.trim();
        if (!companyName || offer.querySelector('.gpt-hide-button')) return;

        // Create a floating container if not exists
        if (!offer.style.position || offer.style.position === 'static') {
            offer.style.position = 'relative';
        }

        const btn = document.createElement('button');
        btn.textContent = '➕';
        btn.title = 'Hide this company';
        btn.className = 'gpt-hide-button';

        // Floating style
        btn.style.position = 'absolute';
        btn.style.top = '4px';
        btn.style.left = '4px';
        btn.style.zIndex = '9999';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '16px';
        btn.style.border = 'none';
        btn.style.background = '#ffffffdd';
        btn.style.padding = '2px 6px';
        btn.style.borderRadius = '4px';
        btn.style.boxShadow = '0 0 4px rgba(0,0,0,0.2)';
        btn.style.color = '#0073e6';
        btn.style.fontWeight = 'bold';

        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            addCompanyToHidden(companyName);
            processOffers();
        };

        offer.appendChild(btn);
    }


    function processOffers() {
        const hidden = safeGetHiddenCompanies();
        const section = document.querySelector('[data-test="section-offers"]');
        if (!section) return;

        const offers = section.querySelectorAll(':scope > div');

        offers.forEach(offer => {
            const nameElem = offer.querySelector('[data-test="text-company-name"]');
            if (!nameElem) return;

            const companyName = nameElem.textContent.trim();
            if (hidden.includes(companyName)) {
                offer.style.display = 'none';
            } else {
                addHideButtonToOffer(offer);
            }
        });
    }

    function observeOffers() {
        const section = document.querySelector('[data-test="section-offers"]');
        if (!section) return;

        const observer = new MutationObserver(() => {
            processOffers();
        });

        observer.observe(section, {
            childList: true,
            subtree: true,
        });
    }

    function run() {
        console.log('[Pracuj Hider] Running script...');
        if (!document.querySelector('[data-test="section-offers"]')) return;

        createUIPanel();
        processOffers();
        observeOffers();
    }

    // Run on full load
    window.addEventListener('load', () => {
        setTimeout(run, 500);
    });

    // Handle SPA navigation/back-forward cache (especially Firefox)
    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            setTimeout(run, 500);
        }
    });

    // Fallback: re-run when user goes back in history (SPA behavior)
    window.addEventListener('popstate', () => {
        setTimeout(run, 500);
    });

    let retryCount = 0;
    const retryMax = 10;
    const retryInterval = setInterval(() => {
        if (retryCount >= retryMax) {
            clearInterval(retryInterval);
            return;
        }
        if (document.querySelector('[data-test="section-offers"]')) {
            run();
            clearInterval(retryInterval);
        }
        retryCount++;
    }, 1000);

})();
