import Command from '@service/domain/commands/model/command';
import { CommandProcessingResponse } from '@service/domain/commands/model/command-processing-response';
import CommandProcessor from '@service/domain/commands/model/command-processor';
import RegisterCommand from '@service/domain/commands/registry/register-command';
import Song from '@service/domain/songs/song';
import SongsService from '@service/domain/songs/songs-service';
import { AddSongsToQueueEvent } from '@service/event-stream/model/events';
import PlayerEventStream from '@service/event-stream/player-event-stream';
import { Service } from 'typedi';

const MAX_TITLES_IN_MESSAGE = 10;

@RegisterCommand
@Service()
class RandomCommand extends CommandProcessor {
  constructor(private songService: SongsService, private playerEventStream: PlayerEventStream) {
    super();
  }

  async execute(command: Command): Promise<CommandProcessingResponse> {
    const commandArgs = command.getArgsByDelimiter(' ');
    const { amount, keywords } = this.amountAndKeywordsFromArgs(commandArgs);

    const allSongs = await this.songService.getAll();
    const songContainsEverySearchedWord = (song: Song): boolean => keywords.every((word) => song.name?.toLowerCase().includes(word.toLowerCase()));
    const songsFollowingCriteria = allSongs.filter(songContainsEverySearchedWord).randomShuffle();
    const maxAllowedValue = songsFollowingCriteria.length;

    if (amount < 1 || amount > maxAllowedValue) {
      const message = `Liczba utworów spełniających kryteria (${maxAllowedValue}) jest niezgodna z oczekiwaniami. Zmień kryteria lub ilość żądanych utworów.`;
      throw new Error(message);
    }

    const availableSongs = await this.songService.filterEmbeddableSongs(songsFollowingCriteria);
    const songsToQueue = availableSongs.randomShuffle().slice(0, Math.min(availableSongs.length, amount));

    const eventData: AddSongsToQueueEvent = { id: 'AddSongsToQueueEvent', songs: songsToQueue };
    this.playerEventStream.sendToEveryone(eventData);

    songsToQueue.forEach((song) => {
      this.songService.incrementPlayCount(song.youtubeId, song.name);
    });
    const text = this.buildMessage(songsToQueue);

    return {
      messages: [{
        text,
        type: 'MARKDOWN',
      }],
      isVisibleToIssuerOnly: false,
    };
  }

  private amountAndKeywordsFromArgs(args: string[]): {amount: number, keywords: string[]} {
    const amountArgument = Number.parseInt(String(args[0]), 10);
    const argsCopy = Array.from(args);
    let amount = 1;
    if (Number.isInteger(amountArgument)) {
      argsCopy.shift();
      amount = amountArgument;
    }
    return { amount, keywords: argsCopy };
  }

  private buildMessage(songsToQueue: Song[]): string {
    const titleMessages = songsToQueue
      .map((s) => s.name)
      .slice(0, MAX_TITLES_IN_MESSAGE)
      .map((title) => `- _${title}_`);

    const text = [
      'Dodano do kojeki:',
      ...titleMessages,
      ((songsToQueue.length > MAX_TITLES_IN_MESSAGE) ? `...i ${songsToQueue.length - MAX_TITLES_IN_MESSAGE} więcej` : ''),
    ].filter(Boolean).join('\n');
    return text;
  }

  get key(): string {
    return 'random';
  }

  get shortKey(): (string | null) {
    return null;
  }

  get helpMessage(): string {
    return 'Losuje utwory z historii. Parametry są opcjonalne.';
  }

  get helpUsages(): (string[] | null) {
    return [
      '<amount> <phrase>',
      '3',
      'britney',
      '3 britney',
      '',
    ];
  }
}

export default RandomCommand;
