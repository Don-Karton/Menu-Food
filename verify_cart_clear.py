import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True)
        page = await context.new_page()

        await page.goto('http://localhost:5500/')

        # 1. Add product to cart
        await page.click('button:has(.material-symbols-outlined:text("add"))')
        print("Added product")

        # Check cart total is not 0
        cart_badge = page.locator('a[href="#/cart"] span.absolute')
        total_before = await cart_badge.inner_text()
        print(f"Total before: {total_before}")

        # 2. Go to review
        await page.click('a[href="#/cart"]')
        await page.click('text=Checkout')

        # 3. Fill details
        await page.fill('[placeholder="e.g. Giorgi Beridze"]', 'Jules Cart Test')
        await page.fill('[placeholder="+995"]', '555123456')

        # 4. Submit
        await page.click('text=Send Order')
        print("Clicked Send Order")

        # Wait for success
        await page.wait_for_selector('text=Order Sent!')
        print("Order sent successfully")

        # 5. Check cart (should be 0.00)
        await asyncio.sleep(2) # Wait for state update
        total_after = await cart_badge.inner_text()
        print(f"Total after: {total_after}")

        await page.screenshot(path='verification/cart_cleared.png')

        if "0.00" in total_after:
            print("SUCCESS: Cart cleared")
        else:
            print("FAILURE: Cart not cleared")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
