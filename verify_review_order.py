import asyncio
from playwright.async_api import async_playwright
import os

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 414, 'height': 896}) # iPhone XR size

        # Go to home
        await page.goto('http://localhost:5500')
        await page.wait_for_selector('text=GamarjobaFood')

        # Add a product
        await page.click('button:has-text("add") >> nth=0')

        # Go to a set
        await page.click('a[href*="/set/"] >> nth=0')
        await page.wait_for_selector('text=Save Set')

        # Change persons
        await page.click('span:has-text("add") >> nth=0')

        # Save set
        await page.click('text=Save Set')

        # Wait for cart
        await page.wait_for_selector('text=My Order')
        await page.screenshot(path='verification/cart.png')

        # Go to review
        await page.click('text=Checkout')
        await page.wait_for_selector('text=Review Order')

        # Fill info
        await page.fill('input[type="date"]', '2023-12-31')
        await page.fill('[placeholder="e.g. Giorgi Beridze"]', 'John Doe')
        await page.fill('[placeholder="0"]', '20')
        await page.fill('[placeholder="+995"]', '+995555123456')

        await page.screenshot(path='verification/review_order.png')

        # Check if totals are visible
        await page.wait_for_selector('text=Total')

        await browser.close()

if __name__ == '__main__':
    if not os.path.exists('verification'):
        os.makedirs('verification')
    asyncio.run(verify())
