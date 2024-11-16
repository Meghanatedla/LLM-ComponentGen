const { handler } = require('./capture-card-payment'); // Import the handler function from the module

// Define a mock event object
const event = {
  paymentReference: '1234567890', // Replace with a real payment reference
};

// Mock the AWS SDK to simulate successful payment capture
const awsMock = jest.mock('aws-sdk');
awsMock.DynamoDB.DocumentClient.prototype.put = jest.fn().mockResolvedValue({});

// Call the handler with the mock event
handler(event);

// Check if the put method was called correctly
expect(awsMock.DynamoDB.DocumentClient.prototype.put).toHaveBeenCalledWith({
  TableName: 'Payments', // Assuming the table name is 'Payments'
  Item: {
    paymentId: '1234567890', // Assuming the payment ID is derived from the payment reference
    status: 'CAPTURED', // Assuming the status after capture is 'CAPTURED'
  },
});