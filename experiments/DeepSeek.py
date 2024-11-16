from openai import OpenAI
from LLMInterface import LLMInterface
import os
from dotenv import load_dotenv

class DeepSeek(LLMInterface):
    def __init__(self, *args, **kwargs):
        """
        Initialize the DeepSeek model.
        """

        load_dotenv()
        self.__api_key = os.getenv("DEEPSEEK_API_KEY")
        self.model = OpenAI(
            api_key=self.__api_key,
            base_url="https://api.deepseek.com",
            *args,
            **kwargs
        )
    
    def generate(self, prompt:str, *args, **kwargs):
        """
        Generate text based on the given prompt.
        """

        self.response = self.model.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant well versed in coding.",
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            *args,
            **kwargs
        )

        return self.response.choices[0].message.content
    
    def write_to_file(self, filename: str):
        """
        Write the last generated text to a file.
        """
        os.makedirs(os.path.dirname(filename), exist_ok=True)

        with open(filename, "w") as f:
            f.write(self.response.choices[0].message.content)
