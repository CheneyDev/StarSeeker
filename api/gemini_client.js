class GeminiClient {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  }

  async searchRepositories(query, repositories) {
    if (!query || !repositories || !Array.isArray(repositories)) {
      throw new Error('Invalid search parameters');
    }

    const prompt = `
      Given the following list of GitHub repositories and this search query: "${query}"
      Please analyze the repositories and return only the ones that match the search criteria.
      Format the response as HTML with repository links and descriptions.

      Repositories:
      ${JSON.stringify(repositories, null, 2)}
    `;

    try {
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
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'Failed to get response from Gemini API');
      }

      const data = await response.json();
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response format from Gemini API');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Gemini API error:', error);
      throw new Error(`Failed to search repositories: ${error.message}`);
    }
  }
} 