import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True)
        page = await context.new_page()

        await page.goto('http://localhost:5500/')
        await page.wait_for_selector('text=GamarjobaFood')

        # Take initial screenshot
        await page.screenshot(path='verification/header_initial.png')

        # Click search icon
        # The search icon is a button with span material-symbols-outlined containing "search"
        await page.click('button:has(.material-symbols-outlined:text("search"))')
        print("Clicked search icon")

        await page.wait_for_selector('input[placeholder="Search menu..."]')
        await page.screenshot(path='verification/header_search_open.png')

        # Type something
        await page.fill('input[placeholder="Search menu..."]', 'Caprese')
        await page.screenshot(path='verification/header_search_typing.png')

        # Click clear (close icon)
        await page.click('button:has(.material-symbols-outlined:text("close"))')
        print("Clicked clear button")

        # Should be back to initial state (search icon only)
        await asyncio.sleep(0.5)
        await page.screenshot(path='verification/header_after_clear.png')

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
