import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import { logger } from './logger'; // assuming this exists
import { CustomTag, TagName } from './types'; // assuming these exist
import { getStackJanitorStatus } from './utils'; // assuming this exists

export const index = async (event: CloudFormationEvent): Promise<any> => {
  try {
    let stackStatus: StackStatus | undefined;
    switch (event.detail?.eventName) {
      case Actions.CREATE:
        stackStatus = getStackJanitorStatus(
          convertTags(event.detail.requestParameters.tags)
        );
        break;
      case Actions.UPDATE:
        // Fall through to fetch stack tags
      case Actions.DELETE:
        const cfClient = new CloudFormationClient({ region: REGION });
        const command = new DescribeStacksCommand({
          StackName: event.detail.requestParameters.stackName,
        });
        const describeResponse = await cfClient.send(command);
        if (!describeResponse ||!describeResponse.Stacks[0]) {
          throw Error('Failed to retrieve stack');
        }
        stackStatus = getStackJanitorStatus(
          convertTags(describeResponse.Stacks[0].Tags?? [])
        );
        if (stackStatus === StackStatus.DISABLED && event.detail.eventName === Actions.UPDATE) {
          await handleDataItem(generateDeleteItem(event));
        }
        break;
      default:
        return { event, results: {} };
    }

    return {
      event,
      results: { stackjanitor: stackStatus },
    };
  } catch (err) {
    logger.error(err);
    return {
      event,
      results: { stackjanitor: StackStatus.DISABLED },
    };
  }
};