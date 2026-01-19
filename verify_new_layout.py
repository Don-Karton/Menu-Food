import asyncio
from playwright.async_api import async_playwright
import os

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 414, 'height': 896})

        # 1. Check Home Layout
        await page.goto('http://localhost:5500')
        await page.wait_for_selector('text=GamarjobaFood')

        # Verify Logo group is centered (roughly)
        logo_box = await page.locator('header >> text=GF').first.bounding_box()
        if logo_box:
            center_x = logo_box['x'] + logo_box['width'] / 2
            print(f"Logo center X: {center_x} (Expected near 207)")

        await page.screenshot(path='verification/new_home_header.png')

        # 2. Open Product and check Shell persistence
        await page.click('a[href*="/product/"] >> nth=0')
        await page.wait_for_selector('text=Complete Your Meal')

        # Check if header is still there
        await page.wait_for_selector('text=GamarjobaFood')
        # Check if sidebar is still there
        await page.wait_for_selector('span.material-symbols-outlined:has-text("grid_view")')

        await page.screenshot(path='verification/product_inside_container.png')

        # 3. Check scrolling persistence
        await page.goto('http://localhost:5500')
        await page.evaluate('window.scrollTo(0, 500)')
        # Header should be visible (sticky/fixed)
        is_header_visible = await page.locator('header').is_visible()
        print(f"Header visible after scroll: {is_header_visible}")

        await browser.close()

if __name__ == '__main__':
    if not os.path.exists('verification'):
        os.makedirs('verification')
    asyncio.run(verify())
