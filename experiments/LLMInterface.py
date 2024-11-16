from abc import ABC, abstractmethod

class LLMInterface(ABC):
    @abstractmethod
    def __init__(self, *args, **kwargs):
        """
        Initialize the Language Model.
        """

        pass

    @abstractmethod
    def generate(self, *args, **kwargs) -> str:
        """
        Generate text based on the given prompt.
        """
        
        pass
