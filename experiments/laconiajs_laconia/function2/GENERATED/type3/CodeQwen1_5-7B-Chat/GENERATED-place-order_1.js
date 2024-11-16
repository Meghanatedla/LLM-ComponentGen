// @ts-check
const laconia = require('@laconia/core');
const { spy } = require('@laconia/test');
const pino = require('pino');
const { ValidationError } = require('./ValidationError');

class PlaceOrder {
  constructor({
    orderRepository,
    orderStream,
    idGenerator,
    apiKey,
    restaurants,
    enabled,
  }) {
    this.logger = pino();
    this.orderRepository = orderRepository;
    this.orderStream = orderStream;
    this.idGenerator = idGenerator;
    this.apiKey = apiKey;
    this.restaurants = restaurants;
    this.enabled = enabled;
  }

  async execute(newOrder, headers) {
    try {
      await this.validateRequest(newOrder, headers);
      const orderId = this.generateOrderId();
      const completeOrder = this.constructCompleteOrder(newOrder, orderId);
      await this.persistOrder(completeOrder);
      await this.publishOrderPlacedEvent(orderId, newOrder.restaurantId);
      return { orderId };
    } catch (error) {
      this.logger.error(error, 'Failed to place order');
      throw error; // Propagate the error to be handled by API Gateway
    }
  }

  async validateRequest(newOrder, headers) {
    if (!this.enabled) {
      throw new Error('Order placement is disabled');
    }

    if (!headers['authorization'] || headers['authorization']!== this.apiKey) {
      throw new Error('Invalid API Key');
    }

    if (!this.restaurants.includes(newOrder.restaurantId)) {
      throw new Error('Invalid restaurant ID');
    }

    // Additional validation logic can be added here...
  }

  generateOrderId() {
    return this.idGenerator.generate();
  }

  constructCompleteOrder(newOrder, orderId) {
    return {
      orderId,
      items: newOrder.order.items,
      customerInfo: newOrder.order.customerInfo,
      restaurantId: newOrder.restaurantId,
      timestamp: Date.now(),
    };
  }

  async persistOrder(order) {
    await this.orderRepository.save(order);
  }

  async publishOrderPlacedEvent(orderId, restaurantId) {
    await this.orderStream.send({
      type: 'placed',
      orderId,
      restaurantId,
    });
  }
}

exports.app = async (event, context) => {
  const placeOrder = new PlaceOrder({
    orderRepository: context.injector.resolve('orderRepository'),
    orderStream: context.injector.resolve('orderStream'),
    idGenerator: context.injector.resolve('idGenerator'),
    apiKey: process.env.API_KEY,
    restaurants: process.env.VALID_RESTAURANTS.split(','),
    enabled: process.env.ENABLED === 'true',
  });

  return placeOrder.execute(event.body, event.headers);
};

exports.handler = laconia(spy(exports.app)).register(spy.instances());