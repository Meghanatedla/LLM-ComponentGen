import os

class CreatePrompt():
    def __init__(self):
        """
        Initialize the createPrompt class.
        """
        pass

    def create_summary_prompt(codebase_summary_prompt_template: str, files_to_summarize_paths: str, language: str, codebase_summary_prompt_save_path: str) -> str:
        """
        Create a prompt for summarization based on the given context files.

        Args:
            codebase_summary_prompt_template (str): The path to the template file for codebase summarization.
            files_to_summarize_paths (str): The path to the file containing the paths of the files to summarize.
            language (str): The language of the codebase.
            codebase_summary_prompt_save_path (str): The path to save the generated prompt.

        Returns:
            str: The generated summarization prompt.
        """

        with open(codebase_summary_prompt_template, 'r') as f:
            summarization_prompt = f.read()

        with open(files_to_summarize_paths, 'r') as f:
            context_files = f.read().splitlines()

        for file in context_files:
            with open(file, "r") as f:
                summarization_prompt += f"\n\n{file}\n```{language}\n{f.read()}\n```"
        
        os.makedirs(os.path.dirname(codebase_summary_prompt_save_path), exist_ok=True)

        with open(codebase_summary_prompt_save_path, 'w') as f:
            f.write(summarization_prompt)
            
        return summarization_prompt

    def create_func_description_prompt(function_description_prompt_template: str, chosen_function_path: str, language: str, function_description_prompt_save_path: str) -> str:
        """
        Create a prompt for function description based on the given function file.

        Args:
            function_description_prompt_template (str): The path to the template file for function description.
            chosen_function_path (str): The path to the chosen function file.
            language (str): The language of the function.
            function_description_prompt_save_path (str): The path to save the generated prompt.

        Returns:
            str: The generated function description prompt.
        """
        
        with open(function_description_prompt_template, 'r') as f:
            func_description_prompt = f.read()

        with open(chosen_function_path, "r") as f:
            func_description_prompt += f"\n\n{chosen_function_path}\n```{language}\n{f.read()}\n```"

        os.makedirs(os.path.dirname(function_description_prompt_save_path), exist_ok=True)

        with open(function_description_prompt_save_path, 'w') as f:
            f.write(func_description_prompt)

        return func_description_prompt
    
    def create_func_generation_prompt_type1(function_generation_prompt_template_type1: str, codebase_readme_path: str, function_description_save_path: str, function_generation_prompt_type1_save_path: str) -> str:
        """
        Create a prompt for function generation based on the codebase README and function description.

        Args:
            function_generation_prompt_template_type1 (str): The path to the template file for function generation.
            codebase_readme_path (str): The path to the codebase README file.
            function_description_save_path (str): The path to the function description file.
            function_generation_prompt_type1_save_path (str): The path to save the generated prompt.

        Returns:
            str: The generated function generation prompt.
        """

        with open(function_generation_prompt_template_type1, 'r') as f:
            function_generation_prompt = f.read()

        with open(codebase_readme_path, 'r') as f:
            codebase_readme = f.read()

        with open(function_description_save_path, 'r') as f:
            function_description = f.read()

        function_generation_prompt = function_generation_prompt.replace('{codebase_readme}', codebase_readme).replace('{function_description}', function_description)

        os.makedirs(os.path.dirname(function_generation_prompt_type1_save_path), exist_ok=True)

        with open(function_generation_prompt_type1_save_path, 'w') as f:
            f.write(function_generation_prompt)

        return function_generation_prompt
    
    def create_func_generation_prompt_type2(func_generation_prompt_template_file_type2: str, codebase_summary_file_path: str, func_description_file_path: str, function_generation_prompt_type2_save_path: str) -> str:
        """
        Create a prompt for function generation based on the codebase summary and function description.

        Args:
            func_generation_prompt_template_file_type2 (str): The path to the template file for function generation.
            codebase_summary_file_path (str): The path to the codebase summary file.
            func_description_file_path (str): The path to the function description file.
            function_generation_prompt_type2_save_path (str): The path to save the generated prompt.

        Returns:
            str: The generated function generation prompt.
        """
        
        with open(func_generation_prompt_template_file_type2, 'r') as f:
            function_generation_prompt = f.read()

        with open(codebase_summary_file_path, 'r') as f:
            codebase_summary = f.read()

        with open(func_description_file_path, 'r') as f:
            function_description = f.read()

        function_generation_prompt = function_generation_prompt.replace('{codebase_summary}', codebase_summary).replace('{function_description}', function_description)

        os.makedirs(os.path.dirname(function_generation_prompt_type2_save_path), exist_ok=True)

        with open(function_generation_prompt_type2_save_path, 'w') as f:
            f.write(function_generation_prompt)

        return function_generation_prompt
    
    def create_func_generation_prompt_type3(function_generation_prompt_template_type3: str, codebase_summary_save_path: str, example_functions: list, function_description_save_path: str, function_generation_prompt_type3_save_path: str) -> str:
        """
        Create a prompt for function generation based on the codebase summary, example functions and function description.

        Args:
            function_generation_prompt_template_type3 (str): The path to the template file for function generation.
            codebase_summary_save_path (str): The path to the codebase summary file.
            example_functions (list): List of example functions to include in the prompt.
            function_description_save_path (str): The path to the function description file.
            function_generation_prompt_type3_save_path (str): The path to save the generated prompt.

        Returns:
            str: The generated function generation prompt.
        """
    
        with open(function_generation_prompt_template_type3, 'r') as f:
            function_generation_prompt = f.read()

        with open(codebase_summary_save_path, 'r') as f:
            codebase_summary = f.read()

        with open(function_description_save_path, 'r') as f:
            function_description = f.read()

        for i, example_function in enumerate(example_functions):
            with open(example_function[0], 'r') as f:
                function_generation_prompt = function_generation_prompt.replace(f'{{example_function_description_{i+1}}}', f.read())
            with open(example_function[1], 'r') as f:
                function_generation_prompt = function_generation_prompt.replace(f'{{example_function_code_{i+1}}}', f.read())

        function_generation_prompt = function_generation_prompt.replace('{codebase_summary}', codebase_summary).replace('{function_description}', function_description)

        os.makedirs(os.path.dirname(function_generation_prompt_type3_save_path), exist_ok=True)

        with open(function_generation_prompt_type3_save_path, 'w') as f:
            f.write(function_generation_prompt)

        return function_generation_prompt