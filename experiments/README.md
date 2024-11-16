## File Structure:

```
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
                |_GPT-3_5-Turbo
                    |_GENERATED-function1_1.js
                    |_GENERATED-function1_2.js
                    |_GENERATED-function1_3.js
                |_GPT-4
                    |_GENERATED-function1_1.js
                    |_GENERATED-function1_2.js
                    |_GENERATED-function1_3.js
                |_DeepSeek-Coder-V2
                    |_GENERATED-function1_1.js
                    |_GENERATED-function1_2.js
                    |_GENERATED-function1_3.js
                |_CodeQwen1_5-7B-Chat
                    |_GENERATED-function1_1.js
                    |_GENERATED-function1_2.js
                    |_GENERATED-function1_3.js
                |_Artigenz-Coder-DS-6_7B
                    |_GENERATED-function1_1.js
                    |_GENERATED-function1_2.js
                    |_GENERATED-function1_3.js

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
    |_codebase-summarization-prompt-template
        |_type2.txt
    |_function-generation-prompt-template
        |_type1.txt
        |_type2.txt
        |_type3.txt
    |_function-description-prompt-template.txt

|_runner.ipynb
|_CodebleuCalculator.py
|_CreatePrompt.py
|_LLMInterface.py
|_Gemini.py
|_OpenAIModel.py
|_DeepSeek-Coder-V2.py
|_LoacalLLM.py
```
> **Note: Replace `Repo` with actual Repo name and `function1, 2, 3` with actual function name.**
