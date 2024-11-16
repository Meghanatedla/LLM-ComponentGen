import { CloudFormation } from 'aws-sdk';
const cloudformation = new CloudFormation();

// Assuming we have a helper function to filter stacks
function filterStacksByCriteria() {}

export const searchDeleteCloudformationStack = async () => {
   try {
      // Get all stacks
      let result = await cloudformation.describeStacks().promise();
      
      // Filter stacks based on criteria
      let filteredStacks = filterStacksByCriteria(result);
      
      // Iterate over the stacks and delete each one
      for(let i = 0; i < filteredStacks.length; i++){
         await cloudformation.deleteStack({StackName: filteredStacks[i].StackName}).promise();
         
         console.log('Deleted stack: ', filteredStacks[i].StackName);
      }
   } catch (error) {
      console.error("Error occurred: ", error);
   }
};