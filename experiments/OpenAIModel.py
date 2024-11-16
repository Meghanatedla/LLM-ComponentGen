from openai import OpenAI
from LLMInterface import LLMInterface
import os
from dotenv import load_dotenv

class OpenAIModel(LLMInterface):
    def __init__(self, model_name: str) -> None:
        """
        Initialize the OpenAI model.

        Args:
            model_name (str): The model name to use.
        """

        load_dotenv()
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = OpenAI(
            api_key=self.api_key,
        )
        self.model_name = model_name

    def generate(self, prompt: str) -> str:
        """
        Generate text based on the given prompt.

        Args:
            prompt (str): Prompt to pass as user content to the model

        Returns:
            str: Returns the cleaned string response from the model. The entire response object is stored in self.last_response.
        """     

        self.response = self.model.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model=self.model_name,
        )

        return self.response.choices[0].message.content
    
    def write_to_file(self, filename: str) -> None:
        """
        Write the generated text to a file.

        Args:
            filepath (str): The path to the file to write to.
        """
        os.makedirs(os.path.dirname(filename), exist_ok=True)

        with open(filename, "w") as file:
            file.write(self.response.choices[0].message.content)