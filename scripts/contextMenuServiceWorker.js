// Function to get + decode API key
const getKey = () => {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(["openai-key"], (result) => {
      if (result["openai-key"]) {
        const decodedKey = atob(result["openai-key"]);
        resolve(decodedKey);
      }
    });
  });
};

const sendMessage = (content) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0].id;

    chrome.tabs.sendMessage(
      activeTab,
      { message: "inject", content },
      (response) => {
        if (response.status === "failed") {
          console.log("injection failed.");
        }
      }
    );
  });
};

// Setup our generate function
const generate = async (prompt) => {
  // Get your API key from storage
  const key = await getKey();
  const url = "https://api.openai.com/v1/completions";

  // Call completions endpoint
  const completionResponse = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 1250,
      temperature: 0.7,
    }),
  });

  // Select the top choice and send back
  const completion = await completionResponse.json();
  return completion.choices.pop();
};

const generateCompletionAction = async (info) => {
  try {
    // Send mesage with generating text (this will be like a loading indicator)
    sendMessage("generating...");

    const { selectionText } = info;
    const basePromptPrefix = `
      Write me a detailed table of contents for a Twitter thread with the title below.
      
      Title:
      `;

    const baseCompletion = await generate(
      `${basePromptPrefix}${selectionText}`
    );

    const secondPrompt = `
        Take the table of contents and title of the twitter thread below and generate a twitter thread written in the style of Trung Phan. Don't just list the points. Go deep into each one. Explain why.
        
        Title: ${selectionText}
        
        Table of Contents: ${baseCompletion.text}
        
        Twitter thread:
		  `;

    const secondPromptCompletion = await generate(secondPrompt);

    // Send the output when we're all done
    sendMessage(secondPromptCompletion.text);
  } catch (error) {
    console.log(error);

    // Add this here as well to see if we run into any errors!
    sendMessage(error.toString());
  }
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "context-run",
    title: "Generate Tweet Thread",
    contexts: ["selection"],
  });
});

// Add listener
chrome.contextMenus.onClicked.addListener(generateCompletionAction);
