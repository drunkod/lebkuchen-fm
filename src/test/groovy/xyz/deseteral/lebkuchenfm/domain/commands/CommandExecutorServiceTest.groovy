package xyz.deseteral.lebkuchenfm.domain.commands

import spock.lang.Shared
import spock.lang.Specification
import spock.lang.Unroll
import xyz.deseteral.lebkuchenfm.domain.commands.model.Command
import xyz.deseteral.lebkuchenfm.domain.commands.model.CommandProcessingResponse
import xyz.deseteral.lebkuchenfm.domain.commands.model.SingleMessageResponse
import xyz.deseteral.lebkuchenfm.domain.commands.parser.TextCommandParser
import xyz.deseteral.lebkuchenfm.domain.commands.parser.TextIsNotACommandException

@Unroll
class CommandExecutorServiceTest extends Specification {
    @Shared
    def testCommand = new TestCommand()
    @Shared
    def testCommandWithArgs = new TestCommandWithArgs()
    @Shared
    def commandExecutor = new CommandExecutorService([testCommand, testCommandWithArgs], new TextCommandParser("/fm"))

    def 'should resolve #title'() {
        when:
        def processingResponse = commandExecutor.process(new Command(key, rawArgs))

        then:
        processingResponse.getMessages()*.text == [response]

        where:
        title                             | key            | rawArgs     || response
        'command'                         | 'test'         | ''          || 'TestCommand'
        'command with short key'          | 't'            | ''          || 'TestCommand'
        'command with args'               | 'testWithArgs' | 'some args' || 'TestCommandWithArgs [some,args]'
        'command with short key and args' | 'twa'          | 'some args' || 'TestCommandWithArgs [some,args]'
    }

    def 'should handle not existing command'() {
        when:
        commandExecutor.process(new Command('notExisting', ''))

        then:
        NoSuchCommandProcessorException ex = thrown()
        ex.message == "Command 'notExisting' does not exist"
    }

    def 'should resolve #title from text'() {
        when:
        def processingResponse = commandExecutor.processFromText(text)

        then:
        processingResponse.getMessages()*.text == [response]

        where:
        title                             | text                         || response
        'command'                         | '/fm test'                   || 'TestCommand'
        'command with short key'          | '/fm t'                      || 'TestCommand'
        'command with args'               | '/fm testWithArgs some args' || 'TestCommandWithArgs [some,args]'
        'command with short key and args' | '/fm twa some args'          || 'TestCommandWithArgs [some,args]'
    }

    def 'should accept configured prompt'() {
        when:
        def commandExecutor = new CommandExecutorService([testCommand, testCommandWithArgs], new TextCommandParser("/other"))
        def processingResponse = commandExecutor.processFromText(text)

        then:
        processingResponse.getMessages()*.text == [response]

        where:
        title                             | text                            || response
        'command'                         | '/other test'                   || 'TestCommand'
        'command with short key'          | '/other t'                      || 'TestCommand'
        'command with args'               | '/other testWithArgs some args' || 'TestCommandWithArgs [some,args]'
        'command with short key and args' | '/other twa some args'          || 'TestCommandWithArgs [some,args]'
    }

    def 'should handle text not being a command'() {
        when:
        commandExecutor.processFromText('some text that is not a command')

        then:
        TextIsNotACommandException ex = thrown()
        ex.message == "Text 'some text that is not a command' is not a command"
    }
}

class TestCommand implements CommandProcessor {
    @Override
    CommandProcessingResponse process(Command command) {
        return new SingleMessageResponse('TestCommand')
    }

    @Override
    String getKey() {
        return 'test'
    }

    @Override
    String getShortKey() {
        return 't'
    }

    @Override
    String getHelpMessage() {
        return 'this is a test command'
    }
}

class TestCommandWithArgs implements CommandProcessor {
    @Override
    CommandProcessingResponse process(Command command) {
        return new SingleMessageResponse("TestCommandWithArgs [${command.getArgsByDelimiter(' ').join(',')}]")
    }

    @Override
    String getKey() {
        return 'testWithArgs'
    }

    @Override
    String getShortKey() {
        return 'twa'
    }

    @Override
    String getHelpMessage() {
        return 'this is a test command with args'
    }
}