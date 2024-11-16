from codebleu import calc_codebleu # type: ignore

def read_file(file_path):
    try:
        with open(f"{file_path}", "r") as f:
            return f.read()
    except FileNotFoundError:
        print(f"WARNING: The file {file_path} does not exist!")
        exit()

def codebleu_score_calculator(original_function_file_path: str, generated_function_file_path: str, language: str):

    original_function = read_file(original_function_file_path)
    generated_function = read_file(generated_function_file_path)

    result = calc_codebleu([original_function], [generated_function], lang=language, weights=(0.25, 0.25, 0.25, 0.25))

    return result

def avg_codebleu_score_calculator(codebeu_scores: list):

    average_result = {key: 0 for key in codebeu_scores[0]}

    for score in codebeu_scores:
        for key in score:
            average_result[key] += score[key]
        
    for key in average_result:
        average_result[key] /= len(codebeu_scores)

    return average_result