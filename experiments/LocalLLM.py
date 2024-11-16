# %%
import os
from LLMInterface import LLMInterface
# %%

#! Changing cache directories must happen BEFORE transformers is imported
cache_dir = os.getenv("CACHE_DIR", "/scratch/serverlessllm")
os.environ["TRANSFORMERS_CACHE"] = cache_dir
os.environ["HF_CACHE"] = cache_dir
os.environ["HF_HOME"] = cache_dir
os.environ["HF_DATASETS_CACHE"] = cache_dir

from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline

class LocalLLM(LLMInterface):
    def __init__(self, 
                model_name:str,
                max_new_tokens:int=1024,
                do_sample:bool=True,
                num_beams:int=1,
                temperature:float=0.5,
                top_p:float=0.95,
                top_k:float=40,
                repetition_penalty:float=1.1,
                model_args=[], model_kwargs={},
                tokenizer_args=[], tokenizer_kwargs={},
                pipeline_args=[], pipeline_kwargs={}) -> None:
        """
        Initialize the model from huggingface hub. The model will run locally with device_map set to auto.

        Args:
            model_name (str): The model name to load from huggingface hub. For example, "Artigenz/Artigenz-Coder-DS-6.7B".
            max_new_tokens (int, optional): Maximum number of new tokens to generate in the response. Defaults to 1024.
            do_sample (bool, optional): Sets the generation strategy. See https://huggingface.co/docs/transformers/en/main_classes/text_generation#transformers.GenerationMixin. Defaults to True.
            num_beams (int, optional): Sets the number of beams for beam search. See https://huggingface.co/docs/transformers/en/main_classes/text_generation#transformers.GenerationMixin. Defaults to 1.
            temperature (float, optional): The value used to modulate the next token probabilities. Defaults to 0.5.
            top_p (float, optional): If set to float < 1, only the smallest set of most probable tokens with probabilities that add up to top_p or higher are kept for generation. Defaults to 0.95.
            top_k (float, optional): The number of highest probability vocabulary tokens to keep for top-k-filtering. Defaults to 40.
            repetition_penalty (float, optional): The parameter for repetition penalty. 1.0 means no penalty. See https://arxiv.org/pdf/1909.05858.pdf. Defaults to 1.1.
            model_args (list, optional): arguments to pass to AutoModelForCausalLM.from_pretrained. Defaults to [].
            model_kwargs (dict, optional): keyword arguments to pass to AutoModelForCausalLM.from_pretrained. Defaults to {}.
            tokenizer_args (list, optional): arguments to pass to AutoTokenizer.from_pretrained. Defaults to [].
            tokenizer_kwargs (dict, optional): keyword arguments to pass to AutoTokenizer.from_pretrained. Defaults to {}.
            pipeline_args (list, optional): arguments to pass to pipeline. Defaults to [].
            pipeline_kwargs (dict, optional): keyword arguments to pass to pipeline. Defaults to {}.
        """        
        self.model_name = model_name
        self.max_new_tokens = max_new_tokens
        self.do_sample = do_sample
        self.num_beams = num_beams
        self.temperature = temperature
        self.top_p = top_p
        self.top_k = top_k
        self.repetition_penalty = repetition_penalty

        self.model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            torch_dtype="auto",
            device_map="auto",
            max_memory={0: "11GB", 1: "11GB", 2: "11GB", 3: "11GB"},
            *model_args,
            **model_kwargs
        )
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.model_name,
            *tokenizer_args,
            **tokenizer_kwargs
        )

        self.pipe = pipeline(
            "text-generation",
            model=self.model,
            tokenizer=self.tokenizer,
            max_new_tokens=self.max_new_tokens,
            do_sample=self.do_sample,
            num_beams=self.num_beams,
            temperature=self.temperature,
            top_p=self.top_p,
            top_k=self.top_k,
            repetition_penalty=self.repetition_penalty,
            *pipeline_args,
            **pipeline_kwargs
        )

    def chat_generate(self, messages: list[dict], *args, **kwargs) -> str:
        """
        Generate a response from a list of messages.

        Args:
            messages (list[dict]): A list of messages to generate the response with. Each entry is a dict, with keys "role" and "content". The first message should be the system message.
            An example of a message is: {"role": "system", "content": "You are a helpful coding chatbot. You will answer the user's questions to the best of your ability.", "role": "user", "content": "How do I install pytorch?"}

        Returns:
            str: Returns the cleaned string response from the model. The entire response object is stored in self.last_response.
        """        
        self.last_response = self.pipe(messages, *args, **kwargs)
        return self.last_response[0]['generated_text'][-1]['content'].replace("\\n", "\n")
    
    def generate(self, prompt: str, *args, **kwargs) -> str:
        """
        Generate a response from a single prompt. This is equivalent to calling generate with the prompt after system message specified in this function.

        Args:
            prompt (str): Prompt to pass as user content to the model

        Returns:
            str: Returns the cleaned string response from the model. The entire response object is stored in self.last_response.
        """        
        messages = [
                {
                    "role": "system", "content": "You are a helpful coding chatbot. You will answer the user's questions to the best of your ability.",
                    "role": "user", "content": prompt,
                },
        ]
        self.last_response = self.pipe(messages, *args, **kwargs)
        return self.last_response[0]['generated_text'][-1]['content'].replace("\\n", "\n")
    
    def write_to_file(self, filepath: str) -> None:
        """Write the text of the last response to a file.

        Args:
            filepath (str): The path to the file to write to.
        """ 
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
               
        with open(filepath, "w") as f:
            f.write(self.last_response[0]['generated_text'][-1]['content'].replace("\\n", "\n"))
