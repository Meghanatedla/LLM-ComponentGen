from gradio_client import Client
from LLMInterface import LLMInterface
import os

class CodeQwen(LLMInterface):
    def __init__(self, *args, **kwargs) -> None:
        """
        Initialize the CodeQwen model.
        """
        self.model = Client("sudokara/CodeQwen1.5-7B-Chat")

    def generate(self, prompt:str, *args, **kwargs) -> str:
        """
        Generate text based on the given prompt.
        
        Args:
            prompt (str): Prompt to pass as user content to the model

        Returns:
            str: Returns the cleaned string response from the model. The entire response object is stored in self.last_response.
        """
        self.response = self.model.predict(
            input_text=prompt,
            api_name="/predict",
        )

        self.response_text = self.response
        return self.response_text

    def write_to_file(self, filename: str) -> None:
        """
        Write the generated text to a file.

        Args:
            filepath (str): The path to the file to write to.
        """
        os.makedirs(os.path.dirname(filename), exist_ok=True)

        with open(filename, 'w') as f:
            f.write(self.response_text)
