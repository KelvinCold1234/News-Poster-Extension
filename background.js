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
  const { openaiKey, gnewsKey, model, grabberStyle, minWords, maxWords, minChars, maxChars, sourceFormat, includeSource } = await chrome.storage.sync.get(['openaiKey', 'gnewsKey', 'model', 'grabberStyle', 'minWords', 'maxWords', 'minChars', 'maxChars', 'sourceFormat', 'includeSource']);

  if (!openaiKey || !gnewsKey) {
    console.error('API keys missing.');
    chrome.tabs.sendMessage(tabId, { action: 'showError', message: 'Please set both OpenAI and GNews API keys in the popup.' }, () => {
      if (chrome.runtime.lastError) {
        console.error('Failed to show error:', chrome.runtime.lastError.message);
      } else {
        chrome.tabs.sendMessage(tabId, { action: 'hideLoading' });
      }
    });
    return;
  }

  const selectedModel = model || 'gpt-4.1';
  console.log('Using model:', selectedModel);

  const customGrabber = grabberStyle || 'ONE WORD CAPITALIZED GRABBER';
  const customMinWords = minWords || 15;
  const customMaxWords = maxWords || 30;
  const customMinChars = minChars || 150;
  const customMaxChars = maxChars || 260;
  const customSource = includeSource !== false ? sourceFormat || 'Source: [Outlet]' : '';

  try {
    // Load and clear previously posted summaries to ensure fresh articles
    let { postedSummaries } = await chrome.storage.local.get(['postedSummaries']);
    postedSummaries = []; // Clear to force new articles each time
    chrome.storage.local.set({ postedSummaries });

    let summary;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      // Fetch top national news from GNews API with max results
      const gnewsUrl = `https://gnews.io/api/v4/top-headlines?token=${gnewsKey}&lang=en&country=us&max=10`;
      console.log('GNews URL:', gnewsUrl);

      const newsResponse = await fetch(gnewsUrl);
      console.log('GNews response status:', newsResponse.status);
      const newsData = await newsResponse.json();
      console.log('GNews response data:', newsData);
      if (newsResponse.status !== 200 || !newsData.articles || newsData.articles.length === 0) {
        console.error('Failed to fetch news articles:', newsData.message || 'No articles found or invalid response');
        chrome.tabs.sendMessage(tabId, { action: 'showError', message: 'Failed to fetch top national news from GNews. ' + (newsData.message || 'No articles found or server issue.') }, () => {
          if (chrome.runtime.lastError) {
            console.error('Failed to show error:', chrome.runtime.lastError.message);
          } else {
            chrome.tabs.sendMessage(tabId, { action: 'hideLoading' });
          }
        });
        // Fallback to general search if top-headlines fails
        const fallbackUrl = `https://gnews.io/api/v4/search?q=news&token=${gnewsKey}&lang=en&max=10`;
        console.log('Falling back to GNews search URL:', fallbackUrl);
        const fallbackResponse = await fetch(fallbackUrl);
        const fallbackData = await fallbackResponse.json();
        if (fallbackResponse.status !== 200 || !fallbackData.articles || fallbackData.articles.length === 0) {
          console.error('Fallback failed:', fallbackData.message || 'No articles found');
          throw new Error('Both primary and fallback GNews requests failed.');
        }
        newsData.articles = fallbackData.articles; // Use fallback articles
      }
      console.log('Number of articles fetched:', newsData.articles.length);

      // Pick a random article
      const article = newsData.articles[Math.floor(Math.random() * newsData.articles.length)];
      const articleTitle = article.title;
      const articleDesc = article.description || '';
      const articleSource = article.source.name;

      console.log('Selected article:', articleTitle, 'Source:', articleSource);

      // Generate awesome summary with ChatGPT
      let summaryPrompt = `Transform this news article into an awesome, X-friendly post in this exact format: ${customGrabber}, one-sentence summary (${customMinWords}-${customMaxWords} words) based on "${articleTitle} - ${articleDesc}". `;
      if (includeSource !== false) {
        summaryPrompt += `, ${customSource.replace('[Outlet]', articleSource)}`;
      }
      summaryPrompt += `. Total length must be between ${customMinChars} and ${customMaxChars} characters. Use an exciting, concise tone to grab attention, focusing on key facts, and make it sound epic for X users. Ensure the post is complete. No hashtags or user tags.`;
      console.log('Generated summary prompt:', summaryPrompt);

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
          max_tokens: 150
        })
      });
      console.log('OpenAI response status:', summaryRes.status);
      const summaryData = await summaryRes.json();
      console.log('OpenAI response data:', summaryData);
      if (summaryData.error) {
        console.error('OpenAI ChatGPT Error:', summaryData.error.code, summaryData.error.message);
        chrome.tabs.sendMessage(tabId, { action: 'showError', message: `Failed to generate summary: ${summaryData.error.message}` }, () => {
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
      if (includeSource !== false) {
        const sourceMatch = summary.match(/\s*Source:\s*[A-Za-z\s]+(\.)?$/);
        if (!sourceMatch || summary.includes('[Outlet]')) {
          console.warn('No valid source detected, using GNews source...');
          summary = summary.replace('[Outlet]', articleSource);
        } else {
          // Remove extra sources after the first
          const firstSourceMatch = summary.match(/\s*Source:\s*[A-Za-z\s]+(\.)?/);
          summary = summary.replace(/(\s*Source:\s*[A-Za-z\s]+(\.)?)+$/g, firstSourceMatch[0]);
        }
      }

      // Check for duplicate
      const isDuplicate = postedSummaries.some(stored => jaccardSimilarity(summary, stored) > 0.8);
      if (isDuplicate) {
        console.log('Duplicate detected, fetching new articles...');
        continue; // Fetch new articles instead of just regenerating summary
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