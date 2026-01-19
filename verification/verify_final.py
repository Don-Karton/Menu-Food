from playwright.sync_api import sync_playwright, expect
import time
import os

def test_full_flow(page):
    # Go to the app
    page.goto("http://localhost:5500")

    # Wait for the app to load
    page.wait_for_selector("text=GamarjobaFood")

    # 1. Check Logo Color
    # The logo is a div with "GF" text
    logo = page.locator('div:text("GF")').first
    # Verify it has the yellow background
    expect(logo).to_have_css("background-color", "rgb(255, 199, 44)") # #FFC72C in RGB
    print("Logo color verified.")

    # 2. Check Search Bar
    # Search icon is a button with a search span inside
    search_icon = page.locator('button:has(span:text("search"))').first
    search_icon.click()
    search_input = page.get_by_placeholder("Search menu...")
    expect(search_input).to_be_visible()

    # Type something
    search_input.fill("Burger")
    # Click away (e.g., on the title)
    page.locator('h1:text("GamarjobaFood")').click()
    # Should stay visible because it has text
    expect(search_input).to_be_visible()

    # Clear text
    clear_btn = page.locator('button:has(span:text("close"))')
    clear_btn.click()
    expect(search_input).to_have_value("")

    # Click away again
    page.locator('h1:text("GamarjobaFood")').click()
    # Should be hidden now
    expect(search_input).not_to_be_visible()
    print("Search bar behavior verified.")

    # 3. Check Product Info
    # Wait for catalog to load (cards appearing)
    page.wait_for_selector(".bg-brand-surface.rounded-2xl")

    # Find a product card
    first_product = page.locator(".bg-brand-surface.rounded-2xl").first
    # Check if it has weight (text-gray-400)
    expect(first_product.locator("p.text-gray-400")).to_be_visible()

    # Open product page
    first_product.locator("a").first.click()
    # Description should be visible
    expect(page.locator("p.text-gray-400.leading-relaxed")).to_be_visible()
    print("Product info display verified.")

    # 4. Check Cart Clearing
    page.get_by_role("button", name="Add to Order").click()
    # Go to cart via bottom nav
    page.locator('a[href="#/cart"]').click()

    # Proceed to Checkout
    page.get_by_role("link", name="Checkout").click()

    # Fill form
    page.get_by_placeholder("e.g. Giorgi Beridze").fill("Test User")
    page.get_by_placeholder("+995").fill("123456789")
    page.get_by_placeholder("0").fill("5")

    # Submit Order
    # Confirm alert
    page.on("dialog", lambda dialog: dialog.accept())
    # The button text depends on state, but "Send Order" is the base
    page.get_by_role("button", name="Send Order").click()

    # Wait for success state or just check cart count in bottom nav
    time.sleep(2)

    # Check cart count in bottom nav
    # The bottom nav shows price, but let's check the cart page
    page.locator('a[href="#/cart"]').click()
    # Cart should be empty (no items with price)
    expect(page.locator("text=My Order (0)")).to_be_visible()
    print("Cart clearing verified.")

    page.screenshot(path="/home/jules/verification/final_verify.png", full_page=True)

if __name__ == "__main__":
    if not os.path.exists("/home/jules/verification"):
        os.makedirs("/home/jules/verification")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_full_flow(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
            # Log HTML for debugging
            with open("/home/jules/verification/error.html", "w") as f:
                f.write(page.content())
        finally:
            browser.close()
