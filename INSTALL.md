# Replication Package for: LLMs for Generation of Architectural Components: An Exploratory Empirical Study in the Serverless World

### Authors: Shrikara Arun*, Meghana Tedla*, Karthik Vaidhyanathan (* indicates equal contribution)

---

The experimental setup used consists of two steps - the repository selection phase (in `repository-selection`) which involves sorting based on GitHub stars, forks, archive status and quality and quantity of tests, and the experiment stage (in `experiments`) which involves function masking (see Section IV-C of the paper attached in this repository) and generation using the 5 chosen models for the 4 chosen repositories. 

> [!CAUTION]
> The replication of the generation process requires API keys (to use GPT-4, GPT-3.5-Turbo, Gemini-1.5-Pro and DeepSeek-v2.5) and a machine with enough VRAM to run 7B models (CodeQwen-1.5-7B-Chat and Artigenz-Coder-DS-6.7B), which can either be a local machine or a hosted instance such as HuggingFace Spaces or a cloud VM on Azure/AWS/GCP. This is not free. 

> [!CAUTION]
> Some dependencies do NOT work on Apple Silicon machines (M1/M2/M3/M4 Macs). It is recommended to use an AMD64 based Linux machine. Windows and Intel Mac compatibility is unknown, use either WSL (for Windows) or a Linux VM.


---

## Repository Selection Replication (Optional)

