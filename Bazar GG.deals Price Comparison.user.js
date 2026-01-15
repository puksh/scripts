// ==UserScript==
// @name         Bazar GG.deals Price Comparison
// @namespace    http://tampermonkey.net/
// @version      2.8
// @description  Show lowest GG.deals prices on Bazar
// @author       You
// @match        https://bazar.lowcygier.pl/*
// @grant        GM_xmlhttpRequest
// @connect      gg.deals
// @run-at       document-end
// ==/UserScript==

;(function () {
	'use strict'

	const processed = new Set()
	const cache = new Map()
	const GG_LOGO = 'https://bazar.lowcygier.pl/images/icons/gg.svg'

	// Inject CSS
	const style = document.createElement('style')
	style.textContent = `
        .gg-price-container {
            position: absolute;
            left: -115px;
            top: 50%;
            transform: translateY(-50%);
            width: 110px;
            padding: 4px;
            border-radius: 6px;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        .gg-price-container.gg-cheaper {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
        }
        .gg-price-container.gg-expensive {
            background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
        }
        .gg-price-container.gg-similar {
            background: linear-gradient(135deg, #c06c00 0%, #e07d00 100%);
        }
        .gg-price-container:hover {
            transform: translateY(-50%) translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        .gg-price-loading {
            background: #f5f5f5 !important;
        }
        .gg-price-content {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            color: white;
            font-weight: 600;
            font-size: 20px;
        }
        .gg-logo {
            width: 22px;
            height: auto;
            display: block;
        }
        .gg-spinner {
            width: 14px;
            height: 14px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #c06c00;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .gg-error {
            background: rgba(192, 108, 0, 0.3) !important;
            color: white;
        }
        .gg-search-hint {
            font-size: 10px;
            opacity: 0.9;
        }
    `
	document.head.appendChild(style)

	function normalizeGameName(name) {
		return name
			.toLowerCase()
			.replace(/[^\w\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
	}

	function getAlternativeNames(gameName) {
		const alternatives = []
		const specialChars = /[@:+&|()[\]{}]/

		if (specialChars.test(gameName)) {
			// Try name before special character
			const beforeSpecial = gameName.split(/[@:+&|()[\]{}]/)[0].trim()
			if (beforeSpecial && beforeSpecial !== gameName) {
				alternatives.push(beforeSpecial)
			}

			// Try removing special characters
			const withoutSpecial = gameName.replace(/[@:+&|()[\]{}]/g, ' ').trim()
			if (withoutSpecial !== gameName && withoutSpecial !== beforeSpecial) {
				alternatives.push(withoutSpecial)
			}
		}

		return alternatives
	}

	function parseBazarPrice(priceBlock) {
		const priceText = priceBlock.textContent.trim()

		let match = priceText.match(/od\s*(\d+[.,]\d+)/i)
		if (match) {
			const price = parseFloat(match[1].replace(',', '.'))
			return price
		}

		match = priceText.match(/(\d+[.,]\d+)\s*zł/i)
		if (match) {
			const price = parseFloat(match[1].replace(',', '.'))
			return price
		}

		return null
	}

	function parseGGPrice(priceText) {
		const cleaned = priceText.replace(/[^\d.,]/g, '').replace(',', '.')
		const price = parseFloat(cleaned)
		return isNaN(price) ? null : price
	}

	function createPriceElement(gameName) {
		const container = document.createElement('div')
		container.className = 'gg-price-container gg-price-loading'

		const content = document.createElement('div')
		content.className = 'gg-price-content'
		content.innerHTML = `
            <img src="${GG_LOGO}" class="gg-logo" alt="GG.deals">
            <div class="gg-spinner"></div>
        `

		container.appendChild(content)

		return { container, content }
	}

	function updatePriceElement(content, ggPrice, bazarPrice, gameName, notFound = false) {
		const container = content.closest('.gg-price-container')
		container.classList.remove('gg-price-loading')

		if (notFound) {
			container.classList.add('gg-error')
			container.addEventListener('mousedown', (e) => {
				const url = `https://gg.deals/games/?title=${encodeURIComponent(gameName)}`
				if (e.button === 1) {
					// Middle click
					e.preventDefault()
					window.open(url, '_blank')
				} else if (e.button === 0) {
					// Left click
					window.open(url, '_self')
				}
			})
			content.innerHTML = `
                <img src="${GG_LOGO}" class="gg-logo" alt="GG.deals">
                <span class="gg-search-hint">🔍 Click to search</span>
            `
			return
		}

		if (ggPrice === null) {
			container.classList.add('gg-error')
			content.innerHTML = `
                <img src="${GG_LOGO}" class="gg-logo" alt="GG.deals">
                <span>Error</span>
            `
			return
		}

		let colorClass = 'gg-similar'

		if (bazarPrice !== null && ggPrice !== null) {
			const diff = bazarPrice - ggPrice

			if (diff > 0.25) {
				colorClass = 'gg-cheaper'
			} else if (diff < -0.75) {
				colorClass = 'gg-expensive'
			} else {
				colorClass = 'gg-similar'
			}
		}

		container.classList.add(colorClass)

		content.innerHTML = `
            <img src="${GG_LOGO}" class="gg-logo" alt="GG.deals">
            <span>${ggPrice.toFixed(2)} zł</span>
        `

		container.addEventListener('mousedown', (e) => {
			const url = `https://gg.deals/game/${normalizeGameName(gameName)}/`
			if (e.button === 1) {
				// Middle click
				e.preventDefault()
				window.open(url, '_blank')
			} else if (e.button === 0) {
				// Left click
				window.open(url, '_self')
			}
		})
	}

	function tryFetchWithAlternatives(gameName, content, bazarPrice, alternatives = null, index = 0) {
		if (alternatives === null) {
			alternatives = getAlternativeNames(gameName)
		}

		if (index >= alternatives.length) {
			// All alternatives exhausted
			const normalized = normalizeGameName(gameName)
			cache.set(normalized, { price: null, notFound: true })
			updatePriceElement(content, null, bazarPrice, gameName, true)
			return
		}

		const alternativeName = alternatives[index]
		const normalized = normalizeGameName(alternativeName)

		const url = `https://gg.deals/game/${normalized}/`

		GM_xmlhttpRequest({
			method: 'GET',
			url: url,
			timeout: 10000,
			onload: function (response) {
				if (response.finalUrl.includes('/games/?') || response.status === 404) {
					// Try next alternative
					tryFetchWithAlternatives(gameName, content, bazarPrice, alternatives, index + 1)
					return
				}

				const parser = new DOMParser()
				const doc = parser.parseFromString(response.responseText, 'text/html')
				const keyshopLink = doc.querySelector('a[href="#keyshops"]')
				const priceSpan = keyshopLink ? keyshopLink.querySelector('.price-inner.numeric') : null

				if (!priceSpan) {
					// Try next alternative
					tryFetchWithAlternatives(gameName, content, bazarPrice, alternatives, index + 1)
					return
				}

				const ggPrice = parseGGPrice(priceSpan.textContent.trim())
				const originalNormalized = normalizeGameName(gameName)
				cache.set(originalNormalized, { price: ggPrice, notFound: false })
				updatePriceElement(content, ggPrice, bazarPrice, alternativeName, false)
			},
			onerror: function () {
				tryFetchWithAlternatives(gameName, content, bazarPrice, alternatives, index + 1)
			},
			ontimeout: function () {
				tryFetchWithAlternatives(gameName, content, bazarPrice, alternatives, index + 1)
			},
		})
	}

	function fetchGGDealsPrice(gameName, content, bazarPrice) {
		const normalized = normalizeGameName(gameName)

		if (cache.has(normalized)) {
			const cached = cache.get(normalized)
			updatePriceElement(content, cached.price, bazarPrice, gameName, cached.notFound)
			return
		}

		const url = `https://gg.deals/game/${normalized}/`

		GM_xmlhttpRequest({
			method: 'GET',
			url: url,
			timeout: 10000,
			onload: function (response) {
				if (response.finalUrl.includes('/games/?') || response.status === 404) {
					// Try alternatives if available
					const alternatives = getAlternativeNames(gameName)
					if (alternatives.length > 0) {
						tryFetchWithAlternatives(gameName, content, bazarPrice, alternatives, 0)
					} else {
						cache.set(normalized, { price: null, notFound: true })
						updatePriceElement(content, null, bazarPrice, gameName, true)
					}
					return
				}

				const parser = new DOMParser()
				const doc = parser.parseFromString(response.responseText, 'text/html')
				const keyshopLink = doc.querySelector('a[href="#keyshops"]')
				const priceSpan = keyshopLink ? keyshopLink.querySelector('.price-inner.numeric') : null

				if (!priceSpan) {
					// Try alternatives if available
					const alternatives = getAlternativeNames(gameName)
					if (alternatives.length > 0) {
						tryFetchWithAlternatives(gameName, content, bazarPrice, alternatives, 0)
					} else {
						cache.set(normalized, { price: null, notFound: true })
						updatePriceElement(content, null, bazarPrice, gameName, true)
					}
					return
				}

				const ggPrice = parseGGPrice(priceSpan.textContent.trim())
				cache.set(normalized, { price: ggPrice, notFound: false })
				updatePriceElement(content, ggPrice, bazarPrice, gameName, false)
			},
			onerror: function () {
				updatePriceElement(content, null, bazarPrice, gameName, false)
			},
			ontimeout: function () {
				updatePriceElement(content, null, bazarPrice, gameName, false)
			},
		})
	}

	function processGame(item) {
		const gameLink = item.querySelector('.media-heading a')
		const priceBlock = item.querySelector('.oswald.pc')

		if (!gameLink || !priceBlock) return

		const gameName = gameLink.textContent.trim()
		const uniqueKey = gameName

		if (processed.has(uniqueKey)) return
		processed.add(uniqueKey)

		// Make price block position relative
		if (getComputedStyle(priceBlock).position === 'static') {
			priceBlock.style.position = 'relative'
		}

		const bazarPrice = parseBazarPrice(priceBlock)
		const { container, content } = createPriceElement(gameName)

		priceBlock.appendChild(container)

		setTimeout(() => {
			fetchGGDealsPrice(gameName, content, bazarPrice)
		}, Math.random() * 500)
	}

	function scanGames() {
		const gameItems = document.querySelectorAll('[data-key]')
		gameItems.forEach(processGame)
	}

	const observer = new MutationObserver(scanGames)
	observer.observe(document.body, {
		childList: true,
		subtree: true,
	})

	setTimeout(scanGames, 500)
	setTimeout(scanGames, 1500)
	setTimeout(scanGames, 3000)
})()
