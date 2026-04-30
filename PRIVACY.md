# czcode Privacy Policy

czcode runs entirely on your local machine. Below is a summary of where data goes.

### Where Your Data Goes

- **Code & Files**: czcode accesses files on your local machine when needed for AI-assisted features. When you send commands, relevant files may be transmitted to your chosen AI model provider (e.g., DashScope/Qwen, OpenAI, Anthropic) to generate responses. We do not have access to this data, but AI providers may store it per their privacy policies.
- **SQL & Lakehouse Data**: SQL queries and query results are processed locally. When you use AI-powered features, query context may be sent to your configured AI model provider. Lakehouse credentials are stored locally in `.env` and never transmitted to czcode maintainers.
- **Prompts & AI Requests**: Your prompts and relevant project context are sent to your chosen AI model provider to generate responses. These AI providers have their own privacy policies.
- **API Keys & Credentials**: API keys and Lakehouse credentials are stored locally on your device and never sent to czcode maintainers or any third party, except the provider you have chosen.

### Your Choices & Control

- You can run models locally to prevent data being sent to third-parties.
- You can restrict SQL permissions by choosing the `lh-analyst` agent role (SELECT only).

### Security & Updates

We take reasonable measures to secure your data, but no system is 100% secure. If our privacy policy changes, we will update this document.
