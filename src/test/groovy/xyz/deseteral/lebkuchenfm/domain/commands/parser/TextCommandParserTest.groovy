package xyz.deseteral.lebkuchenfm.domain.commands.parser

import spock.lang.Specification
import spock.lang.Unroll
import xyz.deseteral.lebkuchenfm.domain.commands.parser.TextCommandParser
import xyz.deseteral.lebkuchenfm.domain.commands.parser.TextIsNotACommandException

@Unroll
class TextCommandParserTest extends Specification {
    def 'should parse #title'() {
        given:
        def parser = new TextCommandParser('/fm')

        when:
        def command = parser.parse(text)

        then:
        command != null
        command.key == key
        command.rawArgs == rawArgs

        where:
        title                                | text                                  || key      | rawArgs
        'simple command'                     | '/fm skip'                            || 'skip'   | ''
        'command with single argument'       | '/fm queue youtube-id'                || 'queue'  | 'youtube-id'
        'command with many arguments'        | '/fm search some test phrase'         || 'search' | 'some test phrase'
        'command with additional whitespace' | ' /fm  search  some   test  phrase  ' || 'search' | ' some   test  phrase  '
        'command with pipe separated args'   | '/fm addx some name|example.com'      || 'addx'   | 'some name|example.com'
    }

    def 'should not parse #title'() {
        given:
        def parser = new TextCommandParser('/fm')

        when:
        parser.parse(text)

        then:
        TextIsNotACommandException ex = thrown()
        ex.message == message

        where:
        title                          | text             || message
        'prompt without key'           | '/fm'             | "Text '/fm' is not a command"
        'string that is not a command' | 'some test text' || "Text 'some test text' is not a command"
        'empty string'                 | ''               || "Text '' is not a command"
    }
}