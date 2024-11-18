from pygount import SourceAnalysis
import json
from dotenv import load_dotenv
from complexipy import file_complexity
from tqdm.notebook import tqdm
from radon.complexity import cc_visit
import subprocess
import re
import radon
import radon.metrics


def get_loc(filepath: str):
    """
    Get the lines of code for a given file
    
    Args:
        filepath (str): The path to the file 

    Returns:
        int: The number of lines of code   
    """
    analysis = SourceAnalysis.from_file(filepath, "pygount")
    return analysis.code


def get_cog_complexity_py(filepath: str):
    """
    Get the cognitive complexity for a given python file
    
    Args:
        filepath (str): The path to the file

    Returns:
        int: The cognitive complexity of the file
    """
    fc = file_complexity(filepath)
    return fc.complexity


def get_cog_complexity_js(js_file):
    """ 
    Get the cognitive complexity of a js file
    
    Args:
        js_file (str): The path to the js file
        
    Returns:
        int: The cognitive complexity of the file
    """
    try:
        result = subprocess.run(
            ['npx', 'ccts-json', js_file],
            capture_output=True, check=True
        )
        text = result.stdout.decode('utf-8').strip()
        cleaned_text = re.sub(r'\x1b\[[0-9;]*m', '', text)
        json_res = json.loads(cleaned_text)

        cog_complexity = next(iter(json_res.values()))['score'] # get the score from the first value in the json
        return cog_complexity

    except subprocess.CalledProcessError as e:
        print(f"Error running js cyclomatic complexity calculator: {e}")
        return None


def get_cc_py(python_file_path: str):
    """
    Get the cyclomatic complexity for a given python file

    Args:
        python_file_path (str): The path to the python file

    Returns:
        int: The cyclomatic complexity of the file
    """
    with open(python_file_path, 'r') as f:
        code = f.read()

    complexity_list = cc_visit(code)
    cc = sum(comp.complexity for comp in complexity_list)
    return cc


def get_cc_js(js_file):
    """
    Get the cyclomatic complexity of a js file

    Args:
        js_file (str): The path to the js file

    Returns:
        int: The cyclomatic complexity of the file
    """
    try:
        result = subprocess.run(
            ['node', 'js_code_metrics.js', js_file],
            capture_output=True, check=True
        )
        text = result.stdout.decode('utf-8').strip()
        cleaned_text = re.sub(r'\x1b\[[0-9;]*m', '', text)
        complexity = int(cleaned_text.split()[-1])
        return complexity

    except subprocess.CalledProcessError as e:
        print(f"Error running js cyclomatic complexity calculator: {e}")
        return None


def get_halstead_py(filepath: str):
    """
    Get the Halstead volume for a given python file

    Args:
        filepath (str): The path to the python file

    Returns:
        int: The Halstead volume of the file
    """
    with open(filepath, 'r') as f:
        code = f.read()

    halstead_res = radon.metrics.h_visit(code)
    return halstead_res.total.volume


def get_halstead_js(js_file):
    """
    Get the Halstead volume of a js file

    Args:
        js_file (str): The path to the js file

    Returns:
        int: The Halstead volume of the file
    """
    try:
        result = subprocess.run(
            ['node', 'js_halstead.js', js_file],
            capture_output=True, check=True
        )
        text = result.stdout.decode('utf-8').strip()
        cleaned_text = re.sub(r'\x1b\[[0-9;]*m', '', text)
        halstead = float(cleaned_text.split()[-1])
        return halstead

    except subprocess.CalledProcessError as e:
        print(f"Error running js cyclomatic complexity calculator: {e}")
        return None
