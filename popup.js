document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['openaiKey', 'gnewsKey', 'model', 'hotkey', 'grabberStyle', 'minWords', 'maxWords', 'minChars', 'maxChars', 'sourceFormat', 'includeSource'], (data) => {
    document.getElementById('openaiKey').value = data.openaiKey || '';
    document.getElementById('gnewsKey').value = data.gnewsKey || '';
    document.getElementById('model').value = data.model || 'gpt-4.1';
    document.getElementById('hotkey').value = data.hotkey || 'Ctrl+Shift+N';
    document.getElementById('grabberStyle').value = data.grabberStyle || 'ONE WORD CAPITALIZED GRABBER';
    document.getElementById('minWords').value = data.minWords || 15;
    document.getElementById('maxWords').value = data.maxWords || 30;
    document.getElementById('minChars').value = data.minChars || 150;
    document.getElementById('maxChars').value = data.maxChars || 260;
    document.getElementById('sourceFormat').value = data.sourceFormat || 'Source: [Outlet]';
    document.getElementById('includeSource').checked = data.includeSource !== false; // Default true
  });

  document.getElementById('save').addEventListener('click', () => {
    const openaiKey = document.getElementById('openaiKey').value.trim();
    const gnewsKey = document.getElementById('gnewsKey').value.trim();
    const model = document.getElementById('model').value;
    const hotkey = document.getElementById('hotkey').value.trim();
    const grabberStyle = document.getElementById('grabberStyle').value.trim();
    const minWords = parseInt(document.getElementById('minWords').value) || 15;
    const maxWords = parseInt(document.getElementById('maxWords').value) || 30;
    const minChars = parseInt(document.getElementById('minChars').value) || 150;
    const maxChars = parseInt(document.getElementById('maxChars').value) || 260;
    const sourceFormat = document.getElementById('sourceFormat').value.trim();
    const includeSource = document.getElementById('includeSource').checked;

    if (!openaiKey || !gnewsKey) {
      const status = document.getElementById('status');
      status.textContent = 'Please enter both OpenAI and GNews API keys.';
      status.style.color = '#f44336'; // Red for error
      setTimeout(() => { status.textContent = ''; }, 3000);
      return;
    }

    // Basic hotkey validation (e.g., Ctrl+Shift+X or Alt+X)
    const validHotkey = /^(Ctrl|Shift|Alt)?(\+(Ctrl|Shift|Alt))*\+[A-Za-z]$/.test(hotkey);
    if (!validHotkey && hotkey !== '') {
      const status = document.getElementById('status');
      status.textContent = 'Invalid hotkey format. Use e.g., Ctrl+Shift+N.';
      status.style.color = '#f44336';
      setTimeout(() => { status.textContent = ''; }, 3000);
      return;
    }

    // Validate word and char ranges
    if (minWords > maxWords || minChars > maxChars || minWords < 5 || maxWords > 50 || minChars < 100 || maxChars > 280) {
      const status = document.getElementById('status');
      status.textContent = 'Invalid ranges. Min must be less than max; words 5-50, chars 100-280.';
      status.style.color = '#f44336';
      setTimeout(() => { status.textContent = ''; }, 3000);
      return;
    }

    chrome.storage.sync.set({ openaiKey, gnewsKey, model, hotkey, grabberStyle, minWords, maxWords, minChars, maxChars, sourceFormat, includeSource }, () => {
      const status = document.getElementById('status');
      status.textContent = 'Settings saved successfully!';
      status.style.color = '#4caf50';
      setTimeout(() => { status.textContent = ''; }, 3000);
    });
  });
});