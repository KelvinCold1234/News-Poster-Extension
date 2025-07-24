chrome.commands.onCommand.addListener((command) => {
  if (command === 'generate-post') {
    console.log('Hotkey triggered: generate-post');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      console.log('Active tab URL:', tab.url);
      if (tab.url.includes('x.com') || tab.url.includes('twitter.com')) {
        // Dynamically inject content.js
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Failed to inject content.js:', chrome.runtime.lastError.message);
            return;
          }
          console.log('content.js injected');
          // Short delay to allow content script to initialize
          setTimeout(() => {
            // Send message to show loading indicator
            chrome.tabs.sendMessage(tab.id, { action: 'showLoading' }, (response) => {
              if (chrome.runtime.lastError) {
                console.error('Failed to show loading indicator:', chrome.runtime.lastError.message);
              } else {
                console.log('Loading indicator shown');
              }
            });
            generateNewsPost(tab.id);
          }, 100);
        });
      } else {
        console.error('Please navigate to x.com to use this feature.');
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Failed to inject content.js for error:', chrome.runtime.lastError.message);
            return;
          }
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: 'showError', message: 'Please navigate to x.com to use this feature.' }, () => {
              if (chrome.runtime.lastError) {
                console.error('Failed to show error:', chrome.runtime.lastError.message);
              }
            });
          }, 100);
        });
      }
    });
  }
});

