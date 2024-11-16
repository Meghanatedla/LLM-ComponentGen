from gradio_client import Client
from LLMInterface import LLMInterface
import os

class CodeQwen(LLMInterface):
    def __init__(self, *args, **kwargs) -> None:
        self.model = Client("sudokara/CodeQwen1.5-7B-Chat")

    def generate(self, prompt:str, *args, **kwargs) -> str:
        self.response = self.model.predict(
            input_text=prompt,
            api_name="/predict",
        )

        self.response_text = self.response
        return self.response_text

    def write_to_file(self, filename: str) -> None:
        os.makedirs(os.path.dirname(filename), exist_ok=True)

        with open(filename, 'w') as f:
            f.write(self.response_text)
