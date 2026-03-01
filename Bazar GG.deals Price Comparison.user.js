// ==UserScript==
// @name         Bazar GG.deals Price Comparison
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Show lowest GG.deals prices on Bazar
// @author       puksh
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
	const CACHE_TTL = 3600000 // 1 hour

	// Inject CSS
	const style = document.createElement('style')
	style.textContent = `
        .gg-price-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            padding: 8px 0;
            width: 220px;
        }
        .price-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: background 0.2s ease;
        }
        .price-section:hover {
            background: rgba(0, 0, 0, 0.05);
        }
        .price-section.no-hover {
            cursor: default;
        }
        .price-section.no-hover:hover {
            background: transparent;
        }
        .price-label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            cursor: pointer;
        }
        .price-value {
            font-weight: 600;
            font-size: 16px;
        }
        .price-value.cheaper {
            font-size: 20px;
            font-weight: 700;
            color: #4CAF50;
        }
        .price-value.expensive {
            color: #ff5252;
            opacity: 0.5;
        }
        .price-separator {
            width: 2px;
            height: 40px;
            background: rgba(0, 0, 0, 0.1);
        }
        .gg-logo-small {
            width: 14px;
            height: auto;
            display: inline-block;
            vertical-align: middle;
            margin-right: 4px;
        }
        .gg-spinner {
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #c06c00;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .gg-error {
            color: #999;
            text-align: center;
        }
        .gg-search-hint {
            font-size: 10px;
            opacity: 0.7;
            color: rgb(208, 214, 213);
            cursor: pointer;
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
		const alternatives = [gameName]
		const specialChars = /[@:+&|()[\]{}]/

		if (specialChars.test(gameName)) {
			const beforeSpecial = gameName.split(/[@:+&|()[\]{}]/)[0].trim()
			if (beforeSpecial && beforeSpecial !== gameName) {
				alternatives.push(beforeSpecial)
			}

			const withoutSpecial = gameName.replace(/[@:+&|()[\]{}]/g, ' ').trim()
			if (withoutSpecial !== gameName && withoutSpecial !== beforeSpecial) {
				alternatives.push(withoutSpecial)
			}
		}

		return alternatives
	}

	function parseBazarPrice(priceBlock) {
		const priceText = priceBlock.textContent.trim()
		const match = priceText.match(/(?:od\s*)?(\d+[.,]\d+)/i)
		return match ? parseFloat(match[1].replace(',', '.')) : null
	}

	function extractGGPrice(html) {
		const doc = new DOMParser().parseFromString(html, 'text/html')

		const el = doc.querySelector('.price.price-hl, .price.price-best')
		if (el) {
			const cleaned = el.textContent.trim().replace(/[^\d.,]/g, '').replace(',', '.')
			const price = parseFloat(cleaned)
			if (!isNaN(price) && price > 0) return price
		}

		return null
	}

	function createPriceElement(bazarPrice, bazarUrl) {
		const container = document.createElement('div')
		container.className = 'gg-price-container'
		container.innerHTML = `
			<div class="price-section bazar-price">
				<span class="price-label">Bazar</span>
				<span class="price-value">${bazarPrice ? bazarPrice.toFixed(2) : '?'} zł</span>
			</div>
			<div class="price-separator"></div>
			<div class="price-section gg-price">
				<span class="price-label"><img src="${GG_LOGO}" class="gg-logo-small" alt="GG.deals">GG.deals</span>
				<div class="gg-spinner"></div>
			</div>
		`

		// Attach Bazar click handler immediately
		const bazarSection = container.querySelector('.bazar-price')
		bazarSection.addEventListener('mousedown', (e) => {
			e.stopPropagation()
			if (e.button === 1) {
				e.preventDefault()
				window.open(bazarUrl, '_blank')
			} else if (e.button === 0) {
				window.open(bazarUrl, '_self')
			}
		})

		return container
	}

	function updatePriceElement(container, ggPrice, bazarPrice, gameName, bazarUrl, notFound = false) {
		const ggSection = container.querySelector('.gg-price')

		if (notFound) {
			const searchUrl = `https://gg.deals/games/?title=${encodeURIComponent(gameName)}`
			ggSection.innerHTML = `
				<span class="price-label"><img src="${GG_LOGO}" class="gg-logo-small" alt="GG.deals">GG.deals</span>
				<span class="gg-search-hint">Click to search</span>
			`
			ggSection.addEventListener('mousedown', (e) => {
				e.stopPropagation()
				if (e.button === 1) {
					e.preventDefault()
					window.open(searchUrl, '_blank')
				} else if (e.button === 0) {
					window.open(searchUrl, '_self')
				}
			})
			return
		}

		if (ggPrice === null) {
			ggSection.innerHTML = `
				<span class="price-label"><img src="${GG_LOGO}" class="gg-logo-small" alt="GG.deals">GG.deals</span>
				<span class="gg-error">Error</span>
			`
			return
		}

		let bazarClass = ''
		let ggClass = ''

		if (bazarPrice !== null && ggPrice !== null) {
			const diff = bazarPrice - ggPrice
			if (diff > 0.25) {
				ggClass = 'cheaper'
			} else if (diff < -0.75) {
				bazarClass = 'cheaper'
				ggClass = 'expensive'
			}
		}

		// Update Bazar styling if needed
		if (bazarClass) {
			const bazarValue = container.querySelector('.bazar-price .price-value')
			bazarValue.className = `price-value ${bazarClass}`
		}

		const ggUrl = `https://gg.deals/game/${normalizeGameName(gameName)}/`

		ggSection.innerHTML = `
			<span class="price-label"><img src="${GG_LOGO}" class="gg-logo-small" alt="GG.deals">GG.deals</span>
			<span class="price-value ${ggClass}">${ggPrice.toFixed(2)} zł</span>
		`

		ggSection.addEventListener('mousedown', (e) => {
			e.stopPropagation()
			if (e.button === 1) {
				e.preventDefault()
				window.open(ggUrl, '_blank')
			} else if (e.button === 0) {
				window.open(ggUrl, '_self')
			}
		})
	}

	async function fetchAllAlternatives(alternatives) {
		const promises = alternatives.map(altName => {
			return new Promise((resolve) => {
				const normalized = normalizeGameName(altName)
				const url = `https://gg.deals/game/${normalized}/`

				GM_xmlhttpRequest({
					method: 'GET',
					url: url,
					timeout: 8000,
					onload: function (response) {
						// Page doesn't exist — redirected to search or 404
						if (response.finalUrl.includes('/games/?') || response.status === 404) {
							resolve({ name: altName, price: null, pageFound: false })
							return
						}
						// Page exists even if price couldn't be parsed
						const ggPrice = extractGGPrice(response.responseText)
						resolve({ name: altName, price: ggPrice, pageFound: true })
					},
					onerror: () => resolve({ name: altName, price: null, pageFound: false }),
					ontimeout: () => resolve({ name: altName, price: null, pageFound: false }),
				})
			})
		})

		const results = await Promise.all(promises)

		// Prefer a result with both page and price
		const withPrice = results.find(r => r.pageFound && r.price !== null)
		if (withPrice) return { ...withPrice, found: true }

		// Page found but no price (no keyshop listings etc.)
		const pageOnly = results.find(r => r.pageFound)
		if (pageOnly) return { ...pageOnly, found: true }

		// Nothing found at all
		return { price: null, found: false, name: alternatives[0] }
	}

	function fetchGGDealsPrice(gameName, container, bazarPrice, bazarUrl) {
		const normalized = normalizeGameName(gameName)

		// Check cache with TTL
		if (cache.has(normalized)) {
			const cached = cache.get(normalized)
			if (Date.now() - cached.timestamp < CACHE_TTL) {
				updatePriceElement(container, cached.price, bazarPrice, gameName, bazarUrl, cached.notFound)
				return
			}
			cache.delete(normalized)
		}

		const alternatives = getAlternativeNames(gameName)
		fetchAllAlternatives(alternatives).then(result => {
			cache.set(normalized, {
				price: result.price,
				notFound: !result.found,
				timestamp: Date.now()
			})

			updatePriceElement(
				container,
				result.price,
				bazarPrice,
				result.name,
				bazarUrl,
				!result.found
			)
		})
	}

	function processGame(item) {
		const gameLink = item.querySelector('.media-heading a')
		const priceBlock = item.querySelector('.oswald.pc')

		if (!gameLink || !priceBlock) return

		const gameName = gameLink.textContent.trim()
		const bazarUrl = gameLink.getAttribute('href')
		const uniqueKey = gameName

		if (processed.has(uniqueKey)) return
		processed.add(uniqueKey)

		const bazarPrice = parseBazarPrice(priceBlock)

		priceBlock.innerHTML = ''
		const container = createPriceElement(bazarPrice, bazarUrl)
		priceBlock.appendChild(container)

		fetchGGDealsPrice(gameName, container, bazarPrice, bazarUrl)
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

	scanGames()
	setTimeout(scanGames, 1000)
	setTimeout(scanGames, 2500)
})()
