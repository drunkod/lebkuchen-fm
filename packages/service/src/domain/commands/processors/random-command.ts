import Command from '@service/domain/commands/model/command';
import { CommandProcessingResponse } from '@service/domain/commands/model/command-processing-response';
import CommandProcessor from '@service/domain/commands/model/command-processor';
import RegisterCommand from '@service/domain/commands/registry/register-command';
import Song from '@service/domain/songs/song';
import SongsService from '@service/domain/songs/songs-service';
import { AddSongsToQueueEvent } from '@service/event-stream/model/events';
import PlayerEventStream from '@service/event-stream/player-event-stream';
import YouTubeDataClient from '@service/youtube/youtube-data-client';
import { Service } from 'typedi';

const MAX_TITLES_IN_MESSAGE = 10;
const MAX_SONGS_IN_YOUTUBE_REQUEST = 50;

@RegisterCommand
@Service()
class RandomCommand extends CommandProcessor {
  constructor(private songService: SongsService, private playerEventStream: PlayerEventStream, private youTubeDataClient: YouTubeDataClient) {
    super();
  }

  async execute(command: Command): Promise<CommandProcessingResponse> {
    const commandArgs = command.getArgsByDelimiter(' ');
    const { amount, keywords } = this.amountAndKeywordsFromArgs(commandArgs);

    if (amount < 1 || amount > MAX_SONGS_IN_YOUTUBE_REQUEST) {
      const message = 'Random obsługuje żądania od 1 do 50 utworów.';
      throw new Error(message);
    }

    const allSongs = await this.songService.getAll();
    const songContainsEverySearchedWord = (song: Song): boolean => keywords.every((word) => song.name?.toLowerCase().includes(word.toLowerCase()));
    const songsFollowingCriteria = allSongs.filter(songContainsEverySearchedWord).randomShuffle();

    if (songsFollowingCriteria.isEmpty()) {
      const message = 'Nie znaleziono utworów spełniających kryteria.';
      throw new Error(message);
    }

    const availableSongs = await this.filterEmbeddableSongs(songsFollowingCriteria.slice(0, MAX_SONGS_IN_YOUTUBE_REQUEST));
    const songsToQueue = availableSongs.slice(0, amount);

    const eventData: AddSongsToQueueEvent = { id: 'AddSongsToQueueEvent', songs: songsToQueue };
    this.playerEventStream.sendToEveryone(eventData);

    songsToQueue.forEach((song) => {
      this.songService.incrementPlayCount(song.youtubeId, song.name);
    });
    const text = this.buildMessage(songsToQueue, amount);

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

  private async filterEmbeddableSongs(songs: Song[]): Promise<Song[]> {
    const youtubeIds = songs.map((song) => song.youtubeId);
    const statuses = await this.youTubeDataClient.fetchVideosStatuses(youtubeIds);
    const idToEmbeddable: Map<string, boolean> = new Map(statuses.items.map((status) => [status.id, status.status.embeddable]));

    return songs.filter((song) => idToEmbeddable.get(song.youtubeId));
  }

  private buildMessage(songsToQueue: Song[], requestedNumber: number): string {
    const titleMessages = songsToQueue
      .map((s) => s.name)
      .slice(0, MAX_TITLES_IN_MESSAGE)
      .map((title) => `- _${title}_`);

    const reachedRequestedNumber = requestedNumber === songsToQueue.length;

    const text = [
      `Dodano ${songsToQueue.length}${reachedRequestedNumber ? '' : ` (z ${requestedNumber} żądanych)`} do kojeki:`,
      ...titleMessages,
      ((songsToQueue.length > MAX_TITLES_IN_MESSAGE) ? '...i inne' : ''),
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
    return 'Losuje utwory z historii. Parametry są opcjonalne. Może zwrócić mniej klipów niż żadano.';
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
