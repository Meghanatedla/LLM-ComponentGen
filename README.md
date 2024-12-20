# LLMs for Generation of Architectural Components: An Exploratory Empirical Study in the Serverless World

This repository contains the experiments for our submission to ICSA25. 

This project explores the capabilities of Large Language Models (LLMs) to generate architectural components, focusing on Functions as a Service (FaaS), commonly known as serverless functions. While most code generation efforts are limited to code snippets, our work takes a step further by aiming to generate complete architectural components. This approach could revolutionize software development by enabling a direct transition from design decisions to deployment, bypassing traditional development phases.

## Study Design 
<div align="center">
    <img src="images/WorkFlow Daigram.png" alt="Sample Image">
</div>

### Selected Models for Code Generation  

| **Model Name**           | **Number of Parameters** | **Context Window Size (in tokens)** | **Availability** | **License Type** |
|---------------------------|--------------------------|-------------------------------------|------------------|------------------|
| Artigenz-Coder-DS-6.7B   | 6.7B                    | 16,384                              | Local/API        | Open             |
| CodeQwen1.5-7B-Chat      | 7B                      | 64K                                 | Local/API        | Open             |
| DeepSeek-V2.5            | 236B                    | 128K                                | Local/API        | Open             |
| GPT-3.5-Turbo            | Unknown                 | 4,096                               | API              | Proprietary      |
| GPT-4                    | Unknown                 | 8,192                               | API              | Proprietary      |


### Selected Repositories  

| **Repository Name** | **Language**  | **Stars** | **Forks** | **No. of Functions** |
|----------------------|---------------|-----------|-----------|-----------------------|
| codebox-npm          | Javascript    | 352       | 27        | 10                    |
| laconia              | Javascript    | 326       | 30        | 15                    |
| TagBot               | Python        | 91        | 18        | 2                     |
| StackJanitor         | Typescript    | 37        | 2         | 5                     |


## File Structure

```
|_experiments
    |_Repo1
        |_function1
            |_codebleu-results
                |_type1
                    |_GPT-3_5-Turbo.txt
                    |_GPT-4.txt
                    |_DeepSeek-Coder-V2.txt
                    |_CodeQwen1_5-7B-Chat.txt
                    |_Artigenz-Coder-DS-6_7B.txt
                |_type2
                
                |_type3
                    
            |_GENERATED
                |_type1
                    |_Artigenz-Coder-DS-6_7B
                        |_GENERATED-function1_1.js
                    |_CodeQwen1_5-7B-Chat
                        |_GENERATED-function1_1.js
                    |_DeepSeek-Coder-V2
                        |_GENERATED-function1_1.js
                    |_GPT-3_5-Turbo
                        |_GENERATED-function1_1.js
                    |_GPT-4
                        |_GENERATED-function1_1.js

                |_type2

                |_type3
                    
            |_prompts
                |_function-generation-prompt
                    |_type1.txt
                    |_type2.txt
                    |_type3.txt
                |_codebase-summarization-prompt.txt
                |_function-description-prompt.txt

            |_codebase-summary.txt
            |_config.json
            |_context-files-paths.txt
            |_function-description.txt
            |_ORIGINAL-function1.js

        |_function2
        
        |_function3

        |_README.md

    |_Repo2
    |_Repo3
    |_Repo4  

    |_prompt-templates
        |_function-generation-prompt-template
            |_type1.txt
            |_type2.txt
            |_type3.txt
        |_codebase-summarization-prompt-template
        |_function-description-prompt-template.txt

    |_csvs
        |_code quality metrics
        |_consistency
    |_plots
    |_test-results

    |_runner.ipynb
    |_code_metrics.ipynb
    |_codebleu_scores.ipynb
    |_consistency_check.ipynb
    |_visulaization.ipynb
    |_CodebleuCalculator.py
    |_CodeMetricCalculator.py
    |_HelperFunction.py
    |_CreatePrompt.py
    |_LLMInterface.py
    |_ArtigenzCoder.py
    |_Gemini.py
    |_CodeQwen.py
    |_DeepSeek-Coder-V2.py
    |_OpenAIModel.py
    |_LoacalLLM.py
    |_config_files.txt
    |_config_template.json
    |_package-lock.json
    |_package.json

|_repository-selection
    |_filter_dataset.ipynb
```

## Installation and Setup
To replicate this study, follow the steps below:

1. Clone the repository using the following command:
```bash
git clone <repository-url>
```

2. Install the python dependencies using the following command:
```bash
pip install -r requirements.txt
```

3. Install javascript/typescript dependencies using the following command:
```bash
npm install
```

4. Within `experiments` create a directory for the repository for which functions need to be generated.

5. Create a directory for each function within the repository directory.

6. Create a config file for the function. Follow the format in `config_template.json`.

7. Get all context files for the function and store the paths in `context-files-paths.txt`.

8. Use `runner.ipynb` to create the prompts and generate functions.

9. Use `code_metrics.ipynb` to calculate code metrics.

10. Use `codebleu_scores.ipynb` to calculate CodeBLEU scores.

## Results
1. The results for Functional correctness throuogh testing are available in the `test-results/Processed Test results.csv` directory.
<div align="center">
    <img src="images/Test Results.png" alt="Sample Image" width=900>
</div>

2. The results for code quality through code metrics are available in the `csvs/code quality metrics` directory.
<div align="center">
    <img src="experiments/plots/original_vs_generated_Code_Metrics.png" alt="Sample Image" width=1000>
</div>

3. The results for Code Similarity using CodeBLEU are available in the `csvs/code quality metrics/Codebleu.csv` directory.
<div align="center">
    <img src="experiments/plots/CodeBLEU Scores.png" alt="Sample Image" width=400>
</div>

---