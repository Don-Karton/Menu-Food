from playwright.sync_api import sync_playwright, expect
import os

def test_header_layout(page):
    page.goto("http://localhost:5500")
    page.wait_for_selector("text=GamarjobaFood")

    # Take screenshot of header area
    header = page.locator("header")
    header.screenshot(path="/home/jules/verification/header_initial.png")

    # Open search
    search_icon = page.locator('button:has(span:text("search"))').first
    search_icon.click()

    # Wait for input
    page.wait_for_selector('input[type="text"]')
    header.screenshot(path="/home/jules/verification/header_search_open.png")

    print("Header screenshots captured.")

if __name__ == "__main__":
    if not os.path.exists("/home/jules/verification"):
        os.makedirs("/home/jules/verification")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_header_layout(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