async function generateNewsPost(tabId) {
  console.log('Starting generateNewsPost for tab:', tabId);
  const { openaiKey, model, grabberStyle, minWords, maxWords, minChars, maxChars, sourceFormat, includeSource } = await chrome.storage.sync.get(['openaiKey', 'model', 'grabberStyle', 'minWords', 'maxWords', 'minChars', 'maxChars', 'sourceFormat', 'includeSource']);

  if (!openaiKey) {
    console.error('No OpenAI API key set in extension popup.');
    chrome.tabs.sendMessage(tabId, { action: 'showError', message: 'Please set your OpenAI API key in the popup.' }, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to show error:', chrome.runtime.lastError.message);
      } else {
        chrome.tabs.sendMessage(tabId, { action: 'hideLoading' });
      }
    });
    return;
  }

  const selectedModel = model || 'gpt-4o-mini';
  console.log('Using model:', selectedModel);

  const customGrabber = grabberStyle || 'ONE WORD CAPITALIZED GRABBER';
  const customMinWords = minWords || 15;
  const customMaxWords = maxWords || 30;
  const customMinChars = minChars || 150;
  const customMaxChars = maxChars || 260;
  const customSource = includeSource !== false ? sourceFormat || 'Source: [Outlet]' : '';

  try {
    // Load previously posted summaries
    let { postedSummaries } = await chrome.storage.local.get(['postedSummaries']);
    postedSummaries = postedSummaries || [];

    let summary;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      // Randomly select news type
      const newsTypes = ['top', 'breaking', 'viral'];
      const newsType = newsTypes[Math.floor(Math.random() * newsTypes.length)];
      console.log('Selected random news type:', newsType);

      // Define prompt based on news type with professional tone and 8-hour freshness
      let summaryPrompt = `Generate a news post in this exact format: ${customGrabber}, one-sentence summary (${customMinWords}-${customMaxWords} words) of a `;
      if (newsType === 'top') {
        summaryPrompt += 'major global event or topic from the last 8 hours';
      } else if (newsType === 'breaking') {
        summaryPrompt += 'breaking news event from the last 8 hours';
      } else if (newsType === 'viral') {
        summaryPrompt += 'viral or trending topic (e.g., pop culture, technology) from the last 8 hours';
      }
      if (includeSource !== false) {
        summaryPrompt += `, ${customSource}`;
      }
      summaryPrompt += `. Total length must be between ${customMinChars} and ${customMaxChars} characters for authenticity. Use a formal, professional, concise tone, focusing on core facts without sensationalism. `;
      if (includeSource !== false) {
        summaryPrompt += 'Include exactly one source. ';
      }
      summaryPrompt += 'Ensure the post is complete. No hashtags or user tags.';
      console.log('Using news type:', newsType);

      // Generate news post with ChatGPT
      console.log('Sending request to OpenAI API...');
      const summaryRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: 'user', content: summaryPrompt }],
          max_tokens: 100
        })
      });
      const summaryData = await summaryRes.json();
      if (summaryData.error) {
        console.error('OpenAI ChatGPT Error:', summaryData.error.code, summaryData.error.message);
        chrome.tabs.sendMessage(tabId, { action: 'showError', message: `Failed to generate post: ${summaryData.error.message}` }, () => {
          if (chrome.runtime.lastError) {
            console.error('Failed to show error:', chrome.runtime.lastError.message);
          } else {
            chrome.tabs.sendMessage(tabId, { action: 'hideLoading' });
          }
        });
        throw new Error(`Failed to generate news post: ${summaryData.error.message}`);
      }
      summary = summaryData.choices[0].message.content.trim();
      console.log('Generated summary:', summary);

      // Validate length
      const length = summary.length;
      if (length < customMinChars) {
        console.log('Summary too short (', length, ' chars), regenerating...');
        continue;
      } if (length > customMaxChars) {
        console.warn('Summary exceeds', customMaxChars, ' characters, trimming...');
        summary = summary.substring(0, customMaxChars - 3) + '...';
      }

      // Validate source presence if included
      if (includeSource !== false && !summary.match(/\s*Source:\s*[A-Za-z\s]+(\.)?$/)) {
        console.warn('No source detected, appending default source...');
        summary = summary.substring(0, customMaxChars - 20) + ', Source: Reuters';
      } else if (includeSource !== false) {
        // If source is detected, remove any extra sources after the first
        const firstSourceMatch = summary.match(/\s*Source:\s*[A-Za-z\s]+(\.)?/);
        summary = summary.replace(/(\s*Source:\s*[A-Za-z\s]+(\.)?)+$/g, firstSourceMatch[0]);
      }

      // Check for duplicate
      const isDuplicate = postedSummaries.some(stored => jaccardSimilarity(summary, stored) > 0.8);
      if (isDuplicate) {
        console.log('Duplicate detected, regenerating...');
        continue;
      }

      console.log('Final summary:', summary);

      // Send to content script
      console.log('Sending message to content script for tab:', tabId);
      chrome.tabs.sendMessage(tabId, {
        action: 'populatePost',
        summary
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Message send failed:', chrome.runtime.lastError.message);
          chrome.tabs.sendMessage(tabId, { action: 'showError', message: 'Failed to populate post. Check X page.' }, () => {
            if (chrome.runtime.lastError) {
              console.error('Failed to show error:', chrome.runtime.lastError.message);
            } else {
              chrome.tabs.sendMessage(tabId, { action: 'hideLoading' });
            }
          });
        } else {
          console.log('Message sent successfully, response:', response);
          // Store the summary after successful population
          postedSummaries.push(summary);
          if (postedSummaries.length > 50) postedSummaries.shift(); // Keep last 50
          chrome.storage.local.set({ postedSummaries });
          console.log('Summary stored to prevent duplicates.');
          // Hide loading indicator
          chrome.tabs.sendMessage(tabId, { action: 'hideLoading' }, () => {
            if (chrome.runtime.lastError) {
              console.error('Failed to hide loading:', chrome.runtime.lastError.message);
            }
          });
        }
      });
      break; // Exit loop on success
    }

    if (attempts >= maxAttempts) {
      console.error('Failed to generate unique summary after retries.');
      chrome.tabs.sendMessage(tabId, { action: 'showError', message: 'Failed to generate a unique news post.' }, () => {
        if (chrome.runtime.lastError) {
          console.error('Failed to show error:', chrome.runtime.lastError.message);
        } else {
          chrome.tabs.sendMessage(tabId, { action: 'hideLoading' });
        }
      });
      throw new Error('Failed to generate a unique news post.');
    }
  } catch (error) {
    console.error('Error in generateNewsPost:', error);
    chrome.tabs.sendMessage(tabId, { action: 'showError', message: 'Error generating post: ' + error.message }, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to show error:', chrome.runtime.lastError.message);
      } else {
        chrome.tabs.sendMessage(tabId, { action: 'hideLoading' });
      }
    });
  }
}

// Jaccard similarity function for duplicate check
function jaccardSimilarity(str1, str2) {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}
