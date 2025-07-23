# News Poster for X

A Chrome extension that generates concise news posts using the OpenAI ChatGPT API and populates them in X's composer with a hotkey (Ctrl+Shift+N). Posts are in the format: "ONE WORD GRABBER, Short summary, Source: [Outlet]" (e.g., "PEACE, Israel-Hamas ceasefire aids Gaza, Source: Reuters"). News is randomized (Top, Breaking, Viral) and fresh (within 8 hours).

## Installation
1. Clone or download this repository.
2. Go to `chrome://extensions/`, enable "Developer mode", click "Load unpacked", and select the folder.
3. Open the extension popup, enter your OpenAI API key (from https://platform.openai.com/), and select a model (gpt-4o-mini, gpt-4o, or gpt-3.5-turbo).

## Usage
- Navigate to https://x.com/home and log in.
- Press Ctrl+Shift+N (or Cmd+Shift+N on Mac) to generate and insert a post.
- Review and click "Post" on X.

## Features
- Generates posts under 250 characters with one source.
- Randomly selects Top, Breaking, or Viral news within 8 hours.
- Prevents duplicate posts using local storage.
- Supports OpenAI models: gpt-4o-mini (default), gpt-4o, gpt-3.5-turbo.

## Notes
- Requires OpenAI API credits (monitor usage at https://platform.openai.com/).
- If X's UI changes, update selectors in `content.js` (inspect Post button/composer).
- To clear stored posts, run `chrome.storage.local.remove('postedSummaries')` in the browser console.

## License
MIT License