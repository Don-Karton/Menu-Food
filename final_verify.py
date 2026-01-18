import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        import subprocess
        server = subprocess.Popen(['python3', '-m', 'http.server', '8002'])
        await asyncio.sleep(2)

        try:
            await page.goto('http://localhost:8002/index.html')
            await page.wait_for_load_state('networkidle')

            # Click a category
            await page.click('text=Salads')
            await asyncio.sleep(1)

            # Check heading
            heading = await page.inner_text('h3')
            print(f"Dynamic Heading: {heading}")

            await page.screenshot(path='/home/jules/verification/final_check.png')

        finally:
            server.terminate()
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
