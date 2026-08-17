import asyncio
from playwright.async_api import async_playwright
import json
import csv

# ----------------------------------------------------------------------------------
# RERA Web Scraper Architecture (Playwright)
# 
# Note: RERA (Real Estate Regulatory Authority) portals are state-specific in India.
# (e.g., MahaRERA for Maharashtra, UP RERA for Uttar Pradesh).
# 
# Most of these government portals:
# 1. Load data dynamically via JavaScript (which is why we use Playwright, not just requests).
# 2. Use CAPTCHAs for their public search endpoints.
# 
# To run this script:
# 1. pip install playwright
# 2. playwright install
# ----------------------------------------------------------------------------------

async def scrape_rera(state_url: str):
    print(f"Starting browser to scrape RERA portal: {state_url}")
    societies = []

    async with async_playwright() as p:
        # Launch headless browser (set headless=False if you need to manually solve a CAPTCHA on the first run)
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Set a realistic user agent
        await page.set_extra_http_headers({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
        })

        try:
            # 1. Navigate to the RERA Project Search page
            await page.goto(state_url, timeout=60000)
            print("Page loaded successfully.")

            # 2. Example: Wait for the search results table to load
            # You will need to inspect the specific RERA site and replace '.project-table-row' 
            # with their actual CSS class or ID for the data rows.
            await page.wait_for_selector('.project-table-row', timeout=15000)
            
            # 3. Extract the data
            rows = await page.query_selector_all('.project-table-row')
            print(f"Found {len(rows)} projects on the first page.")

            for row in rows:
                # Replace these selectors with the actual columns on the RERA site
                name_el = await row.query_selector('.project-name-col')
                address_el = await row.query_selector('.project-address-col')
                promoter_el = await row.query_selector('.promoter-col')

                name = await name_el.inner_text() if name_el else "Unknown"
                address = await address_el.inner_text() if address_el else "Unknown"
                promoter = await promoter_el.inner_text() if promoter_el else "Unknown"

                # Filter out commercial projects if needed based on text
                if "commercial" not in name.lower():
                    societies.append({
                        "society_name": name.strip(),
                        "address": address.strip(),
                        "promoter": promoter.strip(),
                        "source": "RERA"
                    })

            # 4. Handle Pagination
            # You would typically find the 'Next' button and loop this logic.
            # next_btn = await page.query_selector('a.next-page')
            # if next_btn: await next_btn.click()

        except Exception as e:
            print(f"Scraping interrupted or failed: {e}")
            print("Note: If it timed out, the site might be down or requires a CAPTCHA bypass.")

        finally:
            await browser.close()

    # Save to JSON
    if societies:
        output_file = 'rera_societies_export.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(societies, f, indent=4)
        print(f"✅ Successfully exported {len(societies)} societies to {output_file}")
    else:
        print("⚠️ No data was extracted.")

if __name__ == "__main__":
    # Example URL (You must replace this with the specific state's RERA search URL)
    # E.g. UP RERA: https://www.up-rera.in/projects
    # TARGET_URL = "https://example-rera.gov.in/registered-projects"
    TARGET_URL = "https://www.up-rera.in/projects"
    
    asyncio.run(scrape_rera(TARGET_URL))
