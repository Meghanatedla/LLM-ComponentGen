import google.generativeai as genai
from LLMInterface import LLMInterface
import os
from dotenv import load_dotenv

class Gemini(LLMInterface):
    def __init__(self):
        """
        Initialize the Gemini model.
        """
        
        load_dotenv()
        self.api_key = os.getenv("GEMINI_API_KEY")
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel("gemini-1.5-pro")

    def generate(self, prompt: str) -> str:
        """
        Generate text based on the given prompt.

        Args:
            prompt (str): Prompt to pass as user content to the model

        Returns:
                str: Returns the cleaned string response from the model. The entire response object is stored in self.response. 
        """

        self.response = self.model.generate_content(prompt)
        return self.response.text
    
    def write_to_file(self, filename: str) -> None:
        """
        Write the generated text to a file.

        Args:
            filepath (str): The path to the file to write to.
        """
        os.makedirs(os.path.dirname(filename), exist_ok=True)

        with open(filename, "w") as file:
            file.write(self.response.text)