import Command from '@service/domain/commands/model/command';
import { CommandProcessingResponse, makeSingleTextProcessingResponse } from '@service/domain/commands/model/command-processing-response';
import CommandProcessor from '@service/domain/commands/model/command-processor';
import RegisterCommand from '@service/domain/commands/registry/register-command';
import XSoundsService from '@service/domain/x-sounds/x-sounds-service';
import { Service } from 'typedi';

@RegisterCommand
@Service()
class TagShowCommand extends CommandProcessor {
  constructor(private xSoundsService: XSoundsService) {
    super();
  }

  async execute(command: Command): Promise<CommandProcessingResponse> {
    const soundName = command.rawArgs.trim();
    if (!soundName) {
      throw new Error('Podaj nazwę dźwięku');
    }

    const tags = await this.xSoundsService.getSoundTags(soundName);

    if (tags.isEmpty()) {
      return makeSingleTextProcessingResponse(`Do dźwięku "${soundName}" nie ma przyspisanych żadnych tagów`);
    }

    const tagListText = tags
      .map((tagName) => `- ${tagName}`)
      .join('\n');

    return {
      messages: [
        { type: 'HEADER', text: `Tagi dla "${soundName}"` },
        { type: 'MARKDOWN', text: tagListText },
      ],
      isVisibleToIssuerOnly: false,
    };
  }

  get key(): string {
    return 'tag-show';
  }

  get shortKey(): (string | null) {
    return null;
  }

  get helpMessage(): string {
    return 'Wyświetla wszystkie tagi przypisane do dźwięku';
  }

  get helpUsages(): (string[] | null) {
    return [
      '<sound name>',
      'airhorn',
    ];
  }
}

export default TagShowCommand;