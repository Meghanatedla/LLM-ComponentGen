const { generateDeleteItem, handleDataItem } = require('dynamo-util-methods'); // Assuming the existence of a dynamo-util-methods package

async function index(event: CloudFormationEvent): Promise<{ event: CloudFormationEvent, results: { stackjanitor: StackStatus } }> {
  try {
    // Extract tags from the event and determine stack status
    const stackTags = event.detail.requestParameters.tags || [];
    const stackjanitorStatus = getStackJanitorStatus(stackTags);

    // Log the determined status
    logger.info('Determined stackjanitor status:', stackjanitorStatus);

    // Update DynamoDB if the stack status is 'Disabled' for 'Update' events
    if (event.eventName === 'UpdateStack' && stackjanitorStatus === StackStatus.Disabled) {
      const deleteItemParams = generateDeleteItem(stackjanitorTableName, stackjanitorRecordKey);
      await handleDataItem(deleteItemParams);
    }

    // Return the stack status along with the original event
    return {
      event,
      results: { stackjanitor: stackjanitorStatus },
    };
  } catch (error) {
    // Log any errors and return a default status and original event
    logger.error('An error occurred while processing the event:', error);
    return {
      event,
      results: { stackjanitor: StackStatus.Disabled },
    };
  }
}

// Other utility functions and constants are used within the index function