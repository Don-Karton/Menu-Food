from playwright.sync_api import sync_playwright, expect
import time

def test_order_and_pdf(page):
    page.goto("http://localhost:5500")
    page.wait_for_selector("text=GamarjobaFood")

    # Add product
    page.locator(".bg-brand-surface.rounded-2xl").first.locator("button").click()

    # Go to cart
    page.locator('a[href="#/cart"]').click()

    # Checkout
    page.get_by_role("link", name="Checkout").click()

    # Fill form
    page.get_by_placeholder("e.g. Giorgi Beridze").fill("Test User")
    page.get_by_placeholder("+995").fill("123456789")
    page.get_by_placeholder("0").fill("5")

    # Submit Order
    page.on("dialog", lambda dialog: dialog.accept())
    page.get_by_role("button", name="Send Order").click()

    # Wait for success
    # Success button says "Order Sent!"
    page.wait_for_selector("text=Order Sent!")

    # Check for PDF button
    pdf_btn = page.locator('text=Download Receipt (PDF)')
    expect(pdf_btn).to_be_visible()
    print("PDF Download button is visible after success.")

    # Check if cart is NOT cleared
    # Go back to cart
    page.locator('a[href="#/cart"]').click()
    # Should still have items (My Order (1))
    expect(page.locator("text=My Order (1)")).to_be_visible()
    print("Cart was NOT cleared as requested.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_order_and_pdf(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/order_error.png")
        finally:
            browser.close()
