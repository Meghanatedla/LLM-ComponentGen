import { CloudFormationEvent, JanitorRecord, StackStatus } from './types';
import { getStackJanitorStatus, TagName } from './utils';

export async function index(event: CloudFormationEvent): Promise<{ event: CloudFormationEvent; results: { stackjanitor: StackStatus } }> {
  // Common function for AWS Lambda to determine stackjanitor status based on CloudFormation events
  let stackjanitorStatus: StackStatus = 'Disabled'; // Default status

  try {
    // Determine status based on event type and stack tags
    if (event.eventName === 'Create') {
      const tags = event.detail.requestParameters.tags;
      stackjanitorStatus = getStackJanitorStatus(tags);
    } else {
      // Retrieve tags for the stack associated with the event
      const stackName = event.detail.requestParameters.stackName;
      const { stacks } = await cloudformation.describeStacks({ StackName: stackName });
      const tags = getTagsFromStacks(stacks); // Function to parse stack tags
      stackjanitorStatus = getStackJanitorStatus(tags);
    }

    // Optionally handle Update event for removing stackjanitor entry if disabled
    if (event.eventName === 'Update' && stackjanitorStatus === 'Disabled') {
      const janitorRecord: JanitorRecord = {
        id: stackName, // Assuming stackName is a unique identifier
        stackjanitor: 'Disabled',
        // Additional properties based on JanitorRecord structure
      };
      await handleDataItem(janitorRecord, Entity, Actions.DELETE); // Assuming Entity and Actions are defined elsewhere
    }
  } catch (error) {
    logger.error(`Error determining stackjanitor status for ${event.detail.requestParameters.stackName}: ${error}`);
    // Handle errors and provide a fallback default status
  }

  return {
    event,
    results: {
      stackjanitor: stackjanitorStatus,
    },
  };
}