// Copyright (C) 2017-2022 BinaryMist Limited. All rights reserved.

// Use of this software is governed by the Business Source License
// included in the file /licenses/bsl.md

// As of the Change Date specified in that file, in accordance with
// the Business Source License, use of this software will be governed
// by the Apache License, Version 2.0

const redis = require('redis');

let log;
let client;
const baseChannel = 'tls';


const publish = (testSessionId, data, event = 'testerProgress') => {
  if (!testSessionId) log.warning(`There was no testSessionId supplied to the publish method of messagePublisher for the event: "${event}" with data: "${data}"`, { tags: ['messagePublisher'] });
  if (typeof event !== 'string') throw new Error('"event" must be a string');
  if (!event.startsWith('tester')) throw new Error('"event" must start with the text "tester"');

  const eventNoFirstWord = event.split('tester')[1];
  const eventProperty = `${eventNoFirstWord.charAt(0).toLowerCase()}${eventNoFirstWord.substring(1)}`;
  const message = JSON.stringify({ id: Date.now(), event, data: { [eventProperty]: data } });

  const channel = `${baseChannel}${testSessionId ? `-${testSessionId}` : ''}`;
  try {
    // log.debug(`Redis client publishing to the channel: "${channel}", message: ${message}`, { tags: ['messagePublisher'] });
    client.publish(channel, message);
  } catch (e) {
    log.warning(`The redis client failed to publish to the channel: "${channel}". The error was: ${e}`, { tags: ['messagePublisher'] });
    throw e;
  }
};


const pubLog = ({ testSessionId, logLevel, textData, tagObj, event }) => {
  publish(testSessionId, textData, event);
  log[logLevel](textData, tagObj);
};


const init = (options) => {
  if (!client) {
    ({ log } = options);
    client = redis.createClient(options.redis);
    client.on('error', (error) => { log.error(`An error event was received from the redis client: "${error.message}".`, { tags: ['messagePublisher'] }); });
    client.on('ready', () => { log.info(`A connection is established to the redis client at "${client.address}".`, { tags: [`pid-${process.pid}`, 'messagePublisher'] }); });
    log.info(`Attempting to establish a connection with redis at "${options.redis.host}:${options.redis.port}".`, { tags: [`pid-${process.pid}`, 'messagePublisher'] });
  }
  return { publish, pubLog };
};


module.exports = {
  init,
  publish,
  pubLog
};
