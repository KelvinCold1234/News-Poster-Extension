document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['openaiKey', 'model', 'hotkey'], (data) => {
    document.getElementById('openaiKey').value = data.openaiKey || '';
    document.getElementById('model').value = data.model || 'gpt-4o-mini';
    document.getElementById('hotkey').value = data.hotkey || 'Ctrl+Shift+N';
  });

  document.getElementById('save').addEventListener('click', () => {
    const openaiKey = document.getElementById('openaiKey').value.trim();
    const model = document.getElementById('model').value;
    const hotkey = document.getElementById('hotkey').value.trim();

    if (!openaiKey) {
      const status = document.getElementById('status');
      status.textContent = 'Please enter an OpenAI API key.';
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

    chrome.storage.sync.set({ openaiKey, model, hotkey }, () => {
      const status = document.getElementById('status');
      status.textContent = 'Settings saved! Update hotkey in chrome://extensions/shortcuts.';
      status.style.color = '#4caf50';
      setTimeout(() => { status.textContent = ''; }, 3000);
    });
  });
});