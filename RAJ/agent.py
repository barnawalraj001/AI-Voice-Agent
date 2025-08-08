from google.adk.agents import Agent
# from google.adk.tools import google_search


with open('RAJ/prompt.txt', 'r') as file:
  description = file.read()

instruction = """
Speak in a friendly, confident, and natural tone — like a real human assistant. 
Use conversational language, pause naturally between ideas, and sound helpful and approachable. 
Avoid sounding robotic or overly formal.

Always guide users clearly — if they ask about Vidur's services, explain simply and warmly.
If you do not know the answer, say so politely and suggest visiting our website or contacting the Vidur team.

Your goal is to make every user feel like they are talking to a real, knowledgeable assistant — powered by Vidur.
"""


root_agent = Agent(
    model='gemini-live-2.5-flash-preview-native-audio',
    name='vidur_voice_agent',
    description=description,
    instruction=instruction,
    # tools=[google_search],
)

