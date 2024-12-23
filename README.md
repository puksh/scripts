# Tampermonkey Scripts for OLX

OLX is making me do evil things when it defaults to different settings based on the listings' categories. These scripts atleast make it bearable to use on PC

## Scripts

### 1. Open all new favourites
**File:** `olx_open_tabs.js`

- **Description:** Adds a button to the "Observed Search" page on OLX. Clicking the button opens all observed listings in new tabs with the view set to grid mode.
- **Match URL:** `https://www.olx.pl/obserwowane/search/`

### 2. OLX Auto Click Grid Icon
**File:** `olx_auto_click_grid_icon.js`

- **Description:** Automatically clicks the grid view icon on OLX if it's not already active.
- **Match URL:** `https://www.olx.pl/*`
- 
- Detects whether the grid view icon is active based on its color.
- Compatible with Dark Reader browser extension.

## Installation
1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser.
2. Copy the content of the script(s) you want to use.
3. Create a new Tampermonkey script and paste the content into the editor.
4. Observe?
