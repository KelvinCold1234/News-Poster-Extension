# News Poster for X

A Chrome extension that generates news posts using the OpenAI ChatGPT API and populates them in X's composer with a customizable hotkey. Posts are customizable in format, with options for grabber style, summary length, character range, and source inclusion.

**Download from Chrome Web Store**: [Insert Store URL]

## Installation
1. Install from the Chrome Web Store or clone this repository.
2. If using the repository, go to `chrome://extensions/`, enable "Developer mode", click "Load unpacked", and select the folder.
3. Open the extension popup, enter your OpenAI API key (from https://platform.openai.com/), select a model (gpt-4o-mini, gpt-4o, or gpt-3.5-turbo), and set a custom hotkey (e.g., Ctrl+Shift+P).

## Usage
- Navigate to https://x.com/home and log in.
- Set your hotkey in chrome://extensions/shortcuts (e.g., Ctrl+Shift+P).
- In the popup, customize the post format (grabber, word range, character range, source).
- Press your hotkey to generate and insert a post (a blue, centered "Generating post..." indicator appears).
- Review and click "Post" on X.

## Features
- Generates posts with customizable format (e.g., grabber style, 15-30 words, 150–260 chars).
- Option to include or exclude a source (e.g., "Source: Reuters").
- Randomly selects Top, Breaking, or Viral news within 8 hours.
- Prevents duplicate posts using local storage.
- Supports OpenAI models: gpt-4o-mini (default), gpt-4o, gpt-3.5-turbo.
- Customizable hotkey via popup (set in chrome://extensions/shortcuts).
- Shows a blue, centered, pulsing loading indicator during post generation.

## Notes
- Requires OpenAI API credits (monitor usage at https://platform.openai.com/).
- If X's UI changes, update selectors in `content.js` (inspect Post button/composer).
- To clear stored posts, run `chrome.storage.local.remove('postedSummaries')` in the browser console.

## License
MIT License