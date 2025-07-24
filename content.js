console.log('Content script loaded or injected');

let isProcessing = false; // Flag to prevent duplicate processing

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  if (message.action === 'populatePost' && !isProcessing) {
    isProcessing = true;
    populatePost(message.summary);
    sendResponse({ status: 'received' });
    setTimeout(() => { isProcessing = false; }, 1000);
  } else if (message.action === 'showLoading') {
    showLoadingIndicator();
    sendResponse({ status: 'loading shown' });
  } else if (message.action === 'hideLoading') {
    hideLoadingIndicator();
    sendResponse({ status: 'loading hidden' });
  } else if (message.action === 'showError') {
    showError(message.message);
    sendResponse({ status: 'error shown' });
  }
});

function showLoadingIndicator() {
  // Remove any existing loading indicator
  hideLoadingIndicator();
  // Create loading div
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'news-poster-loading';
  loadingDiv.style.position = 'fixed';
  loadingDiv.style.top = '50%';
  loadingDiv.style.left = '50%';
  loadingDiv.style.transform = 'translate(-50%, -50%)';
  loadingDiv.style.backgroundColor = '#1da1f2'; // X's blue
  loadingDiv.style.color = '#ffffff';
  loadingDiv.style.padding = '15px 30px';
  loadingDiv.style.borderRadius = '8px';
  loadingDiv.style.zIndex = '9999';
  loadingDiv.style.fontFamily = 'Arial, sans-serif';
  loadingDiv.style.fontSize = '16px';
  loadingDiv.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
  loadingDiv.style.animation = 'pulse 1.5s ease-in-out infinite';
  loadingDiv.textContent = 'Generating post...';
  document.body.appendChild(loadingDiv);
  // Add CSS animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.7; }
      100% { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  console.log('Loading indicator displayed');
}

function hideLoadingIndicator() {
  const loadingDiv = document.getElementById('news-poster-loading');
  const style = document.querySelector('style[data-news-poster]');
  if (loadingDiv) {
    loadingDiv.remove();
    console.log('Loading indicator removed');
  }
  if (style) {
    style.remove();
  }
}

function showError(message) {
  hideLoadingIndicator();
  const errorDiv = document.createElement('div');
  errorDiv.id = 'news-poster-error';
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '50%';
  errorDiv.style.left = '50%';
  errorDiv.style.transform = 'translate(-50%, -50%)';
  errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
  errorDiv.style.color = '#ffffff';
  errorDiv.style.padding = '15px 30px';
  errorDiv.style.borderRadius = '8px';
  errorDiv.style.zIndex = '9999';
  errorDiv.style.fontFamily = 'Arial, sans-serif';
  errorDiv.style.fontSize = '16px';
  errorDiv.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
  console.log('Error displayed:', message);
}

function populatePost(summary) {
  console.log('Attempting to populate post with summary:', summary);
  // Find and click the new post button (expanded selectors)
  const newPostButton = document.querySelector('a[data-testid="SideNav_NewTweet_Button"]') ||
                        document.querySelector('a[data-testid="SideNav_NewPost_Button"]') ||
                        document.querySelector('a[aria-label="Post"]') ||
                        document.querySelector('a[aria-label="Tweet"]') ||
                        document.querySelector('a[href="/compose/post"]') ||
                        document.querySelector('a[href="/compose/tweet"]') ||
                        document.querySelector('button[aria-label="Tweet"]');
  if (!newPostButton) {
    console.error('Could not find Post button. Selectors tried:', [
      'a[data-testid="SideNav_NewTweet_Button"]',
      'a[data-testid="SideNav_NewPost_Button"]',
      'a[aria-label="Post"]',
      'a[aria-label="Tweet"]',
      'a[href="/compose/post"]',
      'a[href="/compose/tweet"]',
      'button[aria-label="Tweet"]'
    ]);
    chrome.runtime.sendMessage({ action: 'showError', message: 'Could not find the "Post" button on X.' });
    isProcessing = false;
    return;
  }
  console.log('Found Post button, clicking...');
  newPostButton.click();

  // Wait for composer to appear (increased timeout to 15s, check every 500ms)
  let attempts = 0;
  const maxAttempts = 30;
  const interval = setInterval(() => {
    attempts++;
    const editor = document.querySelector('div[data-testid="tweetTextarea_0RichEditor"]') ||
                   document.querySelector('div[data-testid="tweetTextarea_0"]') ||
                   document.querySelector('div[role="textbox"][aria-label="Post text"]') ||
                   document.querySelector('div[role="textbox"][aria-label="Tweet text"]') ||
                   document.querySelector('div[contenteditable="true"]');
    console.log('Attempt', attempts, '- Editor found:', !!editor);

    if (editor) {
      clearInterval(interval);
      console.log('Composer found, populating text...');
      try {
        editor.focus();
        document.execCommand('insertText', false, summary);
        console.log('Text populated successfully');
        chrome.runtime.sendMessage({ action: 'hideLoading' });
      } catch (err) {
        console.error('Failed to insert text:', err);
        chrome.runtime.sendMessage({ action: 'showError', message: 'Failed to populate post.' });
      }
      isProcessing = false;
    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
      console.error('Composer not found after', maxAttempts, 'attempts. Selectors tried:', [
        'div[data-testid="tweetTextarea_0RichEditor"]',
        'div[data-testid="tweetTextarea_0"]',
        'div[role="textbox"][aria-label="Post text"]',
        'div[role="textbox"][aria-label="Tweet text"]',
        'div[contenteditable="true"]'
      ]);
      chrome.runtime.sendMessage({ action: 'showError', message: 'Could not find composer elements.' });
      isProcessing = false;
    }
  }, 500);
}