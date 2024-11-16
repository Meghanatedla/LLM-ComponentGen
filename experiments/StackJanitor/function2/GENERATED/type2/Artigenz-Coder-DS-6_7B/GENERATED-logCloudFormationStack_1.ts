import { CloudFormationClient } from '@aws-sdk/client-cloudformation'; // AWS SDK
import { Tag } from '@aws-sdk/client-cloudformation/dist-types/models/models_0'; // AWS SDK
import { StackStatus } from './enums'; // Custom Enum
import { logger } from './logger'; // Logger
import { getTagsFromStacks, findTag, getStackJanitorStatus, convertTags, generateDeleteItem, handleDataItem } from './helperFunctions'; // Helper Functions

export async function index(event: CloudFormationEvent): Promise<{ event: CloudFormationEvent, results: { stackjanitor: StackStatus }}> {
    
    let stackjanitor = StackStatus.DISABLED;

    try {
        const cloudformationClient = new CloudFormationClient({});
        
        switch (event.eventName) {
            case 'Create':
                const stackName = event.detail?.requestParameters?.stackName;
                const createTags = event.detail?.requestParameters?.tags;
                
                stackjanitor = getStackJanitorStatus(createTags);
                break;
            
            case 'Update':
                const describeStacksInput = {
                    StackName: event.detail?.requestParameters?.stackName,
                };
                
                const describeStacksOutput = await cloudformationClient.send(new DescribeStacksCommand(describeStacksInput));
                
                const stackTags = getTagsFromStacks(describeStacksOutput.Stacks || []);
                
                stackjanitor = getStackJanitorStatus(stackTags);
                
                if (stackjanitor === StackStatus.DISABLED) {
                    const deleteItem = generateDeleteItem(event);
                    
                    await handleDataItem(deleteItem, Actions.DELETE); // Assuming handleDataItem method exists
                }
                
                break;
                
            // Handle other event names here...
        }
    } catch (e) {
        logger.error('Failed to retrieve stackjanitor status', e);
    }

    return { event, results: { stackjanitor }};
}