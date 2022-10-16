import { Song } from '@service/domain/songs/song';
import { Service } from 'typedi';
import { HistoryRepository } from '@service/domain/history/history-repository';
import { HistoryEntry } from '@service/domain/history/history-entry';
import { User } from '@service/domain/users/user';
import { HistorySummary, SongPopularity } from '@service/domain/history/history-summary';
import { SongsService } from '@service/domain/songs/songs-service';
import { notNull } from '@service/utils/utils';

@Service()
class HistoryService {
  constructor(private repository: HistoryRepository, private songsService: SongsService) { }

  async getAll(): Promise<HistoryEntry[]> {
    return this.repository.findAllOrderByDateDesc();
  }

  async markAsPlayed(song: Song, user: User): Promise<void> {
    const entry: HistoryEntry = {
      date: new Date(),
      youtubeId: song.youtubeId,
      user: user.data.name,
    };

    this.repository.insert(entry);
  }

  async generateSummary(): Promise<HistorySummary> {
    const history = await this.repository.findAllOrderByDateDesc();

    const songIdToPlayCount: Map<string, number> = history
      .map((e) => e.youtubeId)
      .countOccurrences();

    const mostPopularSongs: SongPopularity[] = (await this.songsService.getSongsByYoutubeIds([...songIdToPlayCount.keys()]))
      .filter(notNull)
      .map((song) => ({ song, playCount: (songIdToPlayCount.get(song.youtubeId) || 0) }))
      .sort((a, b) => (b.playCount - a.playCount));

    return {
      mostPopularSongs,
    };
  }
}

export { HistoryService };
