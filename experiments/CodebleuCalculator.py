from codebleu import calc_codebleu # type: ignore

def read_file(file_path):
    """
    Read the file given the path

    Args:
        file_path: Path to the file

    Returns:
        str: The content of the file
    """

    try:
        with open(f"{file_path}", "r") as f:
            return f.read()
    except FileNotFoundError:
        print(f"WARNING: The file {file_path} does not exist!")
        exit()

def codebleu_score_calculator(original_function_file_path: str, generated_function_file_path: str, language: str):
    """
    Calculate the CodeBLEU score for generated function wrt the original function

    Args:
        original_function_file_path: Path to the original function
        generated_function_file_path: Path to the generated function
    
    Returns:
        dict: The CodeBLEU scores
    """

    original_function = read_file(original_function_file_path)
    generated_function = read_file(generated_function_file_path)

    result = calc_codebleu([original_function], [generated_function], lang=language, weights=(0.25, 0.25, 0.25, 0.25))

    return result

def avg_codebleu_score_calculator(codebeu_scores: list):
    """
    Get the avg. CodeBLEu scores given a dictionary of scores

    Args:
        codebeu_scores: List of dictionaries containing the CodeBLEU scores

    Returns:
        dict: The average CodeBLEU scores
    """

    average_result = {key: 0 for key in codebeu_scores[0]}

    for score in codebeu_scores:
        for key in score:
            average_result[key] += score[key]
        
    for key in average_result:
        average_result[key] /= len(codebeu_scores)

    return average_result