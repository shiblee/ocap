from google import genai
import logging

logger = logging.getLogger(__name__)

class AIService:
    @staticmethod
    async def generate_social_post(project_description: str, platform: str = "general", api_key: str = None):
        if not api_key:
            return "Error: Gemini API Key not configured."

        try:
            client = genai.Client(api_key=api_key)

            prompt = f"""You are a social media manager for a project with the following description:
"{project_description}"

Create a highly engaging and professional social media post for {platform}.
Include relevant emojis and hashtags.
Keep it concise and punchy."""

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            return response.text
        except Exception as e:
            logger.error(f"Gemini API Error: {e}")
            return f"Failed to generate post: {str(e)}"

    @staticmethod
    async def improve_content(content: str, api_key: str = None):
        if not api_key:
            return content

        try:
            client = genai.Client(api_key=api_key)

            prompt = f"Improve this marketing message to be more engaging and professional:\n\n{content}"
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            return response.text
        except Exception as e:
            logger.error(f"Gemini API Error: {e}")
            return content
