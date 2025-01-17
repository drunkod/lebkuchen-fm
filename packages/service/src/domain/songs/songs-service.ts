import { Song } from '@service/domain/songs/song';
import { SongsRepository } from '@service/domain/songs/songs-repository';
import { YouTubeDataClient } from '@service/youtube/youtube-data-client';
import { Service } from 'typedi';
import { notNull } from '@service/utils/utils';
import { HistoryService } from '@service/domain/history/history-service';
import { User } from '@service/domain/users/user';

@Service()
class SongsService {
  constructor(private repository: SongsRepository, private historyService: HistoryService, private youTubeDataClient: YouTubeDataClient) { }

  async getByName(name: string): Promise<Song | null> {
    return this.repository.findByName(name);
  }

  async getAll(): Promise<Song[]> {
    return this.repository.findAllOrderedByTimesPlayedDesc();
  }

  async getWithHighestPlayCount(limit: number): Promise<Song[]> {
    return this.repository.findAllOrderedByTimesPlayedDesc(limit);
  }

  async createNewSong(
    youtubeId: string,
    songName: (string | null) = null,
    timesPlayed: number = 0,
    trimStartSeconds: (number | null) = null,
    trimEndSeconds: (number | null) = null,
  ): Promise<Song> {
    const name = songName || (await this.youTubeDataClient.fetchVideoTitleForId(youtubeId));

    const song: Song = {
      name,
      youtubeId,
      timesPlayed,
      trimStartSeconds,
      trimEndSeconds,
    };

    await this.repository.insert(song);
    return song;
  }

  async fetchAndStoreNewSongs(youtubeIds: string[]): Promise<Song[]> {
    const videoDetails = await this.youTubeDataClient.fetchVideosDetails(youtubeIds);

    const songs: Song[] = videoDetails.items.map((el) => ({
      youtubeId: el.id,
      name: el.snippet.title,
      timesPlayed: 0,
      trimStartSeconds: null,
      trimEndSeconds: null,
    }));

    if (songs.isEmpty()) {
      return [];
    }

    await this.repository.insertMany(songs);
    return songs;
  }

  async incrementPlayCount(youtubeId: string, songName: (string | null), user: User): Promise<void> {
    const foundSong = await this.repository.findByYoutubeId(youtubeId);

    if (foundSong) {
      const timesPlayed = (foundSong.timesPlayed + 1);
      await this.repository.replace({ ...foundSong, timesPlayed });

      await this.historyService.markAsPlayed(foundSong, user);
    } else {
      const newSong = await this.createNewSong(youtubeId, songName, 1);
      await this.historyService.markAsPlayed(newSong, user);
    }
  }

  async getSongByNameWithYouTubeIdFallback(songNameOrYouTubeId: string): Promise<Song> {
    const foundByNameSong = await this.repository.findByName(songNameOrYouTubeId);
    if (foundByNameSong) return foundByNameSong;

    const youTubeId = songNameOrYouTubeId.split(' ')[0].trim();
    const foundByIdSong = await this.repository.findByYoutubeId(youTubeId);
    if (foundByIdSong) return foundByIdSong;

    const song = await this.createNewSong(youTubeId);
    return song;
  }

  async getSongsByYoutubeIds(youTubeIds: string[]): Promise<Song[]> {
    return this.repository.findByYoutubeIds(youTubeIds);
  }

  private async getSongsByYoutubeIdsWithDataApiFallback(youTubeIds: string[]): Promise<Song[]> {
    const songsFromRepo: Song[] = await this.repository.findByYoutubeIds(youTubeIds);
    const youtubeIdsFromRepo = songsFromRepo.map((song) => song.youtubeId);
    const youtubeIdsToSongsFromRepo: Map<string, Song> = new Map(songsFromRepo.map((song) => [song.youtubeId, song]));

    const youtubeIdsToRetrieveFromApi = youTubeIds.filter((youTubeId) => !youtubeIdsFromRepo.includes(youTubeId));

    const songsFromApi = await this.fetchAndStoreNewSongs(youtubeIdsToRetrieveFromApi);
    const youtubeIdsToSongsFromApi: Map<string, Song> = new Map(songsFromApi.map((song) => [song.youtubeId, song]));

    const songs: Song[] = youTubeIds.map((youtubeId) => youtubeIdsToSongsFromRepo.get(youtubeId) || youtubeIdsToSongsFromApi.get(youtubeId) || null).filter(notNull);
    return this.filterEmbeddableSongs(songs);
  }

  async getSongsFromPlaylist(id: string): Promise<Song[]> {
    const videoIds = await this.youTubeDataClient.fetchYouTubeIdsForPlaylist(id);
    const songs: Promise<Song[]> = this.getSongsByYoutubeIdsWithDataApiFallback(videoIds);
    return songs;
  }

  async filterEmbeddableSongs(songs: Song[]): Promise<Song[]> {
    const youtubeIds = songs.map((song) => song.youtubeId);
    const statuses = await this.youTubeDataClient.fetchVideosStatuses(youtubeIds);
    const idToEmbeddable: Map<string, boolean> = new Map(statuses.items.map((status) => [status.id, status.status.embeddable]));

    return songs.filter((song) => idToEmbeddable.get(song.youtubeId));
  }
}

export { SongsService };
