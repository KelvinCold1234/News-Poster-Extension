# News Poster for X

A Chrome extension that fetches top national news from the GNews API and uses the OpenAI ChatGPT API to generate awesome, customizable posts, populating them in X's composer with a hotkey.

**Download from Chrome Web Store**: [Insert Store URL]

## Installation
1. Install from the Chrome Web Store or clone this repository.
2. If using the repository, go to `chrome://extensions/`, enable "Developer mode", click "Load unpacked", and select the folder.
3. Open the extension popup, enter your OpenAI API key (from https://platform.openai.com/) and GNews API key (from https://gnews.io/), select a model (gpt-4.1, gpt-4o, gpt-4o-mini, or gpt-3.5-turbo), and set a custom hotkey (e.g., Ctrl+Shift+P).

## Usage
- Navigate to https://x.com/home and log in.
- Set your hotkey in chrome://extensions/shortcuts (e.g., Ctrl+Shift+P).
- In the popup, customize the post format (grabber, word range, character range, source).
- Press your hotkey to generate and insert a post (a blue, centered "Generating post..." indicator appears).
- Review and click "Post" on X.

## Features
- Fetches top national news from GNews API (over 60,000 sources).
- Uses ChatGPT to create awesome, X-friendly summaries with customizable format (e.g., 100–280 chars, optional source).
- Prevents duplicate posts using local storage.
- Supports OpenAI models: gpt-4.1 (most recent), gpt-4o, gpt-4o-mini, gpt-3.5-turbo.
- Customizable hotkey via popup (set in chrome://extensions/shortcuts).
- Shows a blue, centered, pulsing loading indicator during post generation.

## Notes
- Requires OpenAI API credits (monitor usage at https://platform.openai.com/) and a free GNews API key (100 requests/day limit, so limited to about 100 posts/day).
- If X's UI changes, update selectors in `content.js` (inspect Post button/composer).
- To clear stored posts, run `chrome.storage.local.remove('postedSummaries')` in the browser console.

## Support
Help keep this extension maintained and updated! Donate via PayPal: [PayPal Donation Link](https://www.paypal.com/donate/?hosted_button_id=3TNM97W8TVECW)

## License
MIT License