document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['openaiKey', 'model'], (data) => {
    document.getElementById('openaiKey').value = data.openaiKey || '';
    document.getElementById('model').value = data.model || 'gpt-4o-mini';
  });

  document.getElementById('save').addEventListener('click', () => {
    const openaiKey = document.getElementById('openaiKey').value.trim();
    const model = document.getElementById('model').value;

    if (!openaiKey) {
      const status = document.getElementById('status');
      status.textContent = 'Please enter an OpenAI API key.';
      status.style.color = '#f44336'; // Red for error
      setTimeout(() => { status.textContent = ''; }, 3000);
      return;
    }

    chrome.storage.sync.set({ openaiKey, model }, () => {
      const status = document.getElementById('status');
      status.textContent = 'Settings saved successfully!';
      status.style.color = '#4caf50';
      setTimeout(() => { status.textContent = ''; }, 3000);
    });
  });
});