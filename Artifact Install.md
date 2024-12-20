# Replication Package for: LLMs for Generation of Architectural Components: An Exploratory Empirical Study in the Serverless World

### Authors: Shrikara Arun*, Meghana Tedla*, Karthik Vaidhyanathan (* indicates equal contribution)

---

The experimental setup used consists of two steps - the repository selection phase (in `repository-selection`) which involves sorting based on GitHub stars, forks, archive status and quality and quantity of tests, and the experiment stage (in `experiments`) which involves function masking (see Section IV-C of the paper attached in this repository) and generation using the 5 chosen models for the 4 chosen repositories. 

> [!CAUTION]
> The replication of the generation process requires API keys (to use GPT-4, GPT-3.5-Turbo and DeepSeek-v2.5) and a machine with enough VRAM to run 7B models (CodeQwen-1.5-7B-Chat and Artigenz-Coder-DS-6.7B), which can either be a local machine or a hosted instance such as HuggingFace Spaces or a cloud VM on Azure/AWS/GCP. This is not free. 

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