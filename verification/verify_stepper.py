from playwright.sync_api import sync_playwright, expect

def test_product_page_stepper(page):
    page.goto("http://localhost:5500")
    page.wait_for_selector("text=GamarjobaFood")

    # Click first product card to go to product page
    page.locator(".bg-brand-surface.rounded-2xl").first.locator("a").first.click()

    # Add to Order
    page.get_by_role("button", name="Add to Order").click()

    # Stepper should appear (it has a specific class for the container)
    # The buttons are inside a div.flex-none.p-4
    stepper = page.locator(".flex-none.p-4.pb-6")

    # Increment
    stepper.locator('button:has(span:text("add"))').click()
    expect(stepper.locator("text=2")).to_be_visible()

    # Decrement
    stepper.locator('button:has(span:text("remove"))').click()
    expect(stepper.locator("text=1")).to_be_visible()

    print("Product page stepper verified successfully.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_product_page_stepper(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/stepper_error.png")
        finally:
            browser.close()
