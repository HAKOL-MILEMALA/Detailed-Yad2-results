// ==UserScript==
// @name         יד2 - סינון סוכנויות, הוספת מפות ושליפת נתונים
// @namespace    http://tampermonkey.net/
// @version      2.9
// @description  מערכת סינון חכמה, שליפת נתונים עם מטמון מתקדם, חיווי טעינה וקישור למפות
// @author       HAKOL-MILEMALA
// @match        *://www.yad2.co.il/vehicles/*
// @match        *://www.yad2.co.il/my-favorites*
// @updateURL    https://raw.githubusercontent.com/HAKOL-MILEMALA/Detailed-Yad2-results/main/Detailed-Yad2-results.user.js
// @downloadURL  https://raw.githubusercontent.com/HAKOL-MILEMALA/Detailed-Yad2-results/main/Detailed-Yad2-results.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    console.log('[יד2 סקריפט] --- התחלת ריצת סקריפט: גרסה 2.8 ---');

    let isFilterActive = localStorage.getItem('hideYad2Agencies') === 'true';
    const carDataCache = new Map();

    // ==========================================
    // חלק 1: מנגנון סינון סוכנויות
    // ==========================================

    function toggleAgencies() {
        if (window.location.href.includes('my-favorites')) return;

        const allItems = document.querySelectorAll('a[data-listing-type]');
        let hiddenCount = 0;

        allItems.forEach(item => {
            const listingType = item.getAttribute('data-listing-type') || '';
            const isAgency = listingType.includes('agency') || item.querySelector('[class*="agencyName"]');

            if (isAgency) {
                item.style.display = isFilterActive ? 'none' : '';
                if (isFilterActive) hiddenCount++;
            }
        });

        if (isFilterActive && hiddenCount > 0) {
            console.log(`[יד2 סקריפט] הוסתרו ${hiddenCount} רכבי סוכנויות.`);
        }
    }

    function createCheckbox(container) {
        if (document.getElementById('hide-agency-checkbox') || window.location.href.includes('my-favorites')) return;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display: flex; align-items: center; margin-right: auto; margin-left: 20px; padding: 5px 10px; background-color: #f5f5f5; border-radius: 5px; border: 1px solid #ccc;';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'hide-agency-checkbox';
        checkbox.style.cssText = 'cursor: pointer; margin-left: 8px; width: 16px; height: 16px;';
        checkbox.checked = isFilterActive;

        checkbox.addEventListener('change', (e) => {
            isFilterActive = e.target.checked;
            localStorage.setItem('hideYad2Agencies', isFilterActive);
            console.log(`[יד2 סקריפט] סינון סוכנויות: ${isFilterActive ? 'פועל' : 'כבוי'}`);
            toggleAgencies();
        });

        const label = document.createElement('label');
        label.htmlFor = 'hide-agency-checkbox';
        label.innerText = 'הסתר רכבי סוכנויות';
        label.style.cssText = 'cursor: pointer; font-size: 14px; font-weight: bold; color: #333; margin: 0;';

        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);

        container.insertBefore(wrapper, container.childNodes[1] || container.firstChild);
        console.log('[יד2 סקריפט] כפתור סינון סוכנויות נוסף בהצלחה.');
    }

    // ==========================================
    // חלק 2: מנגנון שליפת נתונים
    // ==========================================

    function createDisplayElement(kmValue, locValue, descValue) {
        const displayDiv = document.createElement('div');
        displayDiv.className = 'yad2-extra-data-injected';
        // הוסר חיתוך הטקסט - הכרטיסייה תתרחב כלפי מטה בהתאם לאורך הטקסט
        displayDiv.style.cssText = 'margin-top: 8px; padding-top: 8px; border-top: 1px dashed #ccc; font-size: 14px; line-height: 1.5; color: #444; width: 100%; flex-basis: 100%; position: relative; z-index: 99;';

        let locationHtml = `<span>${locValue}</span>`;
        if (locValue !== 'לא צוין' && locValue.trim() !== '') {
            const mapsUrl = `https://www.google.co.il/maps/dir//${encodeURIComponent(locValue.trim())}?hl=iw`;
            locationHtml = `<a class="yad2-map-link" href="${mapsUrl}" target="_blank" style="color: inherit; text-decoration: underline; font-weight: normal; cursor: pointer; position: relative; z-index: 100;" title="פתח מסלול ניווט בגוגל מפות">${locValue} 🗺️</a>`;
        }

        displayDiv.innerHTML = `
            <div><strong>ק"מ:</strong> ${kmValue}</div>
            <div><strong>מיקום:</strong> ${locationHtml}</div>
            <div><strong>פרטים:</strong> ${descValue}</div>
        `;

        const mapLink = displayDiv.querySelector('.yad2-map-link');
        if (mapLink) {
            mapLink.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        return displayDiv;
    }

    async function processCarCard(card, url) {
        const isFavoritesPage = window.location.href.includes('my-favorites');

        // בעמוד המועדפים אנחנו בודקים את האבא של הכרטיסיה (כמו בעיצוב הישן) כדי לא לדרוס את המבנה
        const containerToCheck = isFavoritesPage ? (card.closest('article') || card.parentNode) : card;

        if (containerToCheck.querySelector('.yad2-extra-data-injected') || containerToCheck.querySelector('.yad2-loading-data')) return;

        const cleanUrl = url.split('?')[0];

        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'yad2-loading-data';
        loadingDiv.style.cssText = 'margin-top: 8px; font-size: 13px; color: #888; font-style: italic; width: 100%; flex-basis: 100%;';
        loadingDiv.innerHTML = '⏳ שולף נתונים...';

        // פיצול ההזרקה: לוגיקה נפרדת למועדפים ולדף הראשי
        if (isFavoritesPage) {
            const favoritesTitlesSection = containerToCheck.querySelector('[class*="titlesSection"]');
            if (favoritesTitlesSection) {
                favoritesTitlesSection.appendChild(loadingDiv);
            } else {
                containerToCheck.appendChild(loadingDiv);
            }
        } else {
            const mainPageInfoBox = card.querySelector('[data-testid="feed-item-info"]');
            if (mainPageInfoBox) {
                mainPageInfoBox.style.display = 'flex';
                mainPageInfoBox.style.flexWrap = 'wrap';
                mainPageInfoBox.appendChild(loadingDiv);
            } else {
                card.appendChild(loadingDiv);
            }
        }

        if (!carDataCache.has(cleanUrl)) {
            const fetchPromise = fetch(cleanUrl)
                .then(async (response) => {
                    if (!response.ok) throw new Error(`Network response was not ok (${response.status})`);

                    const html = await response.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');

                    let kmValue = 'לא צוין', locValue = 'לא צוין', descValue = 'אין פרטים נוספים';

                    const kmCard = doc.querySelector('[data-testid="we-checked-km-card"]');
                    if (kmCard) {
                        const valElement = kmCard.querySelector('[data-testid="detail-card-value"]');
                        if (valElement) kmValue = valElement.textContent.trim();
                    }

                    const locElement = doc.querySelector('[data-testid="location"]');
                    if (locElement) locValue = locElement.textContent.trim();

                    const descElement = doc.querySelector('[data-testid="vehicle-description"]');
                    if (descElement) descValue = descElement.textContent.trim();

                    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
                    return { kmValue, locValue, descValue };
                })
                .catch(error => {
                    console.error(`[יד2 סקריפט] שגיאה במשיכת נתונים עבור ${cleanUrl}:`, error);
                    return null;
                });

            carDataCache.set(cleanUrl, fetchPromise);
        }

        const data = await carDataCache.get(cleanUrl);

        if (loadingDiv.parentNode) {
            if (data) {
                const displayDiv = createDisplayElement(data.kmValue, data.locValue, data.descValue);
                loadingDiv.replaceWith(displayDiv);
            } else {
                loadingDiv.innerHTML = '❌ שגיאה בשליפת הנתונים';
                loadingDiv.style.color = '#c00';
                setTimeout(() => { if(loadingDiv.parentNode) loadingDiv.remove(); }, 3000);
            }
        }
    }

    function scanForCars() {
        const itemCards = document.querySelectorAll('a[href*="item/"]');
        let processedCount = 0;
        const isFavoritesPage = window.location.href.includes('my-favorites');

        for (let card of itemCards) {
            const url = card.href;
            if (url.includes('/item/')) {
                const containerToCheck = isFavoritesPage ? (card.closest('article') || card.parentNode) : card;
                if (!containerToCheck.querySelector('.yad2-extra-data-injected') && !containerToCheck.querySelector('.yad2-loading-data')) {
                    processCarCard(card, url);
                    processedCount++;
                }
            }
        }

        if (processedCount > 0) {
            console.log(`[יד2 סקריפט] זוהו ${processedCount} רכבים חדשים, מתחיל בשליפה.`);
        }

        if (isFilterActive) {
            toggleAgencies();
        }
    }

    // ==========================================
    // חלק 3: הפעלת הכלים והאזנה לשינויים
    // ==========================================

    let scanTimeout = null;

    const observer = new MutationObserver((mutations) => {
        const sortContainer = document.querySelector('[class*="sortAndTotalBox"]');
        if (sortContainer && !document.getElementById('hide-agency-checkbox')) {
            createCheckbox(sortContainer);
        }

        let shouldScan = false;
        for (let mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                shouldScan = true;
                break;
            }
        }

        if (shouldScan) {
            if (scanTimeout) clearTimeout(scanTimeout);
            scanTimeout = setTimeout(() => {
                scanForCars();
            }, 300);
        }
    });

    console.log('[יד2 סקריפט] מפעיל מאזין לשינויים בעמוד...');
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(scanForCars, 1500);

})();
