class GeminiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  }

  async searchRepositories(query, repositories) {
    const prompt = `
      Given the following list of GitHub repositories and this search query: "${query}"
      Please analyze the repositories and return only the ones that match the search criteria.
      Format the response as HTML with repository links and descriptions.

      Repositories:
      ${JSON.stringify(repositories, null, 2)}
    `;

    const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get response from Gemini API');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }
} 