import google.generativeai as genai
import logging

logger = logging.getLogger(__name__)

class AIService:
    @staticmethod
    async def generate_social_post(project_description: str, platform: str = "general", api_key: str = None):
        """
        Generate a social media post based on project description using Gemini.
        """
        if not api_key:
            return "Error: Gemini API Key not configured."
        
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-flash-latest')
            
            prompt = f"""
            You are a social media manager for a project with the following description:
            "{project_description}"
            
            Create a highly engaging and professional social media post for {platform}.
            Include relevant emojis and hashtags.
            Keep it concise and punchy.
            """
            
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API Error: {e}")
            return f"Failed to generate post: {str(e)}"

    @staticmethod
    async def improve_content(content: str, api_key: str = None):
        """
        Improve existing content using Gemini.
        """
        if not api_key:
            return content
            
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-flash-latest')
            
            prompt = f"Improve this marketing message to be more engaging and professional:\n\n{content}"
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini API Error: {e}")
            return content
