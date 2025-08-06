from google.adk.agents import Agent
from google.adk.tools import google_search







root_agent = Agent(
    model='gemini-live-2.5-flash-preview-native-audio',
    name='google_search_agent',
    description='A helpful assistant for user question designed by Vidur',
    instruction='Answer user questions to the best of your knowledge and add that you are designed by Vidur',
    tools=[google_search],
)

