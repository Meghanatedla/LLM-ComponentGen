import os
from pathlib import Path
import json
import shutil

from CodebleuCalculator import codebleu_score_calculator, avg_codebleu_score_calculator

def validate_config(config: dict):
    required_keys = [
    "language", "summarize_codebase", "codebase_readme_path", "files_to_summarize_paths", "codebase_summary_prompt_template", "codebase_summary_prompt_save_path", "codebase_summary_save_path", "function_description_prompt_template", "function_description_prompt_save_path", "function_description_save_path",  "function_generation_prompt_template_type1", "function_generation_prompt_type1_save_path", "function_generation_prompt_template_type2", "function_generation_prompt_type2_save_path", "function_generation_prompt_template_type3", "function_generation_prompt_type3_save_path", "chosen_function_path", "chosen_function", "original_function_save_path", "example_function_description1", "example_function_code1", "example_function_description2", "example_function_code2", "generated_function_type1_save_dir", "generated_function_type2_save_dir", "generated_function_type3_save_dir", "run_codebleu", "codebleu_type1_save_dir", "codebleu_type2_save_dir", "codebleu_type3_save_dir"     
    ]
    
    for key in required_keys:
        if key not in config:
            raise ValueError(f"Missing required key: {key}")


with open('remaining_confs.txt', 'r') as f:
    remaining_confs_paths = f.read().splitlines()

remaining_confs = []
for cf_path in remaining_confs_paths:
    conf = json.load(open(cf_path))
    try:
        validate_config(conf)
        remaining_confs.append(conf)
    except Exception as e:
        print(f"Error in {cf_path}: {e}")

for idx, config in enumerate(remaining_confs):

    print(f"\nRunning config: {idx}")

    generated_function_save_dirs = {
        "type1": config['generated_function_type1_save_dir'],
        "type2": config['generated_function_type2_save_dir'],
        "type3": config['generated_function_type3_save_dir']
    }

    model_names = ["GPT-3_5-Turbo", "GPT-4", "DeepSeek-Coder-V2", "CodeQwen1_5-7B-Chat", "Artigenz-Coder-DS-6_7B"]
    prompt_types = ["type1", "type2", "type3"]

    generated_function_save_paths = {t: {m: [] for m in model_names} for t in prompt_types}


    generated_function_save_dirs = {
        "type1": config['generated_function_type1_save_dir'],
        "type2": config['generated_function_type2_save_dir'],
        "type3": config['generated_function_type3_save_dir']
    }

    generation_count = 1

    for prompt_type in ["type1", "type2", "type3"]:

        if prompt_type == "type3" and config["generated_function_type3_save_dir"] == "":
            print("Skipping function generation prompt type 3")
            continue
        

        for model_name in model_names:

            for i in range(1, generation_count + 1):

                filename = config["chosen_function"].split(".")
                generated_function_save_filename = f"{filename[0]}_{i}.{filename[1]}"
                generated_function_save_path = f"{generated_function_save_dirs[prompt_type]}/{model_name}/GENERATED-{generated_function_save_filename}"
                
                generated_function_save_paths[prompt_type][model_name].append(generated_function_save_path)

    print(generated_function_save_paths)

    codebleu_save_dirs = {
        "type1": config['codebleu_type1_save_dir'],
        "type2": config['codebleu_type2_save_dir'],
        "type3": config['codebleu_type3_save_dir']
    }

    languages = {
        "JS": "javascript",
        "python": "python",
        "TS": "javascript"
    }

    if config['run_codebleu']:

        for prompt_type in prompt_types:

            print(f"-----------------{prompt_type}------------------")

            if prompt_type == "type3" and config["codebleu_type3_save_dir"] == "":
                print("Skipping codebleu for prompt type 3")
                continue

            print(f"Running codebleu for prompt {prompt_type}")
            for model_name , generated_function_paths in generated_function_save_paths[prompt_type].items():
                
                codebleu_scores = []
                for i, generated_function_path in enumerate(generated_function_paths):
                    
                    codebleu_score = codebleu_score_calculator(
                        config['original_function_save_path'],
                        generated_function_path,
                        languages[config['language']]
                    )
                    codebleu_scores.append(codebleu_score)

                avg_codebleu_score = avg_codebleu_score_calculator(codebleu_scores)
                print(f"Calculated codebleu score for {model_name}\n")

                # codebleu_save_path = f"{codebleu_save_dirs[prompt_type]}/{model_name}.txt"

                # os.makedirs(os.path.dirname(codebleu_save_path), exist_ok=True) 
                # with open(codebleu_save_path, 'w') as f:
                #     f.write(f"CodeBLEU Result:\n{avg_codebleu_score}\n")



