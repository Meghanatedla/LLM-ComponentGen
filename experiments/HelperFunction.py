import json

def validate_config(config: dict):
    """
    Validate the config file for the experiment

    Args:
        config (dict): The experiment config
    """
    required_keys = [
    "language", "summarize_codebase", "codebase_readme_path", "files_to_summarize_paths", "codebase_summary_prompt_template", "codebase_summary_prompt_save_path", "codebase_summary_save_path", "function_description_prompt_template", "function_description_prompt_save_path", "function_description_save_path",  "function_generation_prompt_template_type1", "function_generation_prompt_type1_save_path", "function_generation_prompt_template_type2", "function_generation_prompt_type2_save_path", "function_generation_prompt_template_type3", "function_generation_prompt_type3_save_path", "chosen_function_path", "chosen_function", "original_function_save_path", "example_function_description1", "example_function_code1", "example_function_description2", "example_function_code2", "generated_function_type1_save_dir", "generated_function_type2_save_dir", "generated_function_type3_save_dir", "run_codebleu", "codebleu_type1_save_dir", "codebleu_type2_save_dir", "codebleu_type3_save_dir"     
    ]
    
    for key in required_keys:
        if key not in config:
            raise ValueError(f"Missing required key: {key}")

def read_config_files_index(file_index_path: str):
    """
    Read the config files index

    Args:
        file_index_path (str): The path to the file index

    Returns:
        list: List of config files
    """
    with open(file_index_path, 'r') as f:
        remaining_confs_paths = f.read().splitlines()

    remaining_confs = []
    for cf_path in remaining_confs_paths:
        conf = json.load(open(cf_path))
        try:
            validate_config(conf)
            remaining_confs.append(conf)
        except Exception as e:
            print(f"Error in {cf_path}: {e}")
    
    return remaining_confs

def load_func_generation_prompts(config):
    """
    Load the function generation prompts

    Args:
        config (dict): The experiment config

    Returns:
        tuple: The function generation prompts
    """
    with open(config['function_generation_prompt_type1_save_path'], 'r') as f:
        function_generation_prompt_type1 = f.read()
    
    with open(config['function_generation_prompt_type2_save_path'], 'r') as f:
        function_generation_prompt_type2 = f.read()

    function_generation_prompt_type3 = ""
    if config["function_generation_prompt_type3_save_path"] != "":
        with open(config['function_generation_prompt_type3_save_path'], 'r') as f:
            function_generation_prompt_type3 = f.read()

    return function_generation_prompt_type1, function_generation_prompt_type2, function_generation_prompt_type3


def get_function_paths(config:dict, model_name: str, prompt_type: str, generation_num: int=1):
    """Get the path to original code and generated code for a specific model and prompt type.

    Args:
        config (dict): The experiment config 
        model_name (str): name of model, one of ["GPT-3_5-Turbo", "GPT-4", "DeepSeek-Coder-V2", "CodeQwen1_5-7B-Chat", "Artigenz-Coder-DS-6_7B"]
        prompt_type (str): prompt type, one of ["type1", "type2", "type3"]
        generation_num (int): This is the generation_num th generated function. Defaults to 1.
    """
    generated_function_save_dirs = {
        "type1": config['generated_function_type1_save_dir'],
        "type2": config['generated_function_type2_save_dir'],
        "type3": config['generated_function_type3_save_dir']
    }

    filename = config['chosen_function'].split(".")
    generated_function_save_filename = f"{filename[0]}_{generation_num}.{filename[1]}"
    generated_function_save_path = f"{generated_function_save_dirs[prompt_type]}/{model_name}/GENERATED-{generated_function_save_filename}"
    original_function_save_path = config['original_function_save_path']

    return {"original": original_function_save_path, "generated": generated_function_save_path}

def get_name(config):
    """
    Get the name of the function from the path
    
    Args:
        config (dict): The experiment config
    """
    repo, func = config['original_function_save_path'].split('/')[:-1]
    return repo, func[-1]
