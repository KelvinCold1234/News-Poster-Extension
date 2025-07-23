chrome.commands.onCommand.addListener((command) => {
  if (command === 'generate-post') {
    console.log('Hotkey triggered: generate-post');
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      console.log('Active tab URL:', tab.url);
      if (tab.url.includes('x.com') || tab.url.includes('twitter.com')) {
        generateNewsPost(tab.id);
      } else {
        console.error('Please navigate to x.com to use this feature.');
      }
    });
  }
});

async function generateNewsPost(tabId) {
  console.log('Starting generateNewsPost for tab:', tabId);
  const { openaiKey, model } = await chrome.storage.sync.get(['openaiKey', 'model']);

  if (!openaiKey) {
    console.error('No OpenAI API key set in extension popup.');
    return;
  }

  const selectedModel = model || 'gpt-4o-mini'; // Default to gpt-4o-mini
  console.log('Using model:', selectedModel);

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
      let summaryPrompt;
      if (newsType === 'top') {
        summaryPrompt = `Generate a news post in this exact format: ONE WORD CAPITALIZED GRABBER, very short one-sentence summary (5-12 words) of a major global event or topic from the last 8 hours, Source: [one outlet, e.g., Reuters]. Total length must be under 250 characters. Use a formal, professional, concise tone, focusing on core facts without sensationalism. Include exactly one source. Ensure the post is complete. No hashtags or user tags.`;
      } else if (newsType === 'breaking') {
        summaryPrompt = `Generate a news post in this exact format: ONE WORD CAPITALIZED GRABBER, very short one-sentence summary (5-12 words) of a breaking news event from the last 8 hours, Source: [one outlet, e.g., CNN]. Total length must be under 250 characters. Use a formal, professional, concise tone, focusing on core facts without sensationalism. Include exactly one source. Ensure the post is complete. No hashtags or user tags.`;
      } else if (newsType === 'viral') {
        summaryPrompt = `Generate a news post in this exact format: ONE WORD CAPITALIZED GRABBER, very short one-sentence summary (5-12 words) of a viral or trending topic (e.g., pop culture, technology) from the last 8 hours, Source: [one outlet, e.g., BBC]. Total length must be under 250 characters. Use a formal, professional, concise tone, focusing on core facts without sensationalism. Include exactly one source. Ensure the post is complete. No hashtags or user tags.`;
      }
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
          max_tokens: 70
        })
      });
      const summaryData = await summaryRes.json();
      if (summaryData.error) {
        console.error('OpenAI ChatGPT Error:', summaryData.error.code, summaryData.error.message);
        throw new Error(`Failed to generate news post: ${summaryData.error.message}`);
      }
      summary = summaryData.choices[0].message.content.trim();
      console.log('Generated summary:', summary);

      // Validate character limit
      if (summary.length > 250) {
        console.warn('Summary exceeds 250 characters, trimming...');
        summary = summary.substring(0, 247) + '...';
      }

      // Validate source presence (flexible regex without required comma)
      if (!summary.match(/\s*Source:\s*[A-Za-z\s]+(\.)?$/)) {
        console.warn('No source detected, appending default source...');
        summary = summary.substring(0, 230) + ', Source: Reuters';
      } else {
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

      // Dynamically inject content.js to ensure it's loaded
      console.log('Injecting content.js into tab:', tabId);
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content.js']
      });

      // Short delay to allow content script to initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      // Send to content script
      console.log('Sending message to content script for tab:', tabId);
      chrome.tabs.sendMessage(tabId, {
        action: 'populatePost',
        summary
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Message send failed:', chrome.runtime.lastError.message);
        } else {
          console.log('Message sent successfully, response:', response);
          // Store the summary after successful population
          postedSummaries.push(summary);
          if (postedSummaries.length > 50) postedSummaries.shift(); // Keep last 50
          chrome.storage.local.set({ postedSummaries });
          console.log('Summary stored to prevent duplicates.');
        }
      });
      break; // Exit loop on success
    }

    if (attempts >= maxAttempts) {
      console.error('Failed to generate unique summary after retries.');
      throw new Error('Failed to generate a unique news post.');
    }
  } catch (error) {
    console.error('Error in generateNewsPost:', error);
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