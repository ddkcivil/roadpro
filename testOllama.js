async function test() {
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'deepseek-r1:32b',
        messages: [
          { role: 'user', content: 'Hello, how are you?' }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Ollama response:', data.message.content);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();