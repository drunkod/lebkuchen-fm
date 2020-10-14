/* eslint-disable prefer-arrow-callback */
import express from 'express';
import Configuration from '../../application/configuration';
import * as CommandExecutorService from '../../domain/commands/command-executor-service';
import * as Logger from '../../infrastructure/logger';
import { makeSlackSimpleResponse, mapCommandProcessingResponseToSlackResponse } from './model/slack-response-dto';

const router = express.Router();

router.post('/', async function processSlackCommand(req, res) {
  const isValidChannelId = (req.body.channel_id === Configuration.SLACK_CHANNEL_ID);
  if (!isValidChannelId) {
    res.send(makeSlackSimpleResponse('Tej komendy można używać tylko na dedykowanym kanale', true));
    Logger.warn('Received Slack slash command with invalid channel ID', 'slack-command-controller');
    return;
  }

  const { command, text } = req.body;
  const messageContent = `${command} ${text}`;

  Logger.info(`Received ${messageContent} command from Slack`, 'slack-command-controller');

  const commandProcessingResponse = await CommandExecutorService.processFromText(messageContent);
  const response = mapCommandProcessingResponseToSlackResponse(commandProcessingResponse);
  res.send(response);
});

export default router;