This step involves filtering repositories from the [Wonderless dataset](https://zenodo.org/records/4451387), to find repositories that contain tests (by matching the keyword 'test' to file and folder names), sort by stars and forks and download the repositories to a destination folder. The subsequent filtering was done based on manual evaluation of test quality of the sorted repositories. This process was not done for the [AWSomePy dataset](https://zenodo.org/records/7838077) since there were very few repositories with $\geq 30$ stars and a simple Excel sort was enough. Additionally, this step only provides the filtered list of repositories which *may* contain useful tests, which was later manually verified and sorted. The 4 chosen repositories are mentioned in the instructions for experiment replication below.
To run this step, 
1. Optionally create a virtual environment using `python -m venv .venv && source .venv/bin/activate`. Run `pip install -r requirements.txt` in the root directory of the repository to install dependencies
2. Download the [Wonderless dataset](https://zenodo.org/records/4451387) (including the repositories) and extract the repositories to a folder.
3. Modify the paths in `repository-selection/filter_dataset.ipynb` to point to the correct `src_dir` where the AWS repositories from the Wonderless dataset are downloaded, the `dst_dir` which is where the repositories which have tests will be stored. The following variables can be left to default unless you desire to change their save path: `input_csv = "Wonderless_Dataset.csv"` which is the csv corresponding to the URLs of repos in the dataset (already included in `repository-selection` but can also be downloaded along with the repositories), `output_csv = "Dataset_Filtered_by_Tests.csv"` which is a list of URLs of repos with tests as part of the name in either files or folders, `in_csv = "Dataset_Filtered_by_Tests.csv"` which is the input to the sorting based on GitHub stars and forks and `final_csv = "Final_Filtered_Dataset.csv"` which contains Name, GitHub URL,Stars,Forks for the sorted list. Run the entire notebook after modifying these paths. 
4. A manual evaluation of repositories was conducted to further filter repositories. The repositories with $\geq 30$ stars were evaluated based on statement coverage, number of tests and quality of tests, while ensuring language diversity between JS, TS and python.
5. The final list we selected is available at `repository-selection/Final List of Repositories.csv`

---

## Experimentation Replication

### General Setup (needed for all further steps)
1. You will need [python](https://www.python.org/downloads/) and [NodeJS](https://nodejs.org/en). See [Node Version Manager](https://github.com/nvm-sh/nvm) for an easy way to manage different NodeJS versions. 
2. Optionally create a virtual environment using `python -m venv .venv && source .venv/bin/activate`. Run `pip install -r requirements.txt` in the root directory of the repository to install needed python packages.
3. Install the node dependencies by running `npm install` in `experiments`.


The repositories chosen are mentioned in the table below. The functions we deal with are already included in the respective directories in `experiments`, but these will be needed to create the codebase summary. Download the following repositories if you wish to generate the serverless functions. Note that the repositories may have evolved since the time of conducting this experiment. Please look for commits around the end of October if you experience breaking changes.
| Repository Name | Language | Stars | Forks | Number of Functions | GitHub URL |
| --- | --- | --- | --- | --- | --- |
| codebox-npm | Javascript | 352 | 27 | 10 | https://github.com/craftship/codebox-npm |
| laconia | Javascript | 326 | 30 | 10 | https://github.com/laconiajs/laconia |
| TagBot | Python | 91 | 18 | 10 | https://github.com/JuliaRegistries/TagBot |
| StackJanitor | Typescript | 37 | 2 | 2 | https://github.com/lendi-au/StackJanitor |

4. Modify `config_files.txt` to contain the absolute paths to the config files for each experiment. See `experiments/config_template.json` for a template. An experiment is controlled by the parameters defined in its config file. Modify the paths or values in the config to modify the experiment. 
5. For every experiment you wish to run, change the paths in the config to the ones on your local machine. Set `chosen_function_path` to point to the serverless function which will be generated.
6. (Optional) To add a repository, follow the directory structure mentioned in the README for the new repo, ensuring that you have created a valid config file as well. Add the absolute path to this config file to `experiments/config_files.txt`


### Setting up models (if you wish to re-generate the serverless functions)
Create a `.env` file by cloning the `.env.example` file. Then, follow the steps below to setup each model:
1. **Gemini-1.5-Pro**: Register for an API key on [Google AI Studio](https://aistudio.google.com/app/apikey). Note that at the time of writing, Gemini-1.5-Pro has 2 free requests per minute. You do not need credit to conduct this experiment, but may get rate limited. If you do, you can either set up billing or space out using Gemini (which is used for generating codebase summary and function description). Place your API key in `.env` under `GEMINI_API_KEY`.
2. **GPT-4 and GPT-3.5-Turbo**: Register for an API key on the [OpenAI website](https://platform.openai.com/api-keys). Place your API key in `.env` under `OPENAI_API_KEY`.
3. **DeepSeek-V2.5**: Register for an API key on the [DeepSeek website](https://www.deepseek.com/). It is recommended to have at least USD 5 in credit to replicate the experiment. Add the created API key to `.env` under `DEEPSEEK_API_KEY`.
4. **CodeQwen1.5-7B-Chat and Artigenz-Coder-DS-6.7B**: 
To use as a HuggingFace Space, duplicate the following HuggingFace Spaces for [CodeQwen](https://huggingface.co/spaces/sudokara/CodeQwen1.5-7B-Chat) and [Artigenz Coder](https://huggingface.co/spaces/sudokara/Artigenz-Artigenz-Coder-DS-6.7B). Then, change line 10 in `CodeQwen.py` and `ArtigenzCoder.py` to point to the spaces you just created. Note that you will need a HuggingFace account with a valid billing method.
**Warning**: If you wish to use a different deployment method, visit the HuggingFace model pages for [CodeQwen](https://huggingface.co/Qwen/CodeQwen1.5-7B-Chat) and [Artigenz Coder](https://huggingface.co/Artigenz/Artigenz-Coder-DS-6.7B). You will need to modify `CodeQwen.py` and `ArtigenzCoder.py` files to use your deployed models. See `LocalLLM.py` for a reference implementation. If you use a local deployment, you will also need to install [PyTorch](https://pytorch.org/get-started/locally/) or similar for your platform.

### Running function generation
1. The notebook `runner.ipynb` contains the entire prompt generation + generation process. If you do not wish to generate functions, skip the appropriate cells and comment out the marked imports.
2. Read and validate the config files with the associated cells in the notebook.
3. Create the prompts using Gemini-1.5-Pro using the given cells
4. Initialize the generation models that you have available (defaults to all) in the notebook.
5. Run the function generation loop to generate the functions from the configs specified.
6. Clean the generated code to remove additional formatting that the LLM may have added, such as unnecessary text like "Sure, here is..." or triple backticks (\`\`\`).
7. Run the CodeBLEU calculator to find the semantic code similarity between the original and generated functions.

### Calculating code metrics
1. Ensure that `experiments/config_files.txt` contains the paths to the correct config files for the experiments you wish to evaluate and these config files themselves have correct paths within them. 
2. Run the `experiments/code_metrics.ipynb` notebook. You can choose which code metrics you want to calculate (out of lines of code, cyclomatic complexity, cognitive complexity, and Halstead's volume) by modifying the booleans `measure_{metricname}` in the notebook.
3. The results are saved to csvs in `csvs/code quality metrics`


### Running consistency checks
The consistency check in `experiments/consistency_check.ipynb` performs the following:
1. Randomly sample 5 (model, repo, function, prompt type) tuples such that at least one of each model, repo, prompt type are represented. This is done by the `constrained_sampling` function.
2. The config file for each tuple is read from the `experiments` folder. Change the `config_file_base_path` variable in the notebook to point to the correct place where you have placed the `experiments` folder.
3. For each function in the tuple, the function is generated thrice (**Warning**: This assumes that the prompts for generation, i.e. the function description and codebase summary, if the prompt is of type 3, has already been generated and saved in the path specified by the config. This involves running the prompt generation from `experiments/runner.ipynb`). The generated functions are stored in `experiments/consistency/{repo_name}/{function_num}/GENERATED/{prompt_type}/{model}/{GENERATED}-{function_name}_{index_num}`
4. Remove any additional text (such as "Sure, here is the function...") that may be generated in these functions before proceedings. 
5. CodeBLEU scores are then calculated (between the 1st-2nd, 2nd-3rd and 1st-3rd generated functions for each model), along with the average CodeBLEU score per model. A csv of the results is saved to `experiments/csvs/consistency/consistency_Codebleu.csv`. The plots in the paper are saved to `experiments/plots`
6. Difference in code metrics (lines of code, cyclomatic complexity, cognitive complexity, halstead's volume) between the multiple generated functions are also calculated. The average metric per model is also calculated for each metric. Again, the csv results are stored in the `experiments/csvs/consistency/` folder.

### Running tests (for original and generated serverless functions)
1. Follow instructions given in the original repository to run tests for the repository.
2. To use generated functions, replace the original chosen function with the *cleaned* generated function. Cleaning here refers to removing additional text or formatting in the LLM response. Note that generated functions we have included are already cleaned.
3. Our compiled results are available in `experiments/test-results`. Note that you may experience slight variation, due to evolution in the repository or environmental differences (such as packages, OS versions).