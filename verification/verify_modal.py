from playwright.sync_api import sync_playwright, expect
import time

def test_modal_behavior(page):
    page.goto("http://localhost:5500")
    page.wait_for_selector("text=GamarjobaFood")

    # Click a product
    page.locator(".bg-brand-surface.rounded-2xl").first.locator("a").first.click()

    # Check if ProductPage overlay is visible
    # It has the absolute inset-0 class
    expect(page.locator(".absolute.inset-0.z-50")).to_be_visible()

    # Check if Home page content is still in DOM (proving it's an overlay)
    expect(page.locator('h1:text("GamarjobaFood")')).to_be_visible()

    # Close modal
    page.locator('button:has(span:text("close"))').first.click()

    # Overlay should be gone
    expect(page.locator(".absolute.inset-0.z-50")).not_to_be_visible()

    print("Modal behavior verified successfully.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_modal_behavior(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/modal_error.png")
        finally:
            browser.close()
