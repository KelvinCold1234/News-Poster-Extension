console.log('Content script loaded or injected');

let isProcessing = false; // Flag to prevent duplicate processing

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  if (message.action === 'populatePost' && !isProcessing) {
    isProcessing = true;
    populatePost(message.summary);
    sendResponse({ status: 'received' });
    // Reset flag after a short delay to allow new messages
    setTimeout(() => { isProcessing = false; }, 1000);
  }
});

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
    console.log('Could not find the "Post" button on X. Please ensure you\'re on the home page.');
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
      // Populate text (single method to avoid duplicates)
      try {
        editor.focus();
        document.execCommand('insertText', false, summary);
        console.log('Text populated successfully');
      } catch (err) {
        console.error('Failed to insert text:', err);
        console.log('Failed to populate post. Please try again.');
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
      console.log('Could not find composer elements. X\'s UI may have changed - please check for updates.');
      isProcessing = false;
    }
  }, 500);
}