# import os
# import json
# import pandas as pd

# from CodebleuCalculator import codebleu_score_calculator

# def validate_config(config: dict):
#     required_keys = [
#     "language", "summarize_codebase", "codebase_readme_path", "files_to_summarize_paths", "codebase_summary_prompt_template", "codebase_summary_prompt_save_path", "codebase_summary_save_path", "function_description_prompt_template", "function_description_prompt_save_path", "function_description_save_path",  "function_generation_prompt_template_type1", "function_generation_prompt_type1_save_path", "function_generation_prompt_template_type2", "function_generation_prompt_type2_save_path", "function_generation_prompt_template_type3", "function_generation_prompt_type3_save_path", "chosen_function_path", "chosen_function", "original_function_save_path", "example_function_description1", "example_function_code1", "example_function_description2", "example_function_code2", "generated_function_type1_save_dir", "generated_function_type2_save_dir", "generated_function_type3_save_dir", "run_codebleu", "codebleu_type1_save_dir", "codebleu_type2_save_dir", "codebleu_type3_save_dir"     
#     ]
    
#     for key in required_keys:
#         if key not in config:
#             raise ValueError(f"Missing required key: {key}")


# def read_config_files_index(file_index_path: str):
#     with open(file_index_path, 'r') as f:
#         remaining_confs_paths = f.read().splitlines()

#     remaining_confs = []
#     for cf_path in remaining_confs_paths:
#         conf = json.load(open(cf_path))
#         try:
#             validate_config(conf)
#             remaining_confs.append(conf)
#         except Exception as e:
#             print(f"Error in {cf_path}: {e}")
    
#     return remaining_confs

# def get_function_paths(config:dict, model_name: str, prompt_type: str, generation_num: int=1):
#     """Get the path to original code and generated code for a specific model and prompt type.

#     Args:
#         config (dict): The experiment config 
#         model_name (str): name of model, one of ["GPT-3_5-Turbo", "GPT-4", "DeepSeek-Coder-V2", "CodeQwen1_5-7B-Chat", "Artigenz-Coder-DS-6_7B"]
#         prompt_type (str): prompt type, one of ["type1", "type2", "type3"]
#         generation_num (int): This is the generation_num th generated function. Defaults to 1.
#     """
#     generated_function_save_dirs = {
#         "type1": config['generated_function_type1_save_dir'],
#         "type2": config['generated_function_type2_save_dir'],
#         "type3": config['generated_function_type3_save_dir']
#     }

#     filename = config['chosen_function'].split(".")
#     generated_function_save_filename = f"{filename[0]}_{generation_num}.{filename[1]}"
#     generated_function_save_path = f"{generated_function_save_dirs[prompt_type]}/{model_name}/GENERATED-{generated_function_save_filename}"
#     original_function_save_path = config['original_function_save_path']

#     return {"original": original_function_save_path, "generated": generated_function_save_path}

# def get_name(config):
#     repo, func = config['original_function_save_path'].split('/')[:-1]
#     return repo, func[-1]

# configs = read_config_files_index("remaining_confs.txt")
# print(f"read {len(configs)} config files")

# model_names = [
#     "GPT-3_5-Turbo", 
#     "GPT-4", 
#     "DeepSeek-Coder-V2", 
#     "CodeQwen1_5-7B-Chat", 
#     "Artigenz-Coder-DS-6_7B"
# ]
# type_names = ["type1", "type2", "type3"]
# languages = {
#     "JS": "javascript",
#     "python": "python",
#     "TS": "javascript"
# }

# codebleu_scores = []

# for conf in configs:
#     for model_name in model_names:
#         for prompt_type in type_names:
#             if prompt_type == "type3" and conf["generated_function_type3_save_dir"] == "":
#                 # skip type3 prompt because it doesnt exist
#                 continue

#             paths = get_function_paths(conf, model_name, prompt_type)
#             original_path, generated_path = paths['original'], paths['generated']
#             repo, func_num = get_name(conf)

#             codebleu_score = codebleu_score_calculator(
#                         original_path,
#                         generated_path,
#                         languages[conf['language']]
#                     )
            
#             codebleu_scores.append([repo, func_num, prompt_type, model_name, codebleu_score['codebleu']])

# codebleu_scores_df = pd.DataFrame(codebleu_scores, columns=["Repo", "FunctionNumber", "PromptType", "Model", "CodeBLEU"])

# codebleu_scores_df.head()

# codebleu_scores_df.to_csv("codebleu_scores.csv", index=